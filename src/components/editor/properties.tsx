import { RotateCcw, FlipHorizontal, Video, SlidersHorizontal, WandSparkles, ChevronDown, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { TEXT_COLORS, type Clip } from '@/lib/editor-model';

export function Properties({ clip, onUpdate, tab, onTab, onAI }: { clip: Clip | undefined; onUpdate: (patch: Partial<Clip>) => void; tab: string; onTab: (tab: string) => void; onAI: () => void }) {
  const numeric = (label: string, key: keyof Clip, min: number, max: number, suffix = '', step = 1) => <div className="property-control" key={key}><div className="property-label"><label>{label}</label><span>{typeof clip?.[key] === 'number' ? Number(clip[key]).toFixed(step < 1 ? 1 : 0) : 0}{suffix}</span></div><Slider aria-label={label} value={[typeof clip?.[key] === 'number' ? Number(clip[key]) : 0]} min={min} max={max} step={step} onValueChange={([v]) => { if (v !== undefined) onUpdate({ [key]: v }); }} /></div>;
  return <aside className="properties-panel">
    <div className="properties-tabs">{[['Básico', Video], ['Ajustes', SlidersHorizontal], ['IA', WandSparkles]].map(([name, Icon]) => { const I = Icon as typeof Video; return <Button key={String(name)} variant="ghost" size="sm" className={tab === name ? 'active' : ''} onClick={() => onTab(String(name))}><I size={14} />{String(name)}</Button>; })}</div>
    <div className="properties-scroll">
      <div className="property-heading"><span>{clip ? clip.kind === 'text' ? 'Texto' : clip.kind === 'audio' ? 'Áudio' : 'Transformação' : 'Propriedades'}</span><ChevronDown size={14} /></div>
      {!clip ? <div className="no-selection"><SlidersHorizontal size={30} /><p>Nenhum clipe selecionado</p></div> : tab === 'IA' ? <div className="ai-property"><WandSparkles size={28} /><h3>Remover fundo</h3><p>Configure o serviço de IA para ativar este recurso</p><Button variant="outline" onClick={onAI}>Ver configuração</Button></div> : tab === 'Ajustes' ? <>
        {numeric('Brilho', 'brightness', 0, 200, '%')}{numeric('Contraste', 'contrast', 0, 200, '%')}{numeric('Saturação', 'saturation', 0, 200, '%')}
        <Button variant="outline" size="sm" className="w-full" onClick={() => onUpdate({ brightness: 100, contrast: 100, saturation: 100 })}><RotateCcw />Restaurar ajustes</Button>
      </> : <>
        {clip.kind === 'text' && <div className="text-properties"><textarea aria-label="Conteúdo do texto" value={clip.text} onChange={e => onUpdate({ text: e.target.value, name: e.target.value })} />{numeric('Tamanho', 'fontSize', 16, 200, ' px')}<div className="color-swatches">{TEXT_COLORS.map((color, i) => <Button key={color} aria-label={`Cor ${i + 1}`} size="icon" variant="ghost" className={`swatch swatch-${i} ${clip.color === color ? 'selected' : ''}`} onClick={() => onUpdate({ color })} />)}</div><div className="property-toggle"><span>Sombra</span><Switch checked={clip.shadow} onCheckedChange={v => onUpdate({ shadow: v })} /></div></div>}
        {clip.kind !== 'audio' && <>
          {numeric('Escala', 'scale', 10, 250, '%')}
          <div className="property-pair"><label>Posição</label><div><span>X</span><input aria-label="Posição X" type="number" min={0} max={100} value={clip.x} onChange={e => onUpdate({ x: Math.max(0, Math.min(100, Number(e.target.value))) })} /><span>Y</span><input aria-label="Posição Y" type="number" min={0} max={100} value={clip.y} onChange={e => onUpdate({ y: Math.max(0, Math.min(100, Number(e.target.value))) })} /></div></div>
          {numeric('Rotação', 'rotation', -180, 180, '°')}
          <div className="property-toggle"><span>Espelhar</span><Button variant="outline" size="icon" aria-label="Espelhar horizontalmente" className={clip.flip ? 'active' : ''} onClick={() => onUpdate({ flip: !clip.flip })}><FlipHorizontal /></Button></div>
          <div className="property-divider" /><div className="property-heading"><span>Composição</span><ChevronDown size={14} /></div>
          {numeric('Opacidade', 'opacity', 0, 100, '%')}
          <div className="property-select"><label>Animação</label><select aria-label="Animação" value={clip.animation} onChange={e => onUpdate({ animation: e.target.value as Clip['animation'] })}><option value="none">Nenhuma</option><option value="fade">Fade</option><option value="rise">Subir suavemente</option></select></div>
        </>}
        {(clip.kind === 'video' || clip.kind === 'audio') && <><div className="property-divider" /><div className="property-heading"><span>Áudio e velocidade</span><ChevronDown size={14} /></div>{numeric('Volume', 'volume', 0, 1, '', .01)}<div className="property-toggle"><span>Silenciar</span><Switch checked={clip.muted} onCheckedChange={v => onUpdate({ muted: v })} /></div>{numeric('Velocidade', 'speed', .25, 4, '×', .25)}</>}
        <div className="property-divider" /><div className="property-heading"><span>Entrada e saída</span><ChevronDown size={14} /></div>{numeric('Fade de entrada', 'fadeIn', 0, Math.min(5, clip.duration / 2), ' s', .1)}{numeric('Fade de saída', 'fadeOut', 0, Math.min(5, clip.duration / 2), ' s', .1)}
        <Button variant="ghost" size="sm" className="reset-properties" onClick={() => onUpdate({ scale: 100, x: 50, y: 50, rotation: 0, flip: false, opacity: 100 })}><RotateCcw size={13} />Restaurar transformação</Button>
      </>}
    </div><div className="properties-bottom"><span>{clip ? clip.name : 'Studio Video AI'}</span><Type size={13} /></div>
  </aside>;
}