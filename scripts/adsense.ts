/**
 * Google AdSense: prova de que o site é seu (meta tag) e o arquivo ads.txt, gerados a partir de
 * VITE_ADSENSE_CLIENT (ca-pub-…). Sem essa variável, nada é adicionado.
 */
import type { Plugin } from 'vite';

const valido = (c: string | undefined): c is string => !!c && /^ca-pub-\d{10,20}$/.test(c);

/** A CSP só é afrouxada para o Google quando o AdSense está de fato ligado. */
export function adsenseOn(env: Record<string, string>): boolean {
  return (env.VITE_ADS === 'adsense' || env.VITE_ADS === 'misto') && valido(env.VITE_ADSENSE_CLIENT);
}

export function adsense(client: string | undefined): Plugin {
  return {
    name: 'adsense',
    apply: 'build',
    transformIndexHtml(html) {
      if (!valido(client)) return html;
      return html.replace('<head>', `<head>\n    <meta name="google-adsense-account" content="${client}" />`);
    },
    generateBundle() {
      if (!valido(client)) return;
      // f08c47fec0942fa0 é o identificador fixo do Google no padrão ads.txt
      this.emitFile({ type: 'asset', fileName: 'ads.txt', source: `google.com, ${client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n` });
    },
  };
}
