/**
 * TERMOS DE USO E POLÍTICA DE PRIVACIDADE
 *
 * PREENCHA OS DADOS ABAIXO ANTES DE ABRIR O APP AO PÚBLICO.
 * Estes textos são uma base escrita a partir do que o app realmente faz (dados coletados,
 * fornecedores, prazos). Peça a um advogado para revisar antes de começar a cobrar.
 */
export const LEGAL = {
  produto: 'Vale a Corrida',
  responsavel: 'Victoria Moura',
  documento: '65.504.803/0001-29',
  email: 'vicxmoura@gmail.com',
  cidade: 'São Paulo/SP',
  atualizadoEm: '23 de outubro de 2026',
  versao: '2026-10-23.4',
};

export interface LegalSection {
  titulo: string;
  paragrafos: string[];
}

const L = LEGAL;

export const TERMOS: LegalSection[] = [
  {
    titulo: '1. O que é o app',
    paragrafos: [
      `O ${L.produto} é uma ferramenta para motoristas e entregadores estimarem o lucro de corridas e entregas, registrarem o histórico e acompanharem metas. É oferecido por ${L.responsavel}, ${L.documento}, ${L.cidade}.`,
      'Os resultados são estimativas feitas a partir dos números que você informa (preço do combustível, consumo, manutenção, taxas e outros) e de valores de exemplo. Eles não são orientação financeira, contábil ou fiscal. A decisão de aceitar ou recusar uma corrida é sempre sua.',
      'O app não tem vínculo com Uber, 99, iFood, Lalamove, inDrive ou qualquer outra plataforma citada. Os nomes aparecem só para você identificar onde trabalha.',
    ],
  },
  {
    titulo: '2. Conta',
    paragrafos: [
      'Você pode usar a calculadora sem conta; nesse caso, os dados ficam só no seu aparelho. Para salvar na nuvem e assinar o plano Pro, é preciso criar uma conta com e-mail e senha ou com o Google.',
      'Você é responsável por manter sua senha em segredo e pelas informações que registra. Avise-nos se suspeitar de uso indevido da sua conta.',
      'Você precisa ter pelo menos 18 anos para criar uma conta.',
    ],
  },
  {
    titulo: '3. Planos e pagamento',
    paragrafos: [
      'O plano Grátis inclui a calculadora, a meta do dia, 1 veículo, 1 plataforma e o histórico dos últimos 30 dias, e exibe anúncios. O plano Pro libera o histórico completo, vários veículos e plataformas, metas de semana e mês, gráficos, comparação entre plataformas e exportação, sem anúncios.',
      'Toda conta nova ganha 7 dias de Pro grátis, uma vez por pessoa, sem precisar informar forma de pagamento. Endereços de e-mail temporários ou variações do mesmo e-mail (como pontos e “+apelido” no Gmail) não dão direito a um novo teste.',
      'O Pro custa R$ 49,99 por mês, cobrado pelo Asaas (Pix, cartão ou boleto) e renovado todo mês até você cancelar. O preço pode mudar; avisaremos com pelo menos 30 dias de antecedência, e o novo valor só vale a partir da renovação seguinte.',
      'Você pode cancelar a qualquer momento, no próprio app, sem multa. O Pro continua liberado até o fim do período já pago. Não há reembolso proporcional de mês em andamento, exceto quando a lei exigir.',
      'Direito de arrependimento: em até 7 dias após o primeiro pagamento, você pode pedir o reembolso integral pelo e-mail de contato (Código de Defesa do Consumidor, art. 49).',
      'Se um pagamento atrasar, o Pro continua por 3 dias de tolerância e depois volta ao Grátis. Se a cobrança continuar em aberto por mais 7 dias, a assinatura é cancelada automaticamente, para não gerar novas cobranças. Uma cobrança gerada e nunca paga também é cancelada depois de 7 dias.',
      'Seus dados não são apagados quando o Pro acaba: as corridas mais antigas ficam guardadas e reaparecem quando a assinatura voltar.',
      'Estorno: o acesso Pro termina na hora e a assinatura é cancelada. Contestação de pagamento no cartão (chargeback) sem motivo legítimo, ou estornos repetidos, impedem novas assinaturas com a mesma conta, CPF ou e-mail. Se acha que houve engano, fale conosco.',
    ],
  },
  {
    titulo: '4. Uso permitido',
    paragrafos: [
      'Não use o app para atividades ilegais, nem tente acessar dados de outras pessoas, contornar os limites dos planos ou o teste grátis (por exemplo, criando várias contas), sobrecarregar o serviço ou copiar o app.',
      'Nunca pedimos sua senha, código de verificação ou dados de cartão por WhatsApp, SMS, telefone ou e-mail. Pagamentos acontecem só pela página do Asaas aberta a partir do app. Desconfie de qualquer contato pedindo isso em nosso nome.',
      'Podemos suspender contas que violem estes termos, com aviso quando possível.',
    ],
  },
  {
    titulo: '5. Disponibilidade e responsabilidade',
    paragrafos: [
      'Trabalhamos para manter o app no ar e os dados seguros, mas ele pode passar por falhas e manutenções. Recomendamos gerar um backup de vez em quando (Ajustes → Backup).',
      'Não nos responsabilizamos por decisões tomadas com base nas estimativas, nem por perdas causadas por números informados incorretamente. Nada nestes termos limita direitos que o Código de Defesa do Consumidor garante a você.',
    ],
  },
  {
    titulo: '6. Mudanças e contato',
    paragrafos: [
      'Podemos atualizar estes termos. Mudanças importantes serão avisadas no app antes de entrarem em vigor.',
      `Dúvidas, pedidos e reclamações: ${L.email}. Fica eleito o foro do domicílio do consumidor.`,
    ],
  },
];

export const PRIVACIDADE: LegalSection[] = [
  {
    titulo: '1. Quem cuida dos seus dados',
    paragrafos: [
      `O controlador dos dados é ${L.responsavel}, ${L.documento}, ${L.cidade}. Para qualquer assunto sobre privacidade, inclusive com o encarregado (DPO), escreva para ${L.email}.`,
    ],
  },
  {
    titulo: '2. Quais dados usamos e por quê',
    paragrafos: [
      'Conta: e-mail, nome (se você informar) e, no login com Google, o nome e o e-mail da sua conta Google. Usamos para criar e proteger sua conta (execução do contrato).',
      'Dados do app: veículos, plataformas, custos, metas e o histórico de corridas que você registra. Usamos só para fazer os cálculos e mostrar seus relatórios (execução do contrato). Não usamos sua localização.',
      'Pagamento: o CPF ou CNPJ e os dados de pagamento vão direto para o Asaas, que emite a cobrança. Nós guardamos só o identificador da assinatura e a situação do pagamento (execução do contrato e obrigação legal).',
      'Prevenção a fraudes (legítimo interesse): guardamos um código irreversível (hash) do e-mail para que o teste grátis seja usado uma vez só; em caso de chargeback ou estornos repetidos, guardamos códigos irreversíveis do CPF e do e-mail para impedir novas assinaturas; e registramos as ações sensíveis da conta (assinar, cancelar, pagamentos, exclusão) com data e hora. Esses registros não contêm o CPF nem o e-mail em texto.',
      'Registros técnicos: o provedor de hospedagem registra acessos (endereço IP, data e hora) por segurança, como exige o Marco Civil da Internet.',
    ],
  },
  {
    titulo: '3. Com quem compartilhamos',
    paragrafos: [
      'Supabase (banco de dados e login), com servidores nos Estados Unidos; Asaas (cobrança); Google (somente se você escolher entrar com Google); GitHub Pages (hospedagem do app); API pública da tabela FIPE (consultas de marca, modelo e ano, sem dados pessoais).',
      'Transferência internacional: como o banco de dados fica nos Estados Unidos, seus dados são transferidos para fora do Brasil, com as garantias contratuais e de segurança do fornecedor (LGPD, art. 33).',
      'Não vendemos nem alugamos seus dados, e não os usamos para publicidade.',
      'Anúncios (só no plano Grátis): os anúncios de patrocinadores são exibidos pelo próprio app, sem enviar dados seus ao anunciante. Ao tocar em um anúncio, você vai para o site do anunciante, que tem a própria política de privacidade. Também podemos exibir anúncios do Google AdSense, sempre não personalizados (sem uso do seu histórico de navegação para escolher o anúncio). Mesmo assim, o Google pode usar cookies para limitar repetições, medir resultados e combater fraudes; veja como em https://policies.google.com/technologies/ads.',
    ],
  },
  {
    titulo: '4. No seu aparelho',
    paragrafos: [
      'O app guarda no navegador a sua sessão e uma cópia dos seus dados para funcionar sem internet. Nós não usamos cookies de rastreamento; no plano Grátis, os anúncios do Google podem usar cookies, como explicado acima. Ao sair da conta, a cópia dos dados da conta é apagada do aparelho.',
    ],
  },
  {
    titulo: '5. Por quanto tempo',
    paragrafos: [
      'Enquanto sua conta existir. Ao excluir a conta (Conta → Excluir minha conta), cancelamos a assinatura e apagamos na hora a conta, os ajustes e todo o histórico. Ficam apenas os códigos irreversíveis de prevenção a fraude, o registro de que a conta foi excluída e os registros de pagamento que a lei manda guardar (no Asaas, por até 5 anos).',
    ],
  },
  {
    titulo: '6. Seus direitos (LGPD, art. 18)',
    paragrafos: [
      'Você pode, a qualquer momento: ver e corrigir seus dados no próprio app; levar seus dados (Ajustes → Backup e Histórico → Exportar); excluir a conta e os dados; saber com quem compartilhamos; e revogar consentimentos. Para outros pedidos, escreva para o e-mail de contato. Respondemos em até 15 dias.',
      'Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).',
    ],
  },
  {
    titulo: '7. Segurança',
    paragrafos: [
      'Senhas são guardadas com criptografia pelo provedor de login. Toda comunicação usa HTTPS. No banco, regras de acesso garantem que cada conta só alcança os próprios dados. Nenhum sistema é 100% invulnerável; se acontecer um incidente que possa trazer risco a você, avisaremos você e a ANPD.',
    ],
  },
  {
    titulo: '8. Mudanças',
    paragrafos: ['Se esta política mudar de forma importante, avisaremos no app antes. A data da última atualização fica no topo.'],
  },
];
