import { dimensions, durationOf, validateProject, type Project, type Clip } from './editor-model';

export type Resources = Map<string, HTMLImageElement | HTMLVideoElement | HTMLAudioElement>;
export async function loadResources(project: Project): Promise<Resources> {
  const resources: Resources = new Map();
  await Promise.all(project.media.map(async media => {
    if (!media.url) throw new Error(`Mídia indisponível: ${media.name}`);
    const element = media.kind === 'image' ? new Image() : document.createElement(media.kind === 'video' ? 'video' : 'audio');
    element.crossOrigin = 'anonymous';
    if (element instanceof HTMLMediaElement) { element.preload = 'auto'; if (element instanceof HTMLVideoElement) element.playsInline = true; }
    await new Promise<void>((resolve, reject) => {
      element.addEventListener(media.kind === 'image' ? 'load' : 'loadeddata', () => resolve(), { once: true });
      element.addEventListener('error', () => reject(new Error(`Não foi possível abrir ${media.name}. Verifique o formato e importe novamente.`)), { once: true });
      element.src = media.url;
    });
    resources.set(media.id, element);
  }));
  return resources;
}
export function disposeResources(resources: Resources) {
  resources.forEach(e => { if (e instanceof HTMLMediaElement) { e.pause(); e.removeAttribute('src'); e.load(); } });
  resources.clear();
}
function gainAt(c: Clip, local: number) {
  const fadeIn = c.fadeIn > 0 ? Math.min(1, local / c.fadeIn) : 1;
  const fadeOut = c.fadeOut > 0 ? Math.min(1, (c.duration - local) / c.fadeOut) : 1;
  return Math.max(0, Math.min(fadeIn, fadeOut));
}
export function syncMedia(project: Project, resources: Resources, time: number, playing: boolean, gains?: Map<string, GainNode>) {
  resources.forEach((element, id) => {
    if (!(element instanceof HTMLMediaElement)) return;
    const clip = project.clips.find(c => c.mediaId === id && time >= c.start && time < c.start + c.duration);
    if (!clip) { element.pause(); const gain = gains?.get(id); if (gain) gain.gain.value = 0; return; }
    const local = time - clip.start;
    const target = Math.min(Math.max(0, element.duration - .01), clip.offset + local * clip.speed);
    if ((!playing && Math.abs(element.currentTime - target) > .015) || Math.abs(element.currentTime - target) > .2) element.currentTime = target;
    element.playbackRate = clip.speed;
    const volume = !project.audio || clip.muted ? 0 : Math.min(1, clip.volume * gainAt(clip, local));
    const gain = gains?.get(id);
    if (gain) { element.volume = 1; gain.gain.value = volume; } else element.volume = volume;
    if (playing) { if (element.paused) void element.play().catch(() => {}); } else element.pause();
  });
}
export function drawComposition(canvas: HTMLCanvasElement, project: Project, resources: Resources, time: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#08090b'; ctx.fillRect(0, 0, w, h);
  const active = project.clips.filter(c => c.kind !== 'audio' && time >= c.start && time < c.start + c.duration).sort((a, b) => b.track - a.track);
  for (const c of active) {
    ctx.save();
    const local = time - c.start;
    const animationGain = c.animation === 'none' ? 1 : Math.min(1, local / .6, (c.duration - local) / .4);
    ctx.globalAlpha = c.opacity / 100 * gainAt(c, local) * Math.max(0, animationGain);
    ctx.translate(w * c.x / 100, h * c.y / 100 + (c.animation === 'rise' ? (1 - animationGain) * h * .08 : 0));
    ctx.rotate(c.rotation * Math.PI / 180);
    ctx.scale((c.flip ? -1 : 1) * c.scale / 100, c.scale / 100);
    ctx.filter = `brightness(${c.brightness}%) contrast(${c.contrast}%) saturate(${c.saturation}%)`;
    if (c.kind === 'text') {
      ctx.filter = 'none'; ctx.fillStyle = c.color;
      ctx.font = `600 ${c.fontSize * h / 1080}px Manrope, sans-serif`;
      ctx.textAlign = c.align; ctx.textBaseline = 'middle';
      if (c.shadow) { ctx.shadowColor = '#000000a0'; ctx.shadowBlur = 12 * h / 1080; ctx.shadowOffsetY = 3; }
      const lines = c.text.split('\n');
      lines.forEach((line, i) => ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * c.fontSize * h / 1080 * 1.25, w * .9));
    } else if (c.kind === 'shape') {
      ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(0, 0, h * .12, 0, Math.PI * 2); ctx.fill();
    } else {
      const e = c.mediaId ? resources.get(c.mediaId) : undefined;
      if (e instanceof HTMLImageElement || e instanceof HTMLVideoElement) {
        const mw = e instanceof HTMLImageElement ? e.naturalWidth : e.videoWidth;
        const mh = e instanceof HTMLImageElement ? e.naturalHeight : e.videoHeight;
        if (mw && mh) { const scale = Math.min(w / mw, h / mh); ctx.drawImage(e, -mw * scale / 2, -mh * scale / 2, mw * scale, mh * scale); }
      }
    }
    ctx.restore();
  }
}

export async function exportComposition(project: Project, options: { resolution: 720 | 1080; fps: 30 | 60; audio: boolean; onProgress: (p: number) => void; signal: AbortSignal }): Promise<{ blob: Blob; extension: string }> {
  const error = validateProject(project); if (error) throw new Error(error);
  if (!window.MediaRecorder) throw new Error('Este navegador não oferece gravação de vídeo. Use uma versão atual do Chrome.');
  const formats = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus'];
  const mimeType = formats.find(f => MediaRecorder.isTypeSupported(f));
  if (!mimeType) throw new Error('Nenhum codificador de vídeo compatível está disponível neste navegador.');
  const resources = await loadResources(project);
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = dimensions(project.aspect, options.resolution);
  const stream = canvas.captureStream(options.fps);
  const audioContext = new AudioContext(); const destination = audioContext.createMediaStreamDestination();
  const gains = new Map<string, GainNode>();
  const edited = { ...project, audio: options.audio };
  let animation = 0;
  try {
    if (options.signal.aborted) throw new DOMException('Exportação cancelada.', 'AbortError');
    await audioContext.resume();
    if (options.audio) {
      resources.forEach((e, id) => { if (e instanceof HTMLMediaElement) { const source = audioContext.createMediaElementSource(e); const gain = audioContext.createGain(); gain.gain.value = 0; source.connect(gain).connect(destination); gains.set(id, gain); } });
      destination.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    }
    await document.fonts.ready;
    drawComposition(canvas, edited, resources, 0);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: options.resolution === 1080 ? 8_000_000 : 4_000_000 });
    const chunks: BlobPart[] = [];
    const total = durationOf(project);
    const blob = await new Promise<Blob>((resolve, reject) => {
      let failure: Error | null = null;
      const abort = () => { failure = new DOMException('Exportação cancelada.', 'AbortError'); if (recorder.state !== 'inactive') recorder.stop(); };
      const hidden = () => { if (document.hidden) { failure = new Error('A exportação foi interrompida porque a aba ficou em segundo plano. Mantenha o editor aberto.'); if (recorder.state !== 'inactive') recorder.stop(); } };
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onerror = () => { failure = new Error('O codificador falhou. Tente 720p e 30 FPS.'); if (recorder.state !== 'inactive') recorder.stop(); };
      recorder.onstop = () => { cancelAnimationFrame(animation); options.signal.removeEventListener('abort', abort); document.removeEventListener('visibilitychange', hidden); if (failure) reject(failure); else resolve(new Blob(chunks, { type: mimeType })); };
      options.signal.addEventListener('abort', abort, { once: true }); document.addEventListener('visibilitychange', hidden);
      recorder.start(500);
      const start = performance.now();
      const frame = () => {
        if (recorder.state === 'inactive') return;
        const time = (performance.now() - start) / 1000;
        try { syncMedia(edited, resources, time, true, gains); drawComposition(canvas, edited, resources, time); } catch (e) { failure = e instanceof Error ? e : new Error('Falha ao compor o vídeo.'); recorder.stop(); return; }
        options.onProgress(Math.min(98, time / total * 98));
        if (time >= total) recorder.stop(); else animation = requestAnimationFrame(frame);
      };
      animation = requestAnimationFrame(frame);
    });
    if (blob.size < 1000) throw new Error('O vídeo gerado está vazio ou inválido.');
    const url = URL.createObjectURL(blob);
    try {
      await new Promise<void>((resolve, reject) => {
        const video = document.createElement('video'); video.preload = 'auto';
        const timer = window.setTimeout(() => { video.removeAttribute('src'); reject(new Error('Não foi possível validar o arquivo exportado.')); }, 15000);
        video.onloadeddata = () => { clearTimeout(timer); if (!video.videoWidth || !video.videoHeight) reject(new Error('O arquivo exportado não contém vídeo válido.')); else resolve(); video.removeAttribute('src'); video.load(); };
        video.onerror = () => { clearTimeout(timer); reject(new Error('O arquivo exportado não pode ser reproduzido.')); };
        video.src = url;
      });
    } finally { URL.revokeObjectURL(url); }
    options.onProgress(100);
    return { blob, extension: mimeType.startsWith('video/mp4') ? 'mp4' : 'webm' };
  } finally { cancelAnimationFrame(animation); stream.getTracks().forEach(t => t.stop()); disposeResources(resources); await audioContext.close(); }
}