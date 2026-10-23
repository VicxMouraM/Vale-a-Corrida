"""Testes de segurança pela internet: o que um atacante sem conta consegue fazer com a chave pública do app.

Uso (na pasta do projeto): python scripts/testes-seguranca-http.py
Lê VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY do .env.local. Não cria conta nem envia e-mail:
cada requisição é feita para ser recusada. Cada linha "OK" é um ataque barrado.
"""
import json
import re
import urllib.error
import urllib.request

env = dict(re.findall(r'^(VITE_\w+)=(.*)$', open('.env.local', encoding='utf-8').read(), re.M))
URL, KEY = env['VITE_SUPABASE_URL'].strip(), env['VITE_SUPABASE_ANON_KEY'].strip()
falhas = 0


def req(metodo, caminho, corpo=None, headers=None, chave=True):
    h = {'Content-Type': 'application/json', **(headers or {})}
    if chave:
        h['apikey'] = KEY
    dados = json.dumps(corpo).encode() if corpo is not None else None
    r = urllib.request.Request(URL + caminho, data=dados, method=metodo, headers=h)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return resp.status, resp.read().decode('utf-8', 'replace'), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', 'replace'), dict(e.headers)


def checa(ok, descricao, detalhe=''):
    global falhas
    if not ok:
        falhas += 1
    print(('OK      ' if ok else 'FALHOU  ') + descricao + ('' if ok else f'  ->  {detalhe[:200]}'))


# 1. Cadastro sem captcha e com senha fraca (nenhum dos dois cria conta)
st, corpo, _ = req('POST', '/auth/v1/signup', {'email': 'teste.robo@example.com', 'password': '123'})
checa(st >= 400 and 'captcha' in corpo.lower(), 'cadastro por robô (sem captcha) é recusado', f'{st} {corpo}')

# 2. Ler dados sem estar logado
for tabela in ['rides', 'user_settings', 'profiles', 'subscriptions', 'feedback', 'auditoria', 'bloqueios', 'payment_events', 'trial_usage', 'anuncios']:
    st, corpo, _ = req('GET', f'/rest/v1/{tabela}?select=*&limit=1')
    vazio = st in (401, 403, 404) or corpo.strip() == '[]'
    if tabela == 'anuncios':  # anúncios ativos são públicos de propósito
        checa(st == 200, 'anúncios: leitura pública só dos anúncios (permitido de propósito)', f'{st} {corpo}')
    else:
        checa(vazio, f'sem conta NÃO lê a tabela {tabela}', f'{st} {corpo}')

# 3. Gravar sem estar logado
for tabela, linha in [
    ('rides', {'id': 'x', 'user_id': '00000000-0000-0000-0000-000000000000', 'valor': 1}),
    ('subscriptions', {'user_id': '00000000-0000-0000-0000-000000000000', 'status': 'active', 'cortesia': True}),
    ('feedback', {'mensagem': 'spam'}),
    ('anuncios', {'titulo': 'golpe', 'link': 'https://golpe.example'}),
    ('bloqueios', {'tipo': 'email', 'hash': 'x'}),
]:
    st, corpo, _ = req('POST', f'/rest/v1/{tabela}', linha)
    checa(st >= 400, f'sem conta NÃO grava na tabela {tabela}', f'{st} {corpo}')
st, corpo, _ = req('PATCH', '/rest/v1/subscriptions?user_id=not.is.null', {'cortesia': True})
checa(st >= 400 or corpo.strip() in ('', '[]'), 'sem conta NÃO altera assinaturas', f'{st} {corpo}')

# 4. Funções do banco
for fn, args in [('is_pro_de', {'uid': '00000000-0000-0000-0000-000000000000'}), ('delete_my_account', {}), ('handle_new_user', {})]:
    st, corpo, _ = req('POST', f'/rest/v1/rpc/{fn}', args)
    checa(st >= 400, f'sem conta NÃO chama a função {fn}', f'{st} {corpo}')
st, corpo, _ = req('POST', '/rest/v1/rpc/get_my_plan', {})
checa(st >= 400 or '"pro" : false' in corpo or '"pro":false' in corpo, 'sem conta, get_my_plan não dá Pro', f'{st} {corpo}')

# 5. Funções do servidor (Edge Functions)
for fn in ['assinar', 'cancelar', 'excluir-conta', 'ler-print']:
    st, corpo, _ = req('POST', f'/functions/v1/{fn}', {}, {'Authorization': f'Bearer {KEY}'})
    checa(st in (401, 403), f'sem login NÃO usa {fn}', f'{st} {corpo}')
st, corpo, _ = req('POST', '/functions/v1/assinar', {}, {'Authorization': 'Bearer token.falso.inventado'})
checa(st in (401, 403), 'token de login falsificado é recusado', f'{st} {corpo}')
st, corpo, _ = req('POST', '/functions/v1/rotina-assinaturas', {}, {'x-cron-secret': 'chute'})
checa(st == 401, 'rotina de cancelamento NÃO roda sem o segredo', f'{st} {corpo}')
falso_pago = {'event': 'PAYMENT_CONFIRMED', 'payment': {'id': 'pay_x', 'subscription': 'sub_x', 'customer': 'cus_x', 'value': 49.99}}
st, corpo, _ = req('POST', '/functions/v1/asaas-webhook', falso_pago, {'asaas-access-token': 'chute'})
checa(st == 401, 'aviso de pagamento falso (webhook sem o token do Asaas) é recusado', f'{st} {corpo}')
st, corpo, _ = req('POST', '/functions/v1/feedback', {'tipo': 'problema', 'mensagem': 'x' * 5000})
checa(st == 400, 'feedback gigante é recusado', f'{st} {corpo}')

# 6. Outro site tentando usar as funções pelo navegador de quem está logado (CORS)
st, corpo, h = req('OPTIONS', '/functions/v1/assinar', None, {'Origin': 'https://site-golpe.example', 'Access-Control-Request-Method': 'POST'})
origem = {k.lower(): v for k, v in h.items()}.get('access-control-allow-origin', '')
checa(origem not in ('*', 'https://site-golpe.example'), 'outro site NÃO chama as funções pelo navegador', f'{st} allow-origin={origem}')

print(f'\nRESULTADO: {falhas} falha(s)')
