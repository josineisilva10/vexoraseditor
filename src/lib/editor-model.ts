export type MediaKind = 'video' | 'image' | 'audio';
export type Aspect = '16:9' | '9:16' | '1:1' | '4:5';
export type MediaAsset = { id: string; name: string; kind: MediaKind; url: string; duration: number; width: number; height: number; path?: string; thumbnail?: string; sample?: boolean };
export type Clip = { id: string; mediaId?: string; kind: MediaKind | 'text' | 'shape'; name: string; track: number; start: number; duration: number; offset: number; speed: number; volume: number; muted: boolean; scale: number; x: number; y: number; rotation: number; flip: boolean; opacity: number; brightness: number; contrast: number; saturation: number; fadeIn: number; fadeOut: number; text: string; fontSize: number; color: string; align: CanvasTextAlign; shadow: boolean; animation: 'none' | 'fade' | 'rise'; };
export type Project = { id: string; name: string; aspect: Aspect; resolution: 720 | 1080; fps: 30 | 60; audio: boolean; media: MediaAsset[]; clips: Clip[]; updatedAt?: string; };
export const TRACKS = ['Texto e elementos', 'Sobreposição', 'Vídeo principal', 'Música e efeitos', 'Narração'];
export const DEFAULT_TEXT_COLOR = '#ffffff';
export const TEXT_COLORS = ['#ffffff', '#36d6b5', '#ffcb6b', '#f27d9d', '#141519'];
export function createProject(): Project {
  return { id: crypto.randomUUID(), name: 'Projeto sem título', aspect: '16:9', resolution: 1080, fps: 30, audio: true, media: [], clips: [] };
}
export function createClip(kind: Clip['kind'], name: string, start = 0): Clip {
  return { id: crypto.randomUUID(), kind, name, track: kind === 'audio' ? 3 : kind === 'text' || kind === 'shape' ? 0 : 2, start, duration: 5, offset: 0, speed: 1, volume: 1, muted: false, scale: 100, x: 50, y: 50, rotation: 0, flip: false, opacity: 100, brightness: 100, contrast: 100, saturation: 100, fadeIn: 0, fadeOut: 0, text: 'Seu texto aqui', fontSize: 64, color: DEFAULT_TEXT_COLOR, align: 'center', shadow: true, animation: 'none' };
}
export function addMediaClip(media: MediaAsset, start = 0): Clip {
  return { ...createClip(media.kind, media.name, start), mediaId: media.id, duration: media.kind === 'image' ? 5 : media.duration };
}
export function durationOf(project: Project) { return Math.max(0, ...project.clips.map(c => c.start + c.duration)); }
export function dimensions(aspect: Aspect, resolution: number): [number, number] {
  const [w = 16, h = 9] = aspect.split(':').map(Number);
  return w >= h ? [Math.round(resolution * w / h / 2) * 2, resolution] : [resolution, Math.round(resolution * h / w / 2) * 2];
}
export function timecode(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60).toString().padStart(2, '0')}:${Math.floor(safe % 60).toString().padStart(2, '0')}.${Math.floor((safe % 1) * 100).toString().padStart(2, '0')}`;
}
export function splitClip(clips: Clip[], id: string, at: number): Clip[] {
  return clips.flatMap(c => {
    if (c.id !== id || at <= c.start + .05 || at >= c.start + c.duration - .05) return [c];
    const leftDuration = at - c.start;
    return [{ ...c, duration: leftDuration }, { ...c, id: crypto.randomUUID(), start: at, duration: c.duration - leftDuration, offset: c.offset + leftDuration * c.speed }];
  });
}
export function serializeProject(project: Project) {
  return { ...project, media: project.media.map(({ url, thumbnail, ...asset }) => asset) };
}
export function validateProject(project: Project): string | null {
  if (!project.clips.length) return 'Adicione pelo menos um clipe à linha do tempo.';
  if (durationOf(project) > 120) return 'A exportação no navegador suporta até 2 minutos. Projetos maiores precisam do serviço de renderização.';
  for (const c of project.clips) {
    if (![c.start, c.duration, c.offset, c.speed].every(Number.isFinite) || c.start < 0 || c.duration <= 0 || c.speed <= 0) return 'Há um clipe com tempos inválidos.';
    if (c.mediaId && !project.media.some(m => m.id === c.mediaId && m.url)) return `A mídia de ${c.name} não está disponível.`;
  }
  return null;
}