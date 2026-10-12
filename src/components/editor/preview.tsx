import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { drawComposition, disposeResources, loadResources, syncMedia, type Resources } from '@/lib/compositor';
import { dimensions, type Project } from '@/lib/editor-model';

export function Preview({ project, time, playing, onError, onMove }: { project: Project; time: number; playing: boolean; onError: (e: string) => void; onMove: (x: number, y: number) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const resources = useRef<Resources>(new Map());
  const [loading, setLoading] = useState(false);
  const latest = useRef({ project, time, playing }); latest.current = { project, time, playing };
  const signature = project.media.map(m => `${m.id}:${m.url}`).join('|');
  useEffect(() => {
    let active = true;
    setLoading(true);
    loadResources(project).then(loaded => { if (!active) { disposeResources(loaded); return; } disposeResources(resources.current); resources.current = loaded; setLoading(false); }).catch(e => { if (active) { setLoading(false); onError(e instanceof Error ? e.message : 'Falha na pré-visualização.'); } });
    return () => { active = false; disposeResources(resources.current); };
  }, [signature]);
  useEffect(() => {
    let raf = 0;
    const render = () => { const state = latest.current; syncMedia(state.project, resources.current, state.time, state.playing); if (canvas.current) drawComposition(canvas.current, state.project, resources.current, state.time); raf = requestAnimationFrame(render); };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);
  const [w, h] = dimensions(project.aspect, 720);
  return <div className={`composition-wrap aspect-${project.aspect.replace(':', '-')}`}>
    <canvas ref={canvas} width={w} height={h} aria-label="Pré-visualização da composição" onPointerDown={e => {
      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      target.setPointerCapture(e.pointerId);
      const move = (event: PointerEvent) => onMove(Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)), Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)));
      const stop = () => { target.removeEventListener('pointermove', move); };
      target.addEventListener('pointermove', move); target.addEventListener('pointerup', stop, { once: true });
    }} />
    {loading && <span className="preview-loading"><LoaderCircle className="animate-spin" /></span>}
  </div>;
}