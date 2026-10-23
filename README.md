<p align="center"><img src="brand/horizontal-claro.png" alt="Vale a Corrida?" width="480" /></p>

# Vale a Corrida?

Calculadora para motoristas e entregadores decidirem, antes de aceitar, se uma corrida ou entrega dá lucro de verdade, e acompanharem o lucro real ao longo do tempo. Funciona com Uber, 99, iFood, Lalamove, inDrive e outras, e com qualquer veículo: carro, moto ou utilitário, cadastrado pela tabela FIPE.

React 18 + TypeScript + Tailwind CSS + Vite + Supabase.

- **Sem conta (modo convidado):** tudo funciona e os dados ficam no `localStorage` do aparelho.
- **Com conta:** login por e-mail e senha ou Google. Ajustes e histórico ficam no Supabase (Postgres com Row Level Security: cada usuário só acessa os próprios dados), sincronizam entre aparelhos e continuam funcionando sem internet, com envio automático quando a conexão volta. Ao criar a conta, o app oferece levar os dados do modo convidado.

- **Planos:** Grátis (calculadora, meta do dia, 1 veículo, 1 plataforma, histórico de 30 dias) e Pro por R$ 49,99/mês via Asaas (Pix, cartão ou boleto), com 7 dias de teste. O acesso é decidido no banco (RLS e `is_pro()`); o webhook do Asaas libera o Pro sozinho.

Para ativar contas e pagamentos, siga [supabase/CONFIGURAR.md](supabase/CONFIGURAR.md).

## ⏳ Pendências (lembretes)

Coisas que dependem de você, fora do código. Marque com `x` quando fizer.

- [x] **Ligar a importação por print (leitura por IA).** Ligada em 23/10/2026 com US$ 5 de crédito e sem recarga automática. Trocar a chave antes de ela expirar (ver data em console.anthropic.com → API Keys).
  1. Em [console.anthropic.com](https://console.anthropic.com), coloque créditos em **Billing** e defina um **limite de gasto mensal** (ex.: US$ 20).
  2. Em **API Keys**, crie uma chave. Não cole em chat nem em arquivo do projeto.
  3. No terminal do VS Code: `npx supabase secrets set ANTHROPIC_API_KEY='sk-ant-...' --project-ref fdwwukyyzlnuwtahrwnn`
  4. Pronto: a aba "📸 Prints da tela" liga sozinha (não precisa publicar de novo). Teste em **Histórico → Importar**.
  5. Custo estimado: US$ 0,01 a 0,03 por print. Acompanhe em console.anthropic.com → Usage.
- [ ] **AdSense: depois da aprovação**, criar um bloco **Display** e a variável `VITE_ADSENSE_SLOT` no GitHub (Settings → Secrets and variables → Actions → Variables). Não ligar "Anúncios automáticos".
- [ ] **GitHub: pedir a limpeza do cache** dos commits antigos com dados pessoais em [support.github.com/request](https://support.github.com/request) (*Remove sensitive data / cached views*), citando os commits `24c1b90` e `e0f433f`.
- [ ] **Search Console:** enviar `https://valeacorrida.app.br/sitemap.xml` e pedir indexação das páginas principais e dos guias.
- [ ] **Supabase Pro (quando houver assinantes):** backups diários, sem pausa por inatividade e domínio próprio no login com Google. Avaliar criar o projeto já na região São Paulo.
- [ ] **App Android com leitura automática das ofertas** (futuro): avaliar depois de ter usuários pagando.

## 🔍 Revisão geral (23/10/2026)

Feita antes da primeira semana de uso real. Tudo abaixo foi **verificado na prática** (banco consultado, servidor atacado de fora, app percorrido num navegador de teste), não só lido no código.

### Segurança

| Verificação | Resultado |
|---|---|
| RLS (regras de acesso) ligado nas 10 tabelas | ✅ |
| Tabelas internas (auditoria, bloqueios, pagamentos, teste grátis) sem acesso pelo app | ✅ |
| Privilégios mínimos: visitante só lê anúncios; logado só lê/grava as próprias corridas e ajustes | ✅ (corrigido nesta revisão: removidos TRUNCATE/TRIGGER/REFERENCES herdados do padrão, migração `0010`) |
| Ataques de fora sem login: ler dados, criar anúncio, chamar funções internas, excluir conta | ✅ todos recusados |
| Webhook do Asaas com token falso / rotina sem segredo | ✅ recusados (401) |
| Funções do servidor só aceitam chamadas do site oficial (CORS) | ✅ |
| HTTPS obrigatório, política de segurança (CSP), proteção contra iframe | ✅ |
| Código sem HTML montado como texto, `eval` ou segredo; `.env.local` fora do Git | ✅ |
| Dependências sem vulnerabilidades conhecidas (`npm audit`) | ✅ 0 |
| Pagamento real de ponta a ponta (Pix → webhook → Pro liberado → cancelamento) | ✅ testado em produção |
| Limites antifraude e de custo decididos no servidor (teste grátis, estornos, prints) | ✅ |

### Fluxos e design

Percorrido no celular (360px, tema claro e escuro) e no computador (1280px): assistente de primeiro uso, tutorial, calculadora, oferta rápida, registro, histórico, importação, metas, ajustes, plano, login e cadastro.

| Verificação | Resultado |
|---|---|
| Nenhuma tela passa da largura do celular | ✅ 16 de 16 telas, nos 3 cenários |
| Erros de JavaScript | ✅ nenhum |
| Conferência dos prints em cartões (320, 360 e 414px) | ✅ |
| Contraste no tema escuro | ✅ legível |

Ajustes feitos nesta revisão:
- Barra de navegação escondida durante o assistente de primeiro uso (antes, tocar em "Histórico" parecia travar).
- Nenhuma aba marcada nas telas de Plano, Conta e Termos.
- Link "← Voltar às plataformas" no passo do veículo.

### Limitações conhecidas (para decidir depois)
- **Login com Google** mostra o endereço técnico do Supabase ("Prosseguir para fdww…supabase.co"). Resolve com Supabase Pro + domínio próprio.
- **Banco nos EUA** (região us-east-2). A Política de privacidade já informa; migrar para São Paulo exige projeto novo.
- **Importação por planilha** testada com arquivos de exemplo; o formato real de cada plataforma pode exigir ajuste.
- **Lucro de corridas importadas** usa os custos atuais do veículo, mesmo para corridas antigas.
- **Custo real da leitura por print** ainda não medido (o registro começou agora).

### 🗓️ Roteiro da semana de uso (anote o que achar)

Use como motorista de verdade e anote aqui embaixo, com data, tudo que travar, confundir ou demorar:

- [ ] Dia 1: criar uma conta nova (outro e-mail), passar pelo assistente e pelo tutorial no celular.
- [ ] Todo dia: avaliar ofertas pela **⚡ Oferta rápida** e registrar as aceitas. Dá tempo nos ~15 segundos da oferta?
- [ ] O semáforo bateu com a sua intuição? Alguma corrida "verde" que na verdade não valeu?
- [ ] Conferir em **Ajustes** consumo, preço do combustível e manutenção do seu carro. Os valores típicos estavam perto da realidade?
- [ ] No fim da semana: o **Histórico** mostra um lucro parecido com o que sobrou de verdade no bolso?
- [ ] Importar um print do histórico de alguma plataforma e conferir a leitura.
- [ ] Mandar o link para 2 ou 3 motoristas e anotar as dúvidas deles.
- [ ] Olhar a tabela `feedback` no Supabase e o WhatsApp no fim da semana.

**Anotações da semana:**
- _(escreva aqui)_

### 📣 Texto para indicar o app

> Você sabe quanto sobra de verdade em cada corrida? O **Vale a Corrida?** calcula na hora o lucro real de cada oferta da Uber, 99, iFood, Lalamove e outros: desconta combustível, manutenção e desgaste do carro e mostra 🟢 vale a pena, 🟡 lucro baixo ou 🔴 prejuízo. É grátis e funciona no celular como app: https://valeacorrida.app.br

## 🛡️ Testes de segurança e antifraude (23/10/2026)

Dois roteiros que podem ser rodados de novo a qualquer momento (por exemplo, depois de mexer no banco ou nas funções). Nenhum dos dois deixa dados nem envia e-mail.

- **Banco** — [supabase/testes-seguranca.sql](supabase/testes-seguranca.sql): `npx supabase db query --linked -f supabase/testes-seguranca.sql`. Cria contas falsas, tenta burlar o teste grátis e o plano e, no fim, desfaz tudo. O resultado vem na mensagem de erro (o erro é proposital).
- **Internet** — [scripts/testes-seguranca-http.py](scripts/testes-seguranca-http.py): `python scripts/testes-seguranca-http.py`. Ataca com a chave pública do app, como alguém de fora faria.

Resultado: **58 ataques barrados, 0 falhas.**

| Tentativa | Resultado |
|---|---|
| Mesmo Gmail com pontos, maiúsculas, `+apelido` ou `@googlemail.com` para ganhar outro teste | sem teste |
| Outlook com `+apelido` | sem teste |
| E-mail descartável (mailinator etc.) | sem teste |
| Excluir a conta e criar de novo com o mesmo e-mail | sem teste |
| E-mail que já deu chargeback | conta nasce bloqueada |
| Cadastro por robô (sem captcha) | recusado |
| Ver, alterar, apagar ou plantar corridas/ajustes de outra pessoa | recusado |
| Se dar Pro ou cortesia, criar assinatura | recusado |
| Grátis gravar 2 veículos/2 plataformas ou ver corridas de mais de 30 dias | recusado pelo banco |
| Ler tabelas internas (auditoria, bloqueios, pagamentos, feedback…) | recusado |
| Usar assinar/cancelar/excluir conta/ler print sem login ou com token falso | recusado |
| Aviso de pagamento falso no webhook, rodar a rotina de cancelamento sem o segredo | recusado |
| Outro site chamando as funções pelo navegador de quem está logado | recusado |

**Brecha corrigida nesta rodada:** o teste grátis tinha a mesma cota de prints do Pro pago (100). Como cada leitura custa dinheiro, quem criasse várias contas com e-mails reais diferentes poderia gastar a leitura à vontade. Agora o teste tem **15 prints** (~R$ 1,50 por conta, no máximo).

**O que nenhum app consegue barrar 100%:** uma pessoa com vários e-mails *reais e diferentes* (ex.: cinco contas do Gmail) ganha um teste em cada. As barreiras deixam isso caro e chato: captcha no cadastro, confirmação obrigatória por e-mail, lista de e-mails descartáveis, cota de prints reduzida no teste e, na hora de pagar, bloqueio por CPF e e-mail em caso de chargeback. O ganho de quem faz isso é só usar o Pro por 7 dias, sem custo relevante para o app.

## 💬 Ajuda e feedback dos usuários

O link **"Ajuda e feedback"** fica no rodapé de todas as telas (e em Ajustes → "Relatar um problema"). A pessoa escolhe:

- **WhatsApp (11) 97652-0065**: abre a conversa já com uma mensagem pronta contendo a versão do app, a tela, o tipo de celular, se está instalado e o plano. Para trocar o número, mude `WHATSAPP_SUPORTE` em [`src/components/HelpScreen.tsx`](src/components/HelpScreen.tsx).
- **Formulário no app** (problema, sugestão, elogio ou outro), com contato opcional para resposta.

**Onde ler as mensagens do formulário:** Supabase → **Table Editor → `feedback`**. Use a coluna `resolvido` (marque `true`) e `anotacao` para organizar. Ou no SQL Editor:

```sql
select criado_em, tipo, mensagem, contato, contexto
  from public.feedback where not resolvido order by criado_em desc;
```

**Aviso por e-mail:** cada mensagem nova do formulário chega também por e-mail (via Brevo), com o texto, o contato e as informações técnicas; "Responder" vai direto para a pessoa quando ela deixou um e-mail. Configuração (segredos no Supabase): `BREVO_API_KEY` (chave de **API** da Brevo, não a de SMTP), `FEEDBACK_EMAIL_PARA` (hoje `vicxmoura@gmail.com`) e, opcional, `FEEDBACK_EMAIL_DE` (padrão `nao-responda@valeacorrida.app.br`, precisa ser um remetente válido na Brevo). Sem a chave, o aviso fica desligado e as mensagens continuam salvas. A chave da Brevo (acesso restrito: só e-mails transacionais) **expira depois de 90 dias seguidos sem uso**: se os avisos pararem, gere outra em Brevo → SMTP & API → Chaves API e grave de novo com `npx supabase secrets set BREVO_API_KEY='...'`.

Proteções: o envio passa pelo servidor (função `feedback`), no máximo 5 mensagens por hora por origem e 10 por dia por conta, até 2.000 caracteres; o endereço de internet é guardado só como código irreversível.

## 🎁 Pro de cortesia (sem cobrança)

A conta **vicxmoura@gmail.com** (dona do app) tem **Pro permanente por cortesia**. A cortesia é separada da assinatura: cancelamento, webhook do Asaas e a rotina automática não mexem nela, e só o servidor pode alterá-la. Também vale para parceiros ou testadores. No Supabase → SQL Editor:

```sql
-- dar cortesia
update public.subscriptions set cortesia = true, cortesia_motivo = 'parceiro X'
 where user_id = (select id from auth.users where lower(email) = 'pessoa@exemplo.com');
-- tirar cortesia
update public.subscriptions set cortesia = false
 where user_id = (select id from auth.users where lower(email) = 'pessoa@exemplo.com');
-- quem tem cortesia
select u.email, s.cortesia_motivo from public.subscriptions s join auth.users u on u.id = s.user_id where s.cortesia;
```

A pessoa precisa ter criado a conta antes. Com cortesia, ela tem tudo do Pro (inclusive os 100 prints por mês) e não vê anúncios.

## 💸 Custo da leitura por print (decisão de 23/10/2026)

| | Grátis | Teste de 7 dias | Pro (assinado ou cortesia) |
|---|---|---|---|
| Prints a cada 30 dias | 1 | 15 | **100** |
| Prints por envio | 1 | até 5 | até 5 |

O teste tem cota menor de propósito: quem criar várias contas só para usar a leitura (que custa dinheiro) leva no máximo 15 prints por conta (~R$ 1,50).

**Estimativa** (Claude Opus 5.5, US$ 4/US$ 20 por milhão de tokens, US$ 1 = R$ 5,70): ~R$ 0,09 a 0,10 por print. No pior caso, um assinante que usa os 100 prints custa ~R$ 9, cerca de 19% dos R$ 48 líquidos da assinatura. Na prática, quase ninguém usa tudo.

**Medir o custo real:** cada leitura grava os tokens em `auditoria` (ação `ler_print_uso`); a consulta pronta está em [supabase/CONFIGURAR.md](supabase/CONFIGURAR.md) (seção 9). Revisar o limite depois de algumas semanas de uso. Para baratear ~40x, testar o Claude Haiku 5.5 com prints reais antes de trocar.

## 🎨 Marca

| Arquivo | Uso |
|---|---|
| [`brand/icone.svg`](brand/icone.svg) | Ícone do app (fonte de todos os PNGs) |
| [`public/favicon.svg`](public/favicon.svg) | Símbolo com cantos arredondados: favicon, cabeçalho do app, guias |
| [`brand/horizontal-claro.svg`](brand/horizontal-claro.svg) / `.png` | Logo com nome, para fundo claro |
| [`brand/horizontal-escuro.svg`](brand/horizontal-escuro.svg) / `.png` | Logo com nome, para fundo escuro |
| [`brand/simbolo-branco.svg`](brand/simbolo-branco.svg) | Símbolo de uma cor, para fotos e fundos coloridos |
| `public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon.png` | Ícones gerados (Android, iPhone, navegador) |
| `public/og-image.png` | Imagem de compartilhamento (WhatsApp, Facebook, Google), 1200×630 |

Cores: azul-petróleo `#145C8A` (principal) · verde `#167D3E` · âmbar `#A66800` · vermelho `#BE2626` · fundo `#EFF1F4`. Fonte: Barlow Condensed (títulos) e Barlow (texto).

Para trocar o ícone: edite `brand/icone.svg` e `public/favicon.svg` e gere de novo os PNGs (os textos da logo precisam da fonte Barlow Condensed na hora de gerar). Ao trocar ícones, suba a versão do cache em `public/sw.js` para os celulares buscarem os novos.

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
| **Corrida** | Veículo e plataforma em uso (com troca rápida no Pro) e resumo do dia em relação à meta. Você digita a oferta e vê um único painel com o semáforo 🟢🟡🔴, o motivo, quanto recebe, gasta, sobra e ganha por hora, e o valor mínimo aceitável. Abaixo, "A conta da corrida" mostra cada custo com a sua fórmula e separa o que sai do bolso hoje do que é reserva para o carro. |
| **Histórico** | Registra as corridas reais, cada uma com veículo e plataforma. Mostra totais e médias; no Pro, gráficos, comparação de lucro entre plataformas e exportação CSV (separador `;`, vírgula decimal, abre direto no Excel). No Grátis, os últimos 30 dias. |
| **Metas** | Regras do semáforo (lucro mínimo por hora, margem mínima, incluir ou não os fixos), metas por dia, semana e mês, e quanto precisa faturar. Avisa só quando as metas não batem entre si. |
| **Ajustes** | Veículos (FIPE), plataformas e taxas, combustível (preços, consumo e a comparação gasolina × etanol), manutenção e depreciação, custos fixos e backup. Valores de exemplo têm a etiqueta "estimativa": ela some quando você edita o valor ou toca em "confirmar". |

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

No primeiro uso, o assistente pergunta as plataformas, o veículo e as metas. Os custos do veículo começam com valores típicos do tipo escolhido, todos com a etiqueta "estimativa" até o usuário editar ou confirmar. A fonte é [`src/lib/vehicles.ts`](src/lib/vehicles.ts).

| Item | Como é estimado |
|---|---|
| Valor do veículo | Tabela FIPE do modelo e ano escolhidos (ou valor típico do tipo, se cadastrado à mão) |
| Depreciação | 10% a 15% do valor a cada 25 a 30 mil km, conforme o tipo |
| Consumo | Média urbana típica do tipo (popular 11,5 km/L, SUV 8,5, moto 38…); etanol a 70% da gasolina |
| Manutenção | Óleo, pneus, freios, suspensão e imprevistos com preço e intervalo típicos do tipo; câmbio automático e blindagem acrescentam itens |
| Blindagem | Pneus, freios e suspensão duram ~20% menos e o consumo piora ~12% |
| Seguro e IPVA | ~5% do valor/ano (×1,3 se blindado) e 4% do valor/ano (2% motos) + licenciamento |
| Combustível | Média ANP em São Paulo; o usuário troca pelo preço do seu posto |
| Taxa da plataforma | 0 (os apps mostram o valor líquido), exceto inDrive com 10% marcado como estimativa |

- Manutenção e depreciação entram como **reservas** (dinheiro a separar), não como gasto do dia.
- Cada corrida do histórico guarda os preços e reservas da época, o veículo e a plataforma. Mudar os Ajustes não reescreve o passado.
- Quem já usava o app antes dos veículos e plataformas tem o carro e a taxa que estavam configurados convertidos no primeiro veículo e na primeira plataforma, sem perder nada.

## Estrutura

```
supabase/
  migrations/0001_base.sql  tabelas, RLS, exclusão de conta
  migrations/0002_planos.sql  assinaturas, teste grátis, limite de 30 dias no grátis
  functions/assinar         cria a assinatura no Asaas e devolve o link de pagamento
  functions/cancelar        cancela a assinatura
  functions/asaas-webhook   recebe os pagamentos e libera/bloqueia o Pro (estorno, chargeback)
  functions/excluir-conta   cancela a assinatura no Asaas e apaga a conta
  functions/rotina-assinaturas  cancelamento automático diário (agendamento.sql)
  migrations/0007_…         antifraude, bloqueios, auditoria, anúncios próprios
  CONFIGURAR.md             passo a passo do Supabase
src/
  App.tsx                 login/convidado, navegação, barra inferior no celular
  auth/AuthProvider.tsx   sessão e todas as formas de login
  lib/supabase.ts         cliente Supabase (null sem as chaves = só convidado)
  lib/useAppData.ts       estado do app: aparelho ou conta, fila offline e envio
  lib/cloud.ts            leitura/gravação no Supabase, diferenças e mesclagem
  lib/cloud.test.ts       testes da sincronização e da limpeza de dados
  lib/plan.ts             plano do usuário, regras do grátis, checkout
  lib/vehicles.ts         tipos de veículo, valores padrão, garagem
  lib/platforms.ts        catálogo de plataformas, taxas, plataforma em uso
  lib/fipe.ts             consulta à tabela FIPE (marca, modelo, ano, valor)
  lib/ads.ts              anúncios próprios ou AdSense
  legal.ts                Termos de uso e Política de privacidade (preencher dados)
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
    Onboarding.tsx        primeiro uso: plataformas → veículo → metas
    VehicleForm.tsx       cadastro de veículo pela FIPE ou à mão
    Garage.tsx            veículos e plataformas em Ajustes
    LegalScreen.tsx       Termos e Privacidade
    Turnstile.tsx         CAPTCHA (opcional)
    Tour.tsx              tutorial do primeiro acesso
    AdSlot.tsx            anúncios (some no Pro)
    Calculator.tsx        tela principal (oferta, painel, conta da corrida)
    Verdict.tsx           cores e textos do semáforo
    Goals.tsx             metas
    History.tsx           histórico, painel e gráficos
    SettingsPanel.tsx     combustível, manutenção, fixos, taxa, backup
    charts.tsx            gráficos em SVG (sem bibliotecas)
    ui.tsx                campos, cartões, botões
```
