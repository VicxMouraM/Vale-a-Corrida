/**
 * Reduz um print antes de enviar para a leitura por IA: lado maior até 1568 px (o tamanho que a IA
 * aproveita sem perder detalhe) e JPEG. Um print de celular de 3 MB vira ~200 KB: mais rápido no 4G e mais barato.
 */
const LADO_MAX = 1568;

export interface ImagemPronta {
  tipo: 'image/jpeg';
  base64: string;
}

export async function prepararImagem(f: File): Promise<ImagemPronta> {
  if (!/^image\/(png|jpe?g|webp|heic|heif)$/i.test(f.type) && !/\.(png|jpe?g|webp|heic|heif)$/i.test(f.name)) {
    throw new Error(`"${f.name}" não é uma imagem.`);
  }
  if (f.size > 25 * 1024 * 1024) throw new Error(`"${f.name}" é grande demais.`);
  const bmp = await createImageBitmap(f).catch(() => {
    throw new Error(`Não consegui abrir "${f.name}". Tire o print de novo (PNG ou JPG).`);
  });
  const escala = Math.min(1, LADO_MAX / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * escala);
  const h = Math.round(bmp.height * escala);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não conseguiu preparar a imagem.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return { tipo: 'image/jpeg', base64: dataUrl.slice(dataUrl.indexOf(',') + 1) };
}
