import { unzipSync } from 'fflate';
import { useEffect, useMemo, useState } from 'react';
import { brl, hm, num } from '../lib/format';
import {
  corridasDeRascunhos,
  detectar,
  faltaNoRascunho,
  montar,
  parseCsv,
  rascunhosDePrints,
  type LinhaPrint,
  type Mapeamento,
  type Planilha,
  type Rascunho,
  type UnidadeDist,
  type UnidadeTempo,
} from '../lib/importer';
import { DIAS_HISTORICO_GRATIS, usePlan } from '../lib/plan';
import { useAuth } from '../auth/AuthProvider';
import { prepararImagem } from '../lib/imagem';
import { supabase } from '../lib/supabase';
import { platforms } from '../lib/platforms';
import type { HistoryEntry, Settings } from '../types';
import { Btn, Card, Segmented } from './ui';
import { ProTag } from './Pro';

const MAX_ARQUIVO = 30 * 1024 * 1024; // 30 MB
const MAX_DESCOMPACTADO = 20 * 1024 * 1024; // por arquivo dentro do .zip (proteção contra "zip bomba")

interface Arquivo {
  nome: string;
  planilha: Planilha;
}

/** Texto de um CSV: UTF-8; se vier cheio de caracteres quebrados, tenta o padrão do Excel em português (Windows-1252). */
function decodificar(bytes: Uint8Array): string {
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  const quebrados = (utf8.match(/�/g) ?? []).length;
  return quebrados > 3 ? new TextDecoder('windows-1252').decode(bytes) : utf8;
}

export async function lerArquivo(f: File): Promise<Arquivo[]> {
  if (f.size > MAX_ARQUIVO) throw new Error('Arquivo grande demais (máximo 30 MB).');
  const bytes = new Uint8Array(await f.arrayBuffer());
  if (/\.zip$/i.test(f.name) || (bytes[0] === 0x50 && bytes[1] === 0x4b)) {
    const dentro = unzipSync(bytes, { filter: (x) => /\.(csv|txt)$/i.test(x.name) && !x.name.startsWith('__MACOSX') && x.originalSize <= MAX_DESCOMPACTADO });
    const lista = Object.entries(dentro).map(([nome, b]) => ({ nome: nome.split('/').pop() ?? nome, planilha: parseCsv(decodificar(b)) }));
    if (!lista.length) throw new Error('Não encontrei nenhuma planilha (.csv) dentro do .zip.');
    return lista.filter((a) => a.planilha.linhas.length > 0);
  }
  return [{ nome: f.name, planilha: parseCsv(decodificar(bytes)) }];
}

/** Escolhe, entre os arquivos do .zip, o que mais parece um histórico de corridas. */
export function melhorArquivo(lista: Arquivo[]): number {
  let melhor = 0;
  let pontos = -1;
  lista.forEach((a, i) => {
    const m = detectar(a.planilha.cabecalho, a.planilha.linhas.slice(0, 20));
    const p = [m.data, m.valor, m.km, m.duracao].filter((x) => x !== null).length * 1000 + Math.min(999, a.planilha.linhas.length);
    if (p > pontos) {
      pontos = p;
      melhor = i;
    }
  });
  return melhor;
}

const CAMPOS: { id: keyof Omit<Mapeamento, 'tempo' | 'dist'>; nome: string; obrigatorio: boolean }[] = [
  { id: 'data', nome: 'Data', obrigatorio: true },
  { id: 'valor', nome: 'Valor recebido', obrigatorio: true },
  { id: 'km', nome: 'Distância', obrigatorio: true },
  { id: 'duracao', nome: 'Duração', obrigatorio: true },
  { id: 'fim', nome: 'Hora de término (se não houver duração)', obrigatorio: false },
  { id: 'status', nome: 'Status (para pular canceladas)', obrigatorio: false },
];

function PlanilhaImport({ s, plataforma, existentes, onImport }: { s: Settings; plataforma: string; existentes: Set<string>; onImport: (e: HistoryEntry[]) => void }) {
  const { plan } = usePlan();
  const [arquivos, setArquivos] = useState<Arquivo[] | null>(null);
  const [escolhido, setEscolhido] = useState(0);
  const [mapa, setMapa] = useState<Mapeamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);

  const atual = arquivos?.[escolhido] ?? null;
  const resultado = useMemo(
    () => (atual && mapa ? montar(atual.planilha, mapa, s, { plataforma, existentes }) : null),
    [atual, mapa, s, plataforma, existentes],
  );
  // Duração pode vir da coluna de duração OU da hora de término (fim − início)
  const faltando = mapa ? CAMPOS.filter((c) => c.obrigatorio && mapa[c.id] === null && !(c.id === 'duracao' && mapa.fim !== null)) : [];

  async function abrir(f: File | undefined) {
    if (!f) return;
    setErro(null);
    setLendo(true);
    try {
      const lista = await lerArquivo(f);
      if (!lista.length || !lista.some((a) => a.planilha.cabecalho.length > 1)) throw new Error('Não consegui ler a planilha. Salve como CSV e tente de novo.');
      const i = melhorArquivo(lista);
      setArquivos(lista);
      setEscolhido(i);
      setMapa(detectar(lista[i].planilha.cabecalho, lista[i].planilha.linhas.slice(0, 50)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui abrir o arquivo.');
      setArquivos(null);
      setMapa(null);
    } finally {
      setLendo(false);
    }
  }

  function trocarArquivo(i: number) {
    if (!arquivos) return;
    setEscolhido(i);
    setMapa(detectar(arquivos[i].planilha.cabecalho, arquivos[i].planilha.linhas.slice(0, 50)));
  }

  function importar() {
    if (!resultado?.validas.length) return;
    onImport(resultado.validas);
    setArquivos(null);
    setMapa(null);
  }

  const antigas = resultado ? resultado.validas.filter((e) => Date.now() - new Date(e.data).getTime() > DIAS_HISTORICO_GRATIS * 86400000).length : 0;

  return (
    <>
      {!arquivos ? (
        <div className="grid gap-3 text-sm">
          <label className="cursor-pointer rounded-lg border-2 border-dashed border-line px-4 py-6 text-center font-semibold hover:bg-sunk">
            {lendo ? 'Lendo o arquivo…' : 'Escolher arquivo (.csv ou .zip)'}
            <input
              type="file"
              accept=".csv,.zip,.txt,text/csv,application/zip"
              className="hidden"
              onChange={(e) => {
                void abrir(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          {erro && (
            <p role="alert" className="rounded-md bg-bad-soft px-3 py-2 text-bad">
              {erro}
            </p>
          )}
        </div>
      ) : (
        atual &&
        mapa && (
          <div className="grid gap-4 text-sm">
            {arquivos.length > 1 && (
              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-muted">Planilha dentro do .zip</span>
                <select value={escolhido} onChange={(e) => trocarArquivo(Number(e.target.value))} className="rounded-md border border-line bg-surface px-3 py-2">
                  {arquivos.map((a, i) => (
                    <option key={a.nome + i} value={i}>
                      {a.nome} ({a.planilha.linhas.length} linhas)
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div>
              <h3 className="mb-1 font-semibold">Colunas</h3>
              <p className="mb-2 text-xs text-muted">Reconhecidas automaticamente. Corrija se alguma estiver errada.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {CAMPOS.map((c) => (
                  <label key={c.id} className="flex flex-col gap-1">
                    <span className={`text-[13px] font-medium ${c.obrigatorio && mapa[c.id] === null ? 'text-bad' : 'text-muted'}`}>{c.nome}</span>
                    <select
                      value={mapa[c.id] ?? ''}
                      onChange={(e) => setMapa({ ...mapa, [c.id]: e.target.value === '' ? null : Number(e.target.value) })}
                      className="rounded-md border border-line bg-surface px-3 py-2"
                    >
                      <option value="">{c.obrigatorio ? 'Escolha a coluna' : 'Não tem'}</option>
                      {atual.planilha.cabecalho.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Coluna ${i + 1}`} {atual.planilha.linhas[0]?.[i] ? `· ex.: ${atual.planilha.linhas[0][i].slice(0, 24)}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-medium text-muted">Distância em</span>
                  <Segmented<UnidadeDist>
                    label="Unidade da distância"
                    value={mapa.dist}
                    onChange={(dist) => setMapa({ ...mapa, dist })}
                    options={[
                      { value: 'km', label: 'km' },
                      { value: 'mi', label: 'milhas' },
                      { value: 'm', label: 'metros' },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-medium text-muted">Duração em</span>
                  <Segmented<UnidadeTempo>
                    label="Unidade da duração"
                    value={mapa.tempo}
                    onChange={(tempo) => setMapa({ ...mapa, tempo })}
                    options={[
                      { value: 'auto', label: 'automático' },
                      { value: 'min', label: 'min' },
                      { value: 'seg', label: 'seg' },
                      { value: 'h', label: 'horas' },
                    ]}
                  />
                </div>
              </div>
            </div>

            {faltando.length > 0 ? (
              <p className="rounded-md bg-warn-soft px-3 py-2">
                Falta escolher: {faltando.map((c) => c.nome).join(', ')}. Sem esses dados não dá para calcular o lucro de cada corrida.
              </p>
            ) : (
              resultado && (
                <div>
                  <h3 className="mb-1 font-semibold">Prévia</h3>
                  <ul className="mb-2 text-sm">
                    <li>
                      ✅ <strong>{resultado.validas.length}</strong> corridas para importar
                    </li>
                    {resultado.repetidas > 0 && <li>↩️ {resultado.repetidas} já estavam no histórico (não serão repetidas)</li>}
                    {resultado.canceladas > 0 && <li>🚫 {resultado.canceladas} canceladas (ignoradas)</li>}
                    {resultado.invalidas.length > 0 && (
                      <li>
                        ⚠️ {resultado.invalidas.length} linhas ignoradas: {resumo(resultado.invalidas.map((x) => x.motivo))}
                      </li>
                    )}
                  </ul>
                  {resultado.validas.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="tnum w-full text-xs">
                        <thead>
                          <tr className="border-b border-line text-left text-muted">
                            <th className="py-1 pr-2">Data</th>
                            <th className="py-1 pr-2 text-right">Valor</th>
                            <th className="py-1 pr-2 text-right">Km</th>
                            <th className="py-1 pr-2 text-right">Tempo</th>
                            <th className="py-1 text-right">Lucro</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultado.validas.slice(0, 5).map((e) => (
                            <tr key={e.id} className="border-b border-line/60">
                              <td className="py-1 pr-2">{new Date(e.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="py-1 pr-2 text-right">{brl(e.valor)}</td>
                              <td className="py-1 pr-2 text-right">{num(e.km, 1)}</td>
                              <td className="py-1 pr-2 text-right">{hm(e.minutos)}</td>
                              <td className={`py-1 text-right font-semibold ${e.lucro >= 0 ? 'text-good' : 'text-bad'}`}>{brl(e.lucro)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {!plan.pro && antigas > 0 && (
                    <p className="mt-2 text-xs text-muted">
                      {antigas} dessas corridas têm mais de {DIAS_HISTORICO_GRATIS} dias: ficam guardadas e aparecem quando você assinar o Pro.
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted">
                    O lucro usa os custos atuais de <strong>{s.veiculo.nome}</strong>. Taxas, bônus e pedágios não vêm na planilha: edite a corrida depois, se precisar.
                  </p>
                </div>
              )
            )}

            <div className="flex flex-wrap gap-2">
              <Btn kind="primary" disabled={!resultado?.validas.length || faltando.length > 0} onClick={importar}>
                Importar {resultado?.validas.length ?? 0} corridas
              </Btn>
              <Btn
                onClick={() => {
                  setArquivos(null);
                  setMapa(null);
                }}
              >
                Escolher outro arquivo
              </Btn>
            </div>
          </div>
        )
      )}
    </>
  );
}

function resumo(motivos: string[]): string {
  const c = new Map<string, number>();
  for (const m of motivos) c.set(m, (c.get(m) ?? 0) + 1);
  return [...c.entries()].map(([m, n]) => `${n} ${m}`).join(', ');
}

/* ---------- Como cada plataforma deixa o motorista pegar o histórico (pesquisado em out/2026) ---------- */

interface Ajuda {
  planilha: string;
  print: string;
  /** a plataforma não oferece planilha ao motorista: abrir já na aba de prints */
  soPrint?: boolean;
}

const AJUDA: Record<string, Ajuda> = {
  uber: {
    planilha:
      'Duas opções. 1) Extrato semanal: em drivers.uber.com → Rendimentos → Extratos, abra a semana e toque em “Baixar CSV” (uma semana por vez; pode não trazer km e tempo). 2) Histórico completo: peça seus dados na Central de Privacidade da Uber (no app ou em myprivacy.uber.com). Chega um .zip por e-mail com as viagens (início, fim, distância e valor): envie o .zip aqui sem abrir.',
    print: 'No app Uber Driver, abra Ganhos (ou Atividades) e a lista de viagens da semana. Tire prints rolando a tela.',
  },
  uber_flash: {
    planilha:
      'Igual à Uber: extrato semanal em drivers.uber.com → Rendimentos → Extratos → “Baixar CSV”, ou o .zip completo pedido na Central de Privacidade da Uber.',
    print: 'No app Uber Driver, abra Ganhos (ou Atividades) e a lista de entregas da semana.',
  },
  '99': {
    planilha:
      'O app da 99 não tem botão de exportar para o motorista. Dá para pedir o “extrato de corridas” ao suporte (Ajuda), que chega por e-mail, mas costuma vir como resumo. Se vier planilha, importe aqui; se não, use prints.',
    print: 'No app 99 Motorista, abra a Carteira e o histórico de corridas. Tire prints rolando a lista.',
    soPrint: true,
  },
  '99_entrega': {
    planilha: 'A 99 não oferece exportação para o entregador. Use prints do histórico.',
    print: 'No app, abra a Carteira e o histórico de entregas.',
    soPrint: true,
  },
  ifood: {
    planilha: 'O app iFood para Entregadores não exporta planilha nem PDF do extrato. Use prints.',
    print: 'No app iFood para Entregadores, abra o Extrato (com entregas, distâncias e tempo) e tire prints.',
    soPrint: true,
  },
  lalamove: {
    planilha:
      'O app do motorista parceiro mostra o histórico na Carteira, mas não tem exportação confirmada. Atenção: o “Carteira → Declaração” do site da Lalamove é do painel de clientes e empresas, não do motorista.',
    print: 'No app Lalamove do motorista, abra a Carteira → histórico de pedidos/transações e tire prints.',
    soPrint: true,
  },
  indrive: {
    planilha: 'O inDrive não fornece relatório de ganhos ao motorista. Use prints.',
    print: 'No app, abra o Histórico de corridas e tire prints. O histórico fica disponível por tempo limitado: importe com frequência.',
    soPrint: true,
  },
};

const AJUDA_PADRAO: Ajuda = {
  planilha: 'Procure no app ou no site da plataforma por “baixar meus dados”, “extrato” ou “exportar”. Ou use sua própria planilha: no Excel ou Google Planilhas, salve como CSV com colunas de data, valor, distância e duração.',
  print: 'Abra o histórico de corridas ou entregas no app da plataforma e tire prints rolando a lista.',
};

type Modo = 'planilha' | 'print';

export function ImportPanel({ s, existentes, onImport, onClose }: { s: Settings; existentes: Set<string>; onImport: (e: HistoryEntry[]) => void; onClose: () => void }) {
  const plats = platforms(s);
  const [plataforma, setPlataforma] = useState(s.plataformaAtiva ?? plats[0]?.id ?? '');
  const ajuda = AJUDA[plataforma] ?? AJUDA_PADRAO;
  const [modo, setModo] = useState<Modo>(ajuda.soPrint ? 'print' : 'planilha');
  const [feito, setFeito] = useState<number | null>(null);

  function importar(novas: HistoryEntry[]) {
    onImport(novas);
    setFeito(novas.length);
  }

  return (
    <Card className="border-accent/60">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-semibold tracking-wide">Importar corridas</h2>
        <button className="text-sm font-semibold text-muted hover:text-ink" onClick={onClose}>
          Fechar
        </button>
      </div>
      <p className="mb-3 text-sm text-muted">Traga as corridas que você já fez, sem digitar uma por uma.</p>

      {feito !== null && (
        <p role="status" className="mb-3 rounded-md bg-good-soft px-3 py-2 text-sm text-good">
          {feito} {feito === 1 ? 'corrida importada' : 'corridas importadas'}. O lucro foi calculado com os custos do veículo em uso.
        </p>
      )}

      <div className="mb-3 grid min-w-0 gap-3 text-sm [&>*]:min-w-0">
        <label className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-muted">Plataforma dessas corridas</span>
          <select
            value={plataforma}
            onChange={(e) => {
              setPlataforma(e.target.value);
              if ((AJUDA[e.target.value] ?? AJUDA_PADRAO).soPrint) setModo('print');
            }}
            className="rounded-md border border-line bg-surface px-3 py-2"
          >
            {plats.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <Segmented<Modo>
          label="Como importar"
          value={modo}
          onChange={setModo}
          options={[
            { value: 'print', label: '📸 Prints da tela' },
            { value: 'planilha', label: '📄 Planilha / .zip' },
          ]}
        />
        <div className="rounded-lg bg-sunk px-3 py-2">
          <strong>Como conseguir:</strong> {modo === 'print' ? ajuda.print : ajuda.planilha}
          <span className="mt-1 block text-xs text-muted">Os menus podem mudar conforme a versão do app da plataforma.</span>
        </div>
      </div>

      {modo === 'planilha' ? (
        <PlanilhaImport s={s} plataforma={plataforma} existentes={existentes} onImport={importar} />
      ) : (
        <PrintsImport s={s} plataforma={plataforma} existentes={existentes} onImport={importar} />
      )}
    </Card>
  );
}

/* ---------- Prints: a IA lê, a pessoa confere e completa ---------- */

const MAX_PRINTS = 5;

interface Cota {
  pro: boolean;
  usados: number;
  limite: number;
  restantes: number;
  printsPorEnvio: number;
  liberaEm: string | null;
}

function PrintsImport({ s, plataforma, existentes, onImport }: { s: Settings; plataforma: string; existentes: Set<string>; onImport: (e: HistoryEntry[]) => void }) {
  const auth = useAuth();
  const { plan, upgrade } = usePlan();
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [restantes, setRestantes] = useState<number | null>(null);
  const [linhas, setLinhas] = useState<Rascunho[] | null>(null);
  // A leitura por IA só funciona quando o servidor tem a chave configurada; o servidor também diz quanto falta da cota
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [cota, setCota] = useState<Cota | null>(null);
  const consultar = () => {
    if (!auth.user || !supabase) return () => undefined;
    let vivo = true;
    supabase.functions
      .invoke('ler-print', { method: 'GET' })
      .then(({ data }) => {
        if (!vivo) return;
        const d = data as ({ disponivel?: boolean } & Partial<Cota>) | null;
        setDisponivel(!!d?.disponivel);
        if (d && typeof d.restantes === 'number') setCota(d as Cota);
      })
      .catch(() => vivo && setDisponivel(false));
    return () => {
      vivo = false;
    };
  };
  useEffect(consultar, [auth.user]); // eslint-disable-line react-hooks/exhaustive-deps
  const porEnvio = cota?.printsPorEnvio ?? (plan.pro ? MAX_PRINTS : 1);

  const pronto = useMemo(() => (linhas ? corridasDeRascunhos(linhas, s, plataforma, existentes) : null), [linhas, s, plataforma, existentes]);
  const incompletas = linhas ? linhas.filter((l) => l.incluir && faltaNoRascunho(l).length > 0).length : 0;

  if (!auth.user || !supabase) {
    return (
      <p className="rounded-md bg-warn-soft px-3 py-2 text-sm">
        Para ler prints, entre na sua conta (a leitura é feita no servidor). Sem conta, use a aba Planilha.
      </p>
    );
  }

  if (disponivel === null) return <p className="text-sm text-muted">Verificando…</p>;
  if (!disponivel) {
    return (
      <div className="rounded-md bg-sunk px-3 py-3 text-sm">
        <strong>📸 Em breve:</strong> importar corridas mandando prints da tela. Enquanto isso, use a aba <strong>Planilha</strong> (se a plataforma oferecer) ou registre
        cada corrida pela <strong>⚡ Oferta rápida</strong> ao aceitar.
      </div>
    );
  }

  async function enviar(files: FileList | null) {
    if (!files?.length) return;
    const lista = [...files].slice(0, porEnvio);
    setErro(null);
    setAviso(null);
    setLendo(true);
    try {
      const imagens = await Promise.all(lista.map(prepararImagem));
      const { data, error } = await supabase!.functions.invoke('ler-print', { body: { plataforma, imagens } });
      if (error) {
        let msg = 'Não foi possível ler os prints agora. Tente de novo.';
        try {
          const j = await (error as { context?: Response }).context?.json();
          if (j?.error) msg = j.error;
        } catch {
          /* sem corpo */
        }
        throw new Error(msg);
      }
      const r = data as { corridas: LinhaPrint[]; aviso: string | null; restantes: number };
      setRestantes(r.restantes);
      consultar(); // atualiza a cota (e a data em que libera de novo)
      setAviso(r.aviso);
      if (!r.corridas.length) {
        setErro(r.aviso ?? 'Não encontrei corridas nesses prints. Confira se é a tela do histórico.');
        return;
      }
      // Junta com o que já foi lido antes (a pessoa pode enviar a lista em partes)
      setLinhas((cur) => {
        const novos = rascunhosDePrints(r.corridas).map((x, i) => ({ ...x, chave: `${Date.now()}-${i}` }));
        return [...(cur ?? []), ...novos];
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui ler os prints.');
    } finally {
      setLendo(false);
    }
  }

  function mudar(chave: string, patch: Partial<Rascunho>) {
    setLinhas((cur) => cur?.map((l) => (l.chave === chave ? { ...l, ...patch } : l)) ?? null);
  }

  const esgotado = cota !== null && cota.restantes <= 0;
  const libera = cota?.liberaEm ? new Date(cota.liberaEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : null;

  return (
    <div className="grid min-w-0 gap-3 text-sm [&>*]:min-w-0">
      {esgotado && !cota!.pro ? (
        <div className="rounded-lg border border-dashed border-accent/50 px-4 py-4">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <ProTag /> Você já usou o print grátis destes 30 dias
          </div>
          <p className="mb-3 text-muted">{libera ? `O próximo libera em ${libera}. ` : ''}No Pro, você importa até 5 prints por vez, 40 vezes por dia.</p>
          <button onClick={upgrade} className="rounded-lg bg-accent px-4 py-2 font-semibold text-accent-ink">
            Assinar o Pro
          </button>
        </div>
      ) : esgotado ? (
        <p className="rounded-md bg-warn-soft px-3 py-2">Você chegou ao limite de 40 envios de prints hoje. Volte amanhã.</p>
      ) : (
        <label className={`cursor-pointer rounded-lg border-2 border-dashed border-line px-4 py-6 text-center font-semibold hover:bg-sunk ${lendo ? 'pointer-events-none opacity-60' : ''}`}>
          {lendo
            ? 'Lendo… (uns 10 a 30 segundos)'
            : porEnvio === 1
              ? 'Escolher 1 print'
              : linhas
                ? `+ Adicionar mais prints (até ${porEnvio} por vez)`
                : `Escolher prints (até ${porEnvio} por vez)`}
          <input
            type="file"
            accept="image/*"
            multiple={porEnvio > 1}
            className="hidden"
            onChange={(e) => {
              void enviar(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      )}
      <p className="-mt-1 text-xs text-muted">
        Os prints são lidos por inteligência artificial só para extrair data, valor, km e tempo de cada corrida. Nomes e endereços não são guardados nem devolvidos.
        {!plan.pro && !esgotado && (
          <>
            {' '}
            No plano Grátis é <strong>1 print a cada 30 dias</strong>: escolha o print com mais corridas.{' '}
            <button className="font-semibold text-accent" onClick={upgrade}>
              <ProTag /> libera até 5 por vez, 40 vezes por dia
            </button>
          </>
        )}
        {plan.pro && restantes !== null && ` Envios restantes hoje: ${restantes}.`}
      </p>

      {erro && (
        <p role="alert" className="rounded-md bg-bad-soft px-3 py-2 text-bad">
          {erro}
        </p>
      )}
      {aviso && !erro && <p className="rounded-md bg-warn-soft px-3 py-2">{aviso}</p>}

      {linhas && linhas.length > 0 && (
        <div>
          <h3 className="mb-1 font-semibold">Confira antes de importar</h3>
          <p className="mb-2 text-xs text-muted">
            Corrija o que a leitura errou. Campos em vermelho estão faltando: muitos apps não mostram km ou tempo na lista; abra a corrida no app para ver, ou desmarque a linha.
          </p>
          <RevisaoPrints linhas={linhas} mudar={mudar} />
          <ul className="mt-2 text-sm">
            <li>
              ✅ <strong>{pronto?.validas.length ?? 0}</strong> prontas para importar
            </li>
            {incompletas > 0 && <li>✏️ {incompletas} marcadas mas incompletas (complete ou desmarque)</li>}
            {(pronto?.repetidas ?? 0) > 0 && <li>↩️ {pronto!.repetidas} já estavam no histórico</li>}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <Btn
              kind="primary"
              disabled={!pronto?.validas.length}
              onClick={() => {
                if (!pronto?.validas.length) return;
                onImport(pronto.validas);
                setLinhas(null);
                setRestantes(null);
              }}
            >
              Importar {pronto?.validas.length ?? 0} corridas
            </Btn>
            <Btn onClick={() => setLinhas(null)}>Descartar</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/** Conferência das corridas lidas nos prints: um cartão por corrida (cabe em qualquer celular). */
export function RevisaoPrints({ linhas, mudar }: { linhas: Rascunho[]; mudar: (chave: string, patch: Partial<Rascunho>) => void }) {
  return (
    <ul className="grid min-w-0 gap-2">
      {linhas.map((l, i) => {
        const falta = l.incluir ? faltaNoRascunho(l) : [];
        const campo = (nome: string) =>
          `w-full min-w-0 appearance-none rounded-md border bg-surface px-2 py-1.5 text-sm ${falta.includes(nome) ? 'border-bad' : 'border-line'}`;
        return (
          <li key={l.chave} className={`min-w-0 rounded-lg border p-2.5 ${l.incluir ? 'border-line bg-surface' : 'border-line/60 bg-sunk opacity-60'}`}>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={l.incluir} onChange={(e) => mudar(l.chave, { incluir: e.target.checked })} />
              Corrida {i + 1}
              {l.cancelada && <span className="rounded bg-bad-soft px-1.5 text-[11px] font-semibold text-bad">cancelada</span>}
              {l.incluir && falta.length > 0 && <span className="ml-auto text-[11px] font-normal text-bad">falta: {falta.join(', ')}</span>}
            </label>
            {l.incluir && (
              <div className="tnum grid grid-cols-2 gap-2 text-xs sm:grid-cols-5 [&>*]:min-w-0">
                <label className="flex flex-col gap-0.5">
                  <span className="text-muted">Data</span>
                  <input type="date" className={campo('data')} value={l.data} onChange={(e) => mudar(l.chave, { data: e.target.value })} />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-muted">Hora</span>
                  <input type="time" className={campo('hora')} value={l.hora} onChange={(e) => mudar(l.chave, { hora: e.target.value })} />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-muted">Valor (R$)</span>
                  <input inputMode="decimal" className={campo('valor')} value={l.valor} onChange={(e) => mudar(l.chave, { valor: e.target.value })} />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-muted">Km</span>
                  <input inputMode="decimal" className={campo('km')} value={l.km} placeholder="?" onChange={(e) => mudar(l.chave, { km: e.target.value })} />
                </label>
                <label className="col-span-2 flex flex-col gap-0.5 sm:col-span-1">
                  <span className="text-muted">Tempo (min)</span>
                  <input inputMode="numeric" className={campo('minutos')} value={l.minutos} placeholder="?" onChange={(e) => mudar(l.chave, { minutos: e.target.value })} />
                </label>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
