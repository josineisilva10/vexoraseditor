import type { MediaAsset } from './editor-model';

export async function inspectFile(file: File): Promise<MediaAsset> {
  if (file.size > 1024 * 1024 * 1024) throw new Error('O limite por arquivo é de 1 GB.');
  const kind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : file.type.startsWith('image/') ? 'image' : null;
  if (!kind) throw new Error(`Formato incompatível: ${file.name}. Importe vídeo, imagem, áudio ou legenda SRT.`);
  const url = URL.createObjectURL(file);
  try {
    const element = kind === 'image' ? new Image() : document.createElement(kind === 'video' ? 'video' : 'audio');
    const media = await new Promise<MediaAsset>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error(`A leitura de ${file.name} excedeu o tempo permitido.`)), 20000);
      element.addEventListener(kind === 'image' ? 'load' : 'loadedmetadata', () => {
        clearTimeout(timer);
        const width = element instanceof HTMLImageElement ? element.naturalWidth : element instanceof HTMLVideoElement ? element.videoWidth : 0;
        const height = element instanceof HTMLImageElement ? element.naturalHeight : element instanceof HTMLVideoElement ? element.videoHeight : 0;
        const duration = element instanceof HTMLMediaElement ? element.duration : 5;
        if (!Number.isFinite(duration) || duration <= 0) { reject(new Error('Não foi possível ler a duração desta mídia.')); return; }
        resolve({ id: crypto.randomUUID(), name: file.name, kind, url, duration, width, height });
      }, { once: true });
      element.addEventListener('error', () => { clearTimeout(timer); reject(new Error(`O navegador não consegue decodificar ${file.name}. Use MP4 H.264, WebM, MP3, WAV, PNG ou JPEG.`)); }, { once: true });
      if (element instanceof HTMLMediaElement) element.preload = 'metadata';
      element.src = url;
    });
    if (kind === 'image') media.thumbnail = url;
    if (element instanceof HTMLVideoElement) {
      element.preload = 'auto';
      await new Promise<void>(resolve => {
        const timer = window.setTimeout(resolve, 5000);
        element.addEventListener('loadeddata', () => { clearTimeout(timer); const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180; canvas.getContext('2d')?.drawImage(element, 0, 0, 320, 180); media.thumbnail = canvas.toDataURL('image/jpeg', .7); resolve(); }, { once: true });
      });
    }
    if (element instanceof HTMLMediaElement) { element.removeAttribute('src'); element.load(); }
    return media;
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}
export function parseSrt(text: string): { start: number; duration: number; text: string }[] {
  const seconds = (value: string) => { const parts = value.replace(',', '.').split(':').map(Number); return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0); };
  return text.trim().split(/\r?\n\s*\r?\n/).flatMap(block => {
    const lines = block.split(/\r?\n/); const index = lines.findIndex(line => line.includes('-->'));
    const times = lines[index]?.split('-->').map(t => seconds(t.trim()));
    if (!times || times.length !== 2) return [];
    const start = times[0] ?? 0, end = times[1] ?? 0;
    if (![start, end].every(Number.isFinite) || end <= start) return [];
    return [{ start, duration: end - start, text: lines.slice(index + 1).join('\n').replace(/<[^>]*>/g, '') }];
  });
}