import { unzipSync } from 'fflate';
import { useMemo, useState } from 'react';
import { brl, hm, num } from '../lib/format';
import { detectar, montar, parseCsv, type Mapeamento, type Planilha, type UnidadeDist, type UnidadeTempo } from '../lib/importer';
import { DIAS_HISTORICO_GRATIS, usePlan } from '../lib/plan';
import { platforms } from '../lib/platforms';
import type { HistoryEntry, Settings } from '../types';
import { Btn, Card, Segmented } from './ui';

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
  { id: 'status', nome: 'Status (para pular canceladas)', obrigatorio: false },
];

export function ImportPanel({ s, existentes, onImport, onClose }: { s: Settings; existentes: Set<string>; onImport: (e: HistoryEntry[]) => void; onClose: () => void }) {
  const { plan } = usePlan();
  const plats = platforms(s);
  const [plataforma, setPlataforma] = useState(s.plataformaAtiva ?? plats[0]?.id ?? '');
  const [arquivos, setArquivos] = useState<Arquivo[] | null>(null);
  const [escolhido, setEscolhido] = useState(0);
  const [mapa, setMapa] = useState<Mapeamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [feito, setFeito] = useState<number | null>(null);

  const atual = arquivos?.[escolhido] ?? null;
  const resultado = useMemo(
    () => (atual && mapa ? montar(atual.planilha, mapa, s, { plataforma, existentes }) : null),
    [atual, mapa, s, plataforma, existentes],
  );
  const faltando = mapa ? CAMPOS.filter((c) => c.obrigatorio && mapa[c.id] === null) : [];

  async function abrir(f: File | undefined) {
    if (!f) return;
    setErro(null);
    setLendo(true);
    setFeito(null);
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
    setFeito(resultado.validas.length);
    setArquivos(null);
    setMapa(null);
  }

  const antigas = resultado ? resultado.validas.filter((e) => Date.now() - new Date(e.data).getTime() > DIAS_HISTORICO_GRATIS * 86400000).length : 0;

  return (
    <Card className="border-accent/60">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-semibold tracking-wide">Importar corridas</h2>
        <button className="text-sm font-semibold text-muted hover:text-ink" onClick={onClose}>
          Fechar
        </button>
      </div>

      {feito !== null && (
        <p role="status" className="mb-3 rounded-md bg-good-soft px-3 py-2 text-sm text-good">
          {feito} {feito === 1 ? 'corrida importada' : 'corridas importadas'}. O lucro foi calculado com os custos do veículo em uso.
        </p>
      )}

      {!arquivos ? (
        <div className="grid gap-3 text-sm">
          <p className="text-muted">
            Traga as corridas que você já fez, sem digitar uma por uma. Aceita a planilha (.csv) ou o arquivo .zip de dados que as plataformas enviam.
          </p>
          <details className="rounded-lg bg-sunk px-3 py-2">
            <summary className="cursor-pointer font-semibold">Como conseguir o arquivo</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Uber:</strong> na Central de Privacidade (<span className="font-mono text-xs">myprivacy.uber.com</span>) peça para baixar seus dados. Chega um .zip por
                e-mail: envie o .zip aqui, sem abrir.
              </li>
              <li>
                <strong>99, iFood, Lalamove e outras:</strong> procure no app ou no site por “baixar meus dados”, “extrato” ou “exportar”. Se vier em PDF, não dá para
                importar.
              </li>
              <li>
                <strong>Sua planilha:</strong> no Excel ou Google Planilhas, salve como CSV. Precisa ter colunas de data, valor, distância e duração.
              </li>
            </ul>
          </details>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-muted">Plataforma dessas corridas</span>
            <select value={plataforma} onChange={(e) => setPlataforma(e.target.value)} className="rounded-md border border-line bg-surface px-3 py-2">
              {plats.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
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
    </Card>
  );
}

function resumo(motivos: string[]): string {
  const c = new Map<string, number>();
  for (const m of motivos) c.set(m, (c.get(m) ?? 0) + 1);
  return [...c.entries()].map(([m, n]) => `${n} ${m}`).join(', ');
}
