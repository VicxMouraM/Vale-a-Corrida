# Vale a Corrida?

Calculadora para decidir, antes de aceitar, se uma entrega da Lalamove dá lucro de verdade com um Hyundai ix35 GLS 2.0 2012 automático blindado (ou qualquer outro carro: tudo é configurável).

React 18 + TypeScript + Tailwind CSS + Vite. Os dados ficam no `localStorage` do navegador.

## Como executar

Pré-requisito: Node.js 18 ou mais novo.

```bash
npm install
npm run dev        # abre em http://localhost:5173
```

Para abrir no celular na mesma rede Wi-Fi: `npm run dev -- --host` e acesse o endereço "Network" que aparecer.

Outros comandos:

```bash
npm test                                   # testes das fórmulas (Vitest)
npm run build                              # versão de produção em dist/
npx vite build --mode single --outDir dist-single   # um único index.html autocontido
```

O `dist/` pode ser publicado em qualquer hospedagem estática (Netlify, Vercel, GitHub Pages). No celular, use "Adicionar à tela inicial" para abrir como app.

## Telas

Cada informação aparece em um só lugar, e cada valor é editado em um só lugar.

| Aba | O que faz |
|---|---|
| **Corrida** | Resumo do dia em relação à meta. Você digita a oferta e vê um único painel com o semáforo 🟢🟡🔴, o motivo, quanto recebe, gasta, sobra e ganha por hora, e o valor mínimo aceitável. Abaixo, "A conta da corrida" mostra cada custo com a sua fórmula e separa o que sai do bolso hoje do que é reserva para o carro. |
| **Histórico** | Registra as corridas reais. Mostra painel com totais e médias, gráficos e filtros por dia, semana e mês, e exporta CSV (separador `;`, vírgula decimal, abre direto no Excel). |
| **Metas** | Regras do semáforo (lucro mínimo por hora, margem mínima, incluir ou não os fixos), metas por dia, semana e mês, e quanto precisa faturar. Avisa só quando as metas não batem entre si. |
| **Ajustes** | Combustível (preços, consumo e a comparação gasolina × etanol), manutenção e depreciação, custos fixos, taxa da plataforma e backup. Valores de exemplo têm a etiqueta "estimativa": ela some quando você edita o valor ou toca em "confirmar". |

## Fórmulas principais

```
km totais           = até a coleta + coleta→entrega + retorno
litros              = km ÷ km/L
combustível         = litros × preço/L
reserva manutenção  = Σ (preço do serviço ÷ km até o próximo) × km
depreciação         = (valor hoje − valor futuro) ÷ km do período × km
taxas               = valor × taxa% + taxa fixa + taxa extra
lucro operacional   = (valor + bônus) − combustível − reservas − despesas − taxas
fixos rateados      = (fixos/mês × % entregas ÷ horas de entrega/mês) × horas da corrida
resultado final     = lucro operacional − fixos rateados
mínimo sem prejuízo = (custos − bônus) ÷ (1 − taxa%)
mínimo meta/hora    = (custos + meta/h × horas − bônus) ÷ (1 − taxa%)
mínimo margem m     = (custos − bônus × (1 − m)) ÷ (1 − taxa% − m)
preço máx. etanol   = preço gasolina × (km/L etanol ÷ km/L gasolina)
faturamento p/ meta = (lucro + combustível + reservas + fixos + taxas fixas) ÷ (1 − taxa%)
```

"Custos" inclui os fixos rateados quando a opção "Descontar os custos fixos rateados na decisão" está ligada (padrão).

## Sobre os valores padrão

Exemplos para um ix35 GLS 2.0 flex automático 2012 blindado, rodando em São Paulo, pesquisados em outubro de 2026. Todos aparecem com a etiqueta "estimativa" até você editar ou confirmar.

| Item | Exemplo | Base |
|---|---|---|
| Gasolina / etanol | R$ 6,34 / R$ 3,91 por litro | Média ANP na capital paulista, semana 04–10/10/2026 |
| Consumo | 5,0 km/L gasolina · 3,4 km/L etanol | 5 km/L informado por você; etanol a 68% da gasolina, proporção do ix35 2.0 flex |
| Valor do carro | R$ 70.000 hoje → R$ 62.000 após 30.000 km | FIPE out/2026 R$ 63.609 (sem blindagem) + valor estimado da blindagem |
| Óleo 5W30 + filtros | R$ 450 a cada 5.000 km | Uso severo |
| Pneus + alinhamento | R$ 3.800 a cada 25.000 km | Jogo de 4, aro 17/18; vida mais curta pelo peso |
| Freios | R$ 1.600 a cada 20.000 km | Pastilhas, discos e fluido |
| Suspensão | R$ 3.900 a cada 40.000 km | Amortecedores, buchas, bieletas |
| Fluido do câmbio automático | R$ 900 a cada 40.000 km | Troca completa |
| Imprevistos e revisão geral | R$ 2.000 a cada 10.000 km | Carro de 14 anos |
| Itens da blindagem | R$ 1.800 a cada 30.000 km | Vidros, borrachas, máquinas de vidro, dobradiças |
| Seguro | R$ 400/mês | Estimativa: cote o seu |
| IPVA + licenciamento | R$ 230/mês | 4% do valor FIPE (SP) ÷ 12 |

- **Nenhuma taxa oficial da Lalamove está embutida**: a taxa da plataforma começa em 0.
- Manutenção e depreciação entram como **reservas** (dinheiro a separar), não como gasto do dia.
- Para não contar duas vezes, o peso extra da blindagem já está nos itens de pneus, freios e suspensão; o item da blindagem cobre só o que é dela.
- Se você já usava o app, os novos exemplos substituem apenas os valores que ainda estavam marcados como estimativa. O que você editou ou confirmou é mantido.
- Cada corrida do histórico guarda os preços e reservas da época. Mudar os Ajustes não reescreve o passado.

## Estrutura

```
src/
  App.tsx                 navegação, persistência, barra inferior no celular
  types.ts                tipos de dados
  defaults.ts             valores padrão (estimativas)
  lib/calc.ts             todos os cálculos (funções puras)
  lib/calc.test.ts        testes das fórmulas
  lib/format.ts           R$, números pt-BR, leitura com vírgula
  lib/storage.ts          localStorage com mesclagem segura
  lib/csv.ts              exportação CSV
  lib/period.ts           filtros dia/semana/mês
  components/
    Calculator.tsx        tela principal (oferta, painel, conta da corrida)
    Verdict.tsx           cores e textos do semáforo
    Goals.tsx             metas
    History.tsx           histórico, painel e gráficos
    SettingsPanel.tsx     combustível, manutenção, fixos, taxa, backup
    charts.tsx            gráficos em SVG (sem bibliotecas)
    ui.tsx                campos, cartões, botões
```
