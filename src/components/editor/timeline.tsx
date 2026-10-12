import { useRef } from 'react';
import { Eye, Film, Layers, Mic, Music2, Type, Plus, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TRACKS, durationOf, timecode, type Clip, type Project } from '@/lib/editor-model';
const icons = [Type, Layers, Film, Music2, Mic];
export function Timeline({ project, time, zoom, selected, onSelect, onSeek, onUpdate, onAdd }: { project: Project; time: number; zoom: number; selected: string | null; onSelect: (id: string) => void; onSeek: (t: number) => void; onUpdate: (id: string, patch: Partial<Clip>) => void; onAdd: () => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const pps = zoom;
  const total = Math.max(20, durationOf(project) + 5);
  const width = total * pps;
  function drag(event: React.PointerEvent, clip: Clip, mode: 'move' | 'left' | 'right') {
    event.stopPropagation(); onSelect(clip.id);
    const target = event.currentTarget as HTMLElement; target.setPointerCapture(event.pointerId);
    const rowHeight = target.closest('.timeline-track')?.getBoundingClientRect().height ?? 59;
    const x = event.clientX, y = event.clientY;
    const original = { ...clip };
    let patch: Partial<Clip> = {};
    const move = (e: PointerEvent) => {
      const delta = (e.clientX - x) / pps;
      if (mode === 'move') patch = { start: Math.max(0, Math.round((original.start + delta) * 10) / 10), track: Math.max(0, Math.min(4, original.track + Math.round((e.clientY - y) / rowHeight))) };
      if (mode === 'right') {
        const media = project.media.find(m => m.id === clip.mediaId);
        const max = media && media.kind !== 'image' ? (media.duration - original.offset) / original.speed : 120;
        patch = { duration: Math.min(max, Math.max(.1, original.duration + delta)) };
      }
      if (mode === 'left') { const d = Math.max(-Math.min(original.start, original.offset / original.speed), Math.min(delta, original.duration - .1)); patch = { start: original.start + d, duration: original.duration - d, offset: original.offset + d * original.speed }; }
      const element = target as HTMLElement;
      if (mode === 'move') element.style.transform = `translate(${((patch.start ?? original.start) - original.start) * pps}px, ${((patch.track ?? original.track) - original.track) * rowHeight}px)`;
      else { const parent = element.parentElement; if (parent) { parent.style.width = `${(patch.duration ?? original.duration) * pps}px`; parent.style.left = `${(patch.start ?? original.start) * pps}px`; } }
    };
    const stop = () => { target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', stop); target.style.transform = ''; if (Object.keys(patch).length) onUpdate(clip.id, patch); };
    target.addEventListener('pointermove', move); target.addEventListener('pointerup', stop, { once: true }); target.addEventListener('pointercancel', stop, { once: true });
  }
  return <div className="timeline-body">
    <div className="track-labels"><div className="track-ruler-title">FAIXAS</div>{TRACKS.map((name, i) => { const Icon = icons[i] ?? Film; return <div className={`track-label ${i === 2 ? 'main-track' : ''}`} key={name}><Icon size={15} /><span>{name}</span><Eye size={12} className="track-eye" /></div>; })}<div className="track-label-footer"><LockKeyhole size={12} /><span>Composição</span></div></div>
    <div className="timeline-scroll" ref={scroller}><div className="timeline-content" style={{ width }}>
      <div className="time-ruler" onPointerDown={e => { const rect = e.currentTarget.getBoundingClientRect(); onSeek(Math.max(0, Math.min(durationOf(project), (e.clientX - rect.left) / pps))); }}>{Array.from({ length: Math.ceil(total / 2) + 1 }, (_, i) => <span key={i} style={{ left: i * 2 * pps }}>{timecode(i * 2).slice(0, 5)}</span>)}</div>
      {TRACKS.map((name, track) => <div className={`timeline-track ${track === 2 ? 'main-track' : ''}`} key={name} onDragOver={e => e.preventDefault()} onDrop={e => { const id = e.dataTransfer.getData('clip'); if (id) onUpdate(id, { track }); }}>
        {project.clips.filter(c => c.track === track).map(clip => { const asset = project.media.find(m => m.id === clip.mediaId); return <div key={clip.id} role="button" tabIndex={0} aria-label={`Clipe ${clip.name}`} aria-pressed={selected === clip.id} className={`timeline-clip clip-${clip.kind} ${selected === clip.id ? 'selected' : ''}`} style={{ left: clip.start * pps, width: Math.max(12, clip.duration * pps) }} onPointerDown={e => drag(e, clip, 'move')} onKeyDown={e => { if (e.key === 'Enter') onSelect(clip.id); }}>
          <span className="clip-trim left" onPointerDown={e => drag(e, clip, 'left')} />
          {asset?.thumbnail && <div className="clip-thumbnails">{Array.from({ length: Math.min(20, Math.ceil(clip.duration * pps / 76)) }, (_, i) => <img key={i} src={asset.thumbnail} alt="" />)}</div>}
          <span className="clip-caption">{clip.kind === 'text' ? <Type size={12} /> : clip.kind === 'audio' ? <Music2 size={12} /> : <Film size={12} />}{clip.kind === 'text' ? clip.text : clip.name}</span>
          {clip.kind === 'audio' && <div className="audio-clip-pattern" />}
          <span className="clip-trim right" onPointerDown={e => drag(e, clip, 'right')} />
        </div>; })}
        {track === 2 && !project.clips.some(c => c.track === 2) && <Button variant="ghost" size="sm" className="empty-track" onClick={onAdd}><Plus size={14} />Adicionar mídia</Button>}
      </div>)}
      <div className="playhead" style={{ left: time * pps }}><span /></div>
    </div></div>
  </div>;
}