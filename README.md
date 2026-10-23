# Vale a Corrida?

Calculadora para decidir, antes de aceitar, se uma entrega da Lalamove dá lucro de verdade com um Hyundai ix35 GLS 2.0 2012 automático blindado (ou qualquer outro carro: tudo é configurável).

React 18 + TypeScript + Tailwind CSS + Vite + Supabase.

- **Sem conta (modo convidado):** tudo funciona e os dados ficam no `localStorage` do aparelho.
- **Com conta:** login por e-mail e senha ou Google. Ajustes e histórico ficam no Supabase (Postgres com Row Level Security: cada usuário só acessa os próprios dados), sincronizam entre aparelhos e continuam funcionando sem internet, com envio automático quando a conexão volta. Ao criar a conta, o app oferece levar os dados do modo convidado.

- **Planos:** Grátis (calculadora, meta do dia, 1 veículo, 1 plataforma, histórico de 30 dias) e Pro por R$ 49,99/mês via Asaas (Pix, cartão ou boleto), com 7 dias de teste. O acesso é decidido no banco (RLS e `is_pro()`); o webhook do Asaas libera o Pro sozinho.

Para ativar contas e pagamentos, siga [supabase/CONFIGURAR.md](supabase/CONFIGURAR.md).

## Como executar

Pré-requisito: Node.js 18 ou mais novo.

```bash
npm install
cp .env.example .env.local   # opcional: preencha com o seu Supabase para ter contas
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

## Instalar no iPhone (e Android) como app

O app é um PWA: instala pelo navegador, ganha ícone na tela de início, abre em tela cheia e funciona sem internet.

1. Publique no GitHub Pages (uma vez só):
   - Suba o projeto para o GitHub (`git push`).
   - No repositório, vá em **Settings → Pages → Build and deployment → Source** e escolha **GitHub Actions**.
   - Na aba **Actions**, espere o "Publicar no GitHub Pages" ficar verde (1 a 2 min). O link fica em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.
   - A cada novo `git push` na branch `main`, o site atualiza sozinho.
2. No iPhone, abra o link **no Safari** (precisa ser o Safari).
3. Toque em **Compartilhar** (quadrado com seta) → **Adicionar à Tela de Início** → **Adicionar**.

No Android: abra no Chrome → menu ⋮ → **Instalar app**.

Sem conta, os dados ficam guardados no próprio celular, separados do Safari: use **Ajustes → Backup** de vez em quando. Com conta, ficam salvos na nuvem.

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
supabase/
  migrations/0001_base.sql  tabelas, RLS, exclusão de conta
  migrations/0002_planos.sql  assinaturas, teste grátis, limite de 30 dias no grátis
  functions/assinar         cria a assinatura no Asaas e devolve o link de pagamento
  functions/cancelar        cancela a assinatura
  functions/asaas-webhook   recebe os pagamentos e libera/bloqueia o Pro
  CONFIGURAR.md             passo a passo do Supabase
src/
  App.tsx                 login/convidado, navegação, barra inferior no celular
  auth/AuthProvider.tsx   sessão e todas as formas de login
  lib/supabase.ts         cliente Supabase (null sem as chaves = só convidado)
  lib/useAppData.ts       estado do app: aparelho ou conta, fila offline e envio
  lib/cloud.ts            leitura/gravação no Supabase, diferenças e mesclagem
  lib/cloud.test.ts       testes da sincronização e da limpeza de dados
  lib/plan.ts             plano do usuário, regras do grátis, checkout
  types.ts                tipos de dados
  defaults.ts             valores padrão (estimativas)
  lib/calc.ts             todos os cálculos (funções puras)
  lib/calc.test.ts        testes das fórmulas
  lib/format.ts           R$, números pt-BR, leitura com vírgula
  lib/storage.ts          modo convidado, mesclagem segura e limpeza de dados
  lib/csv.ts              exportação CSV
  lib/period.ts           filtros dia/semana/mês
  components/
    AuthScreen.tsx        entrar, criar conta, Google, recuperar senha
    AccountScreen.tsx     conta, sair, excluir conta (LGPD)
    PlanScreen.tsx        Grátis × Pro, assinar e cancelar
    Pro.tsx               travas e selo do Pro
    Calculator.tsx        tela principal (oferta, painel, conta da corrida)
    Verdict.tsx           cores e textos do semáforo
    Goals.tsx             metas
    History.tsx           histórico, painel e gráficos
    SettingsPanel.tsx     combustível, manutenção, fixos, taxa, backup
    charts.tsx            gráficos em SVG (sem bibliotecas)
    ui.tsx                campos, cartões, botões
```
