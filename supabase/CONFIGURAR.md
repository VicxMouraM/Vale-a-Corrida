# Configurar contas (Supabase)

Sem esta configuração o app funciona normalmente, só que em modo convidado (dados no aparelho) e sem o botão "Entrar".

## 1. Criar o projeto

1. Crie uma conta em [supabase.com](https://supabase.com) → **New project**. Região: **South America (São Paulo)**. Guarde a senha do banco num gerenciador de senhas.
2. Em **SQL Editor → New query**, cole todo o conteúdo de [`migrations/0001_base.sql`](migrations/0001_base.sql) e clique em **Run**.
3. Confira em **Table Editor** que `profiles`, `user_settings` e `rides` aparecem com o cadeado de **RLS enabled**.
4. Depois de rodar também a `0002_planos.sql` (item 5.1), rode [`migrations/0003_permissoes.sql`](migrations/0003_permissoes.sql). Projetos Supabase recentes não dão permissão automática ao usuário logado; sem ela o app mostra "Não consegui carregar sua conta". Rode também [`migrations/0004_permissoes_servidor.sql`](migrations/0004_permissoes_servidor.sql): sem ela, as funções de pagamento respondem "Erro ao ler a assinatura".

## 2. Ligar o app ao projeto

Em **Project Settings → API** copie a **Project URL** e a chave **anon / publishable**.

- **No seu computador:** copie `.env.example` para `.env.local` e preencha. Depois rode `npm run dev`.
- **No site publicado:** no GitHub, abra **Settings → Secrets and variables → Actions → aba Variables** e crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Faça um push para publicar de novo.

> A chave anon é pública por natureza (vai dentro do app). Quem protege os dados são as regras RLS do banco.
> **Nunca** use a chave `service_role` / `secret` no app nem a coloque no GitHub.

## 3. Autenticação (Authentication → …)

**URL Configuration**
- *Site URL*: `https://SEU-USUARIO.github.io/Vale-a-Corrida/`
- *Redirect URLs*: o mesmo endereço e `http://localhost:5173/`

**Providers → Email**
- *Confirm email*: **ligado** (só entra quem abriu o link).
- *Secure email change*: ligado.
- *Minimum password length*: **8**. *Password requirements*: letras e números.
- *Leaked password protection* (plano Pro): ligado, se disponível.

**Providers → Google**
1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials) crie um *OAuth client ID* do tipo **Web application**.
2. Em *Authorized redirect URIs* coloque a *Callback URL* que o Supabase mostra na tela do provedor Google.
3. Cole o Client ID e o Client Secret no Supabase e ative.

> Apple e celular (SMS) ficaram de fora por enquanto: Apple exige conta Apple Developer (US$ 99/ano) e SMS cobra por mensagem. Dá para adicionar depois sem mudar o banco.

**Rate Limits / Attack Protection**
- Mantenha os limites padrão de e-mails por hora.
- Ative **CAPTCHA** (hCaptcha ou Cloudflare Turnstile) quando for abrir para o público. Exige uma pequena mudança no app: avise para incluir.

**Emails**
- Para produção, configure um SMTP próprio (Resend, Brevo, SES). O e-mail padrão do Supabase tem limite baixo e é só para testes.
- Traduza os modelos de e-mail (*Confirm signup*, *Reset password*) para português.

## 4. Testar

1. `npm run dev` → **Entrar → Criar conta** → confirme pelo e-mail → registre uma corrida.
2. Em outro navegador, entre na mesma conta: a corrida aparece.
3. No **Table Editor → rides**, a linha está lá com o seu `user_id`.
4. Teste de isolamento: crie uma segunda conta. Ela não pode ver nada da primeira.

## 5. Planos e pagamento (Asaas)

O plano Grátis e o Pro (R$ 49,99/mês, 7 dias de teste) são controlados pelo banco. O app só mostra ou esconde telas: quem decide o acesso é o Supabase.

### 5.1 Banco

No **SQL Editor**, rode [`migrations/0002_planos.sql`](migrations/0002_planos.sql). Ele:
- cria `subscriptions`, que o usuário só consegue **ler**, nunca alterar;
- dá 7 dias de teste a toda conta nova (uma vez por e-mail) e às contas que já existem;
- passa a mostrar ao plano Grátis só as corridas dos últimos 30 dias. As antigas continuam guardadas.

### 5.2 Conta no Asaas

1. Crie uma conta de **sandbox** em [sandbox.asaas.com](https://sandbox.asaas.com) para testar sem dinheiro de verdade.
2. Em **Integrações → Chaves de API**, gere uma chave.
3. Quando estiver tudo testado, repita na conta de produção (asaas.com, exige CPF/CNPJ e aprovação).

### 5.3 Publicar as funções

Instale a [CLI do Supabase](https://supabase.com/docs/guides/cli) e, na pasta do projeto:

```bash
npx supabase login
npx supabase link --project-ref SEU-PROJECT-REF      # o código na URL do projeto

# Segredos (ficam só no servidor; nunca no app nem no GitHub)
npx supabase secrets set ASAAS_API_KEY='$aact_...'
npx supabase secrets set ASAAS_API_URL=https://api-sandbox.asaas.com/v3   # produção: https://api.asaas.com/v3
npx supabase secrets set ASAAS_WEBHOOK_TOKEN=um-texto-longo-e-aleatorio  # invente; use no passo 5.4
npx supabase secrets set APP_ORIGINS=https://SEU-USUARIO.github.io

npx supabase functions deploy assinar
npx supabase functions deploy cancelar
npx supabase functions deploy asaas-webhook --no-verify-jwt
```

> As aspas simples na chave do Asaas são necessárias porque ela começa com `$`.
> Para gerar o token do webhook: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

### 5.4 Webhook (avisa o app quando o pagamento cai)

No Asaas: **Integrações → Webhooks → Adicionar**
- **URL:** `https://SEU-PROJECT-REF.supabase.co/functions/v1/asaas-webhook`
- **Token de autenticação:** o mesmo `ASAAS_WEBHOOK_TOKEN`
- **Versão da API:** v3. **Fila:** ativada. **Tipo de envio:** sequencial
- **Eventos:** `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`, `SUBSCRIPTION_DELETED`, `SUBSCRIPTION_INACTIVATED`

### 5.5 Testar (sandbox)

1. No app: **Seja Pro → Pix → CPF de teste** (por exemplo `529.982.247-25`) → **Assinar**.
2. Abre a página de cobrança do Asaas. No painel do sandbox, abra a cobrança e use **Confirmar recebimento**.
3. Volte ao app: em alguns segundos o selo muda para **Pro**. Em **Table Editor → subscriptions**, `status = active` e `current_period_end` um mês à frente.
4. **Cancelar assinatura** no app: o status vira `canceled` e o Pro continua até a data paga.
5. Teste do limite de 30 dias: em `subscriptions`, apague a data de `trial_ends_at` e de `current_period_end` de uma conta de teste. O histórico passa a mostrar só 30 dias, e as corridas antigas voltam quando a conta virar Pro de novo.

### Como o acesso é decidido

| Situação | Pro liberado? |
|---|---|
| Teste de 7 dias em andamento | Sim |
| Pagou | Sim, até o próximo vencimento + 3 dias de tolerância |
| Atrasou | Sim, até acabar a tolerância |
| Cancelou | Sim, até o fim do período pago |
| Estorno ou chargeback | Não, corta na hora |
## 6. Veículos, plataformas e termos

No **SQL Editor**, rode **antes de publicar a nova versão do app**:
1. [`migrations/0005_veiculos_plataformas.sql`](migrations/0005_veiculos_plataformas.sql): guarda o veículo de cada corrida e limita o Grátis a 1 veículo e 1 plataforma.
2. [`migrations/0006_aceite_termos.sql`](migrations/0006_aceite_termos.sql): registra no perfil quando e qual versão dos Termos a pessoa aceitou.

> Se o app for publicado antes da 0005, a conta não carrega, porque o app procura a coluna `veiculo`.

## 7. Antes de abrir ao público (checklist)

**Textos legais**
- [ ] Preencha nome ou razão social, CPF ou CNPJ, e-mail e cidade em [`src/legal.ts`](../src/legal.ts).
- [ ] Peça a um advogado para revisar os Termos e a Política de privacidade, principalmente antes de cobrar.

**CAPTCHA (Cloudflare Turnstile, grátis)**
1. Em [dash.cloudflare.com](https://dash.cloudflare.com) → **Turnstile → Add widget**. Domínios: o do app e `localhost`. Modo: *Managed*.
2. No Supabase: **Authentication → Attack Protection → Enable Captcha protection** → Turnstile → cole a **Secret key**.
3. No GitHub (Variables) e no `.env.local`: `VITE_TURNSTILE_SITE_KEY` = a **Site key**. Publique de novo.
   > Faça os passos 2 e 3 juntos: com o CAPTCHA ligado no Supabase e sem a chave no app, ninguém consegue entrar com e-mail.

**E-mails**
- [ ] **Authentication → Emails → SMTP Settings**: use um provedor como Resend, Brevo ou Amazon SES. O e-mail padrão do Supabase envia poucos por hora e cai no spam.
- [ ] **Authentication → Emails → Templates**: cole [`emails/confirmar-cadastro.html`](emails/confirmar-cadastro.html) em *Confirm signup* e [`emails/recuperar-senha.html`](emails/recuperar-senha.html) em *Reset password*. Os assuntos estão no topo de cada arquivo.

**Asaas em produção**
1. Crie a conta em [asaas.com](https://www.asaas.com) com o seu CPF ou CNPJ e espere a aprovação.
2. Gere a chave de API de produção e troque os segredos:
   ```bash
   npx supabase secrets set ASAAS_API_KEY='$aact_prod_...'
   npx supabase secrets set ASAAS_API_URL=https://api.asaas.com/v3
   ```
3. Cadastre o webhook de novo **na conta de produção** (mesma URL, mesmo token, mesmos eventos do item 5.4).
4. Faça uma assinatura real com o seu próprio cartão ou Pix, confira se o Pro libera e cancele.

**Domínio próprio (opcional, recomendado)**
1. Registre o domínio (por exemplo no registro.br) e, em **GitHub → Settings → Pages → Custom domain**, siga as instruções de DNS. Ative **Enforce HTTPS**.
2. Atualize o novo endereço em: Supabase (*Site URL* e *Redirect URLs*), Google Cloud (*Authorized JavaScript origins*), Turnstile (domínios) e `APP_ORIGINS`:
   ```bash
   npx supabase secrets set APP_ORIGINS=https://seudominio.com.br,https://SEU-USUARIO.github.io
   ```
