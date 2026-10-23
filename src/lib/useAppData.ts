import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, EXAMPLE_OFFER } from '../defaults';
import type { HistoryEntry, Offer, Settings } from '../types';
import { applyOps, clearCache, diffHistory, fetchCloud, mergeHistories, pushRides, pushSettings, readCache, writeCache } from './cloud';
import { clearGuest, guestDataToImport, load, normalize, save, type Persisted } from './storage';
import { supabase } from './supabase';

/**
 * local     = modo convidado, salvo no aparelho
 * local-err = modo convidado, o navegador não deixou salvar
 * loading   = buscando a conta
 * synced    = tudo salvo na conta
 * saving    = enviando alterações
 * offline   = sem internet; alterações guardadas no aparelho para enviar depois
 * error     = o servidor recusou; tenta de novo na próxima alteração
 */
export type SyncStatus = 'local' | 'local-err' | 'loading' | 'synced' | 'saving' | 'offline' | 'error';

export interface ImportOffer {
  corridas: number;
  accept: () => void;
  dismiss: () => void;
}

type Updater<T> = T | ((prev: T) => T);

const DEBOUNCE_MS = 700;

function isNetworkError(e: unknown) {
  return navigator.onLine === false || /fetch|network|load failed/i.test(String((e as Error)?.message ?? e));
}

/** Estado do app. Sem `uid`: modo convidado. Com `uid`: conta na nuvem (troque a `key` do componente ao trocar de usuário). */
export function useAppData(uid: string | null) {
  const cloud = !!uid && !!supabase;
  const cache0 = useRef(cloud ? readCache(uid!) : null);
  const [data, setData] = useState<Persisted | null>(() => {
    if (!cloud) return load();
    return cache0.current ? normalize(cache0.current) : null;
  });
  const [status, setStatus] = useState<SyncStatus>(cloud ? 'loading' : 'local');
  /** null = sem erro; texto = motivo de não ter conseguido ler a conta */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [importOffer, setImportOffer] = useState<Persisted | null>(null);

  // Fila do que ainda não chegou ao servidor (sobrevive a fechar o app, via cópia local)
  const pendingUp = useRef(new Set(cache0.current?.pendingUpserts ?? []));
  const pendingDel = useRef(new Set(cache0.current?.pendingDeletes ?? []));
  const settingsVersion = useRef(cache0.current?.settingsDirty ? 1 : 0);
  const settingsSynced = useRef(0);
  const loaded = useRef(false); // já leu o servidor nesta sessão
  const prevHistory = useRef<HistoryEntry[]>(data?.history ?? []);
  const inFlight = useRef(false);
  const again = useRef(false);
  const latest = useRef(data);
  latest.current = data;

  /* ---------- Modo convidado ---------- */
  useEffect(() => {
    if (cloud || !data) return;
    setStatus(save(data) ? 'local' : 'local-err');
  }, [cloud, data]);

  /* ---------- Conta ---------- */
  const persistCache = useCallback(() => {
    const d = latest.current;
    if (!cloud || !d) return;
    writeCache(uid!, {
      ...d,
      pendingUpserts: [...pendingUp.current],
      pendingDeletes: [...pendingDel.current],
      settingsDirty: settingsVersion.current !== settingsSynced.current,
    });
  }, [cloud, uid]);

  const push = useCallback(async () => {
    const sb = supabase;
    const d = latest.current;
    if (!cloud || !sb || !d || !loaded.current) return;
    if (inFlight.current) {
      again.current = true;
      return;
    }
    const byId = new Map(d.history.map((e) => [e.id, e]));
    const upserts = [...pendingUp.current].map((id) => byId.get(id)).filter((e): e is HistoryEntry => !!e);
    const deletes = [...pendingDel.current];
    const ver = settingsVersion.current;
    const settingsDirty = ver !== settingsSynced.current;
    if (!settingsDirty && upserts.length === 0 && deletes.length === 0) {
      pendingUp.current.clear();
      setStatus('synced');
      return;
    }
    inFlight.current = true;
    setStatus('saving');
    try {
      if (settingsDirty) {
        await pushSettings(sb, uid!, d.settings, d.offer);
        settingsSynced.current = ver;
      }
      const recusadas = await pushRides(sb, uid!, { upserts, deletes });
      // Só tira da fila o que não mudou de novo enquanto enviava.
      // Corridas recusadas pelo banco também saem (repetir não adianta); ficam no aparelho até serem corrigidas.
      const now = new Map((latest.current?.history ?? []).map((e) => [e.id, e]));
      for (const e of upserts) if (now.get(e.id) === e) pendingUp.current.delete(e.id);
      for (const id of deletes) if (!now.has(id)) pendingDel.current.delete(id);
      if (recusadas.length) console.warn('Corridas recusadas pelo servidor', recusadas);
      setStatus(recusadas.length ? 'error' : 'synced');
    } catch (e) {
      setStatus(isNetworkError(e) ? 'offline' : 'error');
    } finally {
      inFlight.current = false;
      persistCache();
      if (again.current) {
        again.current = false;
        void push();
      }
    }
  }, [cloud, uid, persistCache]);

  // Lê a conta e aplica por cima o que ficou pendente no aparelho
  const loadCloud = useCallback(async () => {
    const sb = supabase;
    if (!cloud || !sb) return;
    setLoadError(null);
    try {
      const server = await fetchCloud(sb, uid!);
      const local = latest.current;
      const byId = new Map((local?.history ?? []).map((e) => [e.id, e]));
      const history = applyOps(server.history, {
        upserts: [...pendingUp.current].map((id) => byId.get(id)).filter((e): e is HistoryEntry => !!e),
        deletes: [...pendingDel.current],
      });
      const isNew = !server.settings;
      const keepLocal = local && settingsVersion.current !== settingsSynced.current;
      const next = normalize({
        settings: keepLocal ? local.settings : (server.settings ?? DEFAULT_SETTINGS),
        offer: keepLocal ? local.offer : (server.offer ?? EXAMPLE_OFFER),
        history,
      });
      if (isNew && !keepLocal) settingsVersion.current++; // grava os ajustes iniciais da conta
      prevHistory.current = next.history; // não conta o que veio do servidor como alteração
      loaded.current = true;
      setData(next);
      if (isNew && !cache0.current) setImportOffer(guestDataToImport());
    } catch (e) {
      if (latest.current) setStatus(isNetworkError(e) ? 'offline' : 'error');
      else {
        console.error('Erro ao carregar a conta', e);
        setLoadError(isNetworkError(e) ? 'Sem conexão com a internet.' : String((e as { message?: string })?.message ?? e));
      }
    }
  }, [cloud, uid]);

  useEffect(() => {
    void loadCloud();
  }, [loadCloud]);

  // Toda mudança no histórico entra na fila; depois de uma pausa, envia
  useEffect(() => {
    if (!cloud || !data) return;
    if (data.history !== prevHistory.current) {
      const ops = diffHistory(prevHistory.current, data.history);
      for (const e of ops.upserts) {
        pendingUp.current.add(e.id);
        pendingDel.current.delete(e.id);
      }
      for (const id of ops.deletes) {
        pendingDel.current.add(id);
        pendingUp.current.delete(id);
      }
      prevHistory.current = data.history;
    }
    persistCache();
    const t = setTimeout(() => void push(), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [cloud, data, push, persistCache]);

  // Voltou a internet: envia o pendente (ou lê a conta, se ainda não leu)
  useEffect(() => {
    if (!cloud) return;
    const on = () => void (loaded.current ? push() : loadCloud());
    window.addEventListener('online', on);
    return () => window.removeEventListener('online', on);
  }, [cloud, push, loadCloud]);

  /* ---------- Setters no mesmo formato do useState ---------- */
  const setSettings = useCallback((u: Updater<Settings>) => {
    settingsVersion.current++;
    setData((d) => (d ? { ...d, settings: typeof u === 'function' ? u(d.settings) : u } : d));
  }, []);
  const setOffer = useCallback((u: Updater<Offer>) => {
    settingsVersion.current++;
    setData((d) => (d ? { ...d, offer: typeof u === 'function' ? u(d.offer) : u } : d));
  }, []);
  const setHistory = useCallback((u: Updater<HistoryEntry[]>) => {
    setData((d) => (d ? { ...d, history: typeof u === 'function' ? u(d.history) : u } : d));
  }, []);

  const offerImport: ImportOffer | null = importOffer
    ? {
        corridas: importOffer.history.length,
        accept: () => {
          settingsVersion.current++;
          setData((d) =>
            d ? { ...d, settings: importOffer.settings, offer: importOffer.offer, history: mergeHistories(d.history, importOffer.history) } : d,
          );
          clearGuest();
          setImportOffer(null);
        },
        dismiss: () => setImportOffer(null),
      }
    : null;

  return {
    data,
    status,
    loadError,
    retryLoad: loadCloud,
    importOffer: offerImport,
    setSettings,
    setOffer,
    setHistory,
    /** Há algo que ainda não chegou ao servidor? */
    hasPending: () => pendingUp.current.size > 0 || pendingDel.current.size > 0 || settingsVersion.current !== settingsSynced.current,
    /** Apaga a cópia local da conta (ao sair). */
    forgetDevice: () => {
      if (uid) clearCache(uid);
    },
  };
}
