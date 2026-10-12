import { useCallback, useEffect, useRef, useState } from 'react';
import { Film, Music2, Type, Shapes, Sparkles, ArrowRightLeft, WandSparkles, FolderOpen, Undo2, Redo2, Cloud, Download, ChevronDown, Plus, Search, Upload, Play, Pause, SkipBack, SkipForward, Maximize, Volume2, Scissors, Copy, Trash2, ZoomIn, ZoomOut, Magnet, Layers, Settings2, HelpCircle, X, Check, LoaderCircle, AlertCircle, LogOut, Circle, Captions, RotateCcw, Sun, Contrast, ImagePlus, CheckCircle2, Save, PanelRight, FolderPlus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import type { User } from '@supabase/supabase-js';
import { addMediaClip, createClip, createProject, durationOf, splitClip, timecode, validateProject, type Aspect, type Clip, type MediaAsset, type Project } from '@/lib/editor-model';
import { inspectFile, parseSrt } from '@/lib/media-import';
import { saveProject, listProjects, hydrateProject, uploadMedia } from '@/lib/editor-cloud';
import { exportComposition } from '@/lib/compositor';
import { Preview } from './preview';
import { Timeline } from './timeline';
import { Properties } from './properties';
import alpineImage from '@/assets/alpine-example.jpg';

const tools = [{ name: 'Mídia', icon: Film }, { name: 'Áudio', icon: Music2 }, { name: 'Texto', icon: Type }, { name: 'Elementos', icon: Shapes }, { name: 'Efeitos', icon: Sparkles }, { name: 'Transições', icon: ArrowRightLeft }, { name: 'Ferramentas IA', icon: WandSparkles }];
type SavedRow = Awaited<ReturnType<typeof listProjects>>[number];
function IconButton({ icon: Icon, label, onClick, disabled, className = '' }: { icon: typeof Film; label: string; onClick: () => void; disabled?: boolean; className?: string }) { return <Button variant="ghost" size="icon" title={label} aria-label={label} onClick={onClick} disabled={disabled ?? false} className={className}><Icon size={16} /></Button>; }
function makeExample(): Project {
  const p = createProject();
  const asset: MediaAsset = { id: crypto.randomUUID(), name: 'Paisagem alpina.jpg', kind: 'image', url: alpineImage, thumbnail: alpineImage, duration: 5, width: 1536, height: 1024, sample: true };
  return { ...p, name: 'Paisagem alpina · exemplo', media: [asset], clips: [{ ...addMediaClip(asset), duration: 10, scale: 120 }, { ...createClip('text', 'ALÉM DO HORIZONTE', 1), duration: 7, text: 'ALÉM DO HORIZONTE', fontSize: 63, y: 78, animation: 'fade' }] };
}

export function Editor() {
  const [project, setProject] = useState<Project>({ id: '', name: 'Paisagem alpina · exemplo', aspect: '16:9', resolution: 1080, fps: 30, audio: true, clips: [], media: [] });
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [tool, setTool] = useState('Mídia');
  const [mobilePanel, setMobilePanel] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [propertyTab, setPropertyTab] = useState('Básico');
  const [selected, setSelected] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(42);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('Exemplo não salvo');
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<'auth' | 'projects' | 'export' | 'ai' | 'settings' | 'help' | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [rows, setRows] = useState<SavedRow[]>([]);
  const [history, setHistory] = useState<Project[]>([]);
  const [future, setFuture] = useState<Project[]>([]);
  const [upload, setUpload] = useState<{ name: string; progress: number } | null>(null);
  const [exportName, setExportName] = useState('meu-video');
  const [exportResolution, setExportResolution] = useState<720 | 1080>(720);
  const [exportFps, setExportFps] = useState<30 | 60>(30);
  const [exportAudio, setExportAudio] = useState(true);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportResult, setExportResult] = useState<{ url: string; extension: string } | null>(null);
  const [exportError, setExportError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SavedRow | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const projectRef = useRef(project); projectRef.current = project;
  const uploadController = useRef<AbortController | null>(null);
  const exportController = useRef<AbortController | null>(null);
  const savedVersion = useRef('');
  const requestVersion = useRef(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const owner = useRef<string | null>(null);
  const currentClip = project.clips.find(c => c.id === selected);
  const total = durationOf(project);
  const fail = useCallback((e: unknown) => setError(e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : String(e)), []);

  useEffect(() => {
    const example = makeExample(); setProject(example); setSelected(example.clips[0]?.id ?? null); setReady(true);
    let active = true;
    supabase.auth.getUser().then(({ data }) => { if (active) setUser(data.user); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => { if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') setUser(session?.user ?? null); });
    return () => { active = false; data.subscription.unsubscribe(); uploadController.current?.abort(); exportController.current?.abort(); };
  }, []);

  useEffect(() => {
    if (!user) { if (owner.current) { setProject(makeExample()); setHistory([]); setFuture([]); setTime(0); setPlaying(false); } owner.current = null; savedVersion.current = ''; setSaveStatus('Entre para salvar'); return; }
    if (owner.current === user.id) return;
    owner.current = user.id;
    setSaveStatus('Abrindo seus projetos…');
    let active = true;
    listProjects().then(async projects => { if (!active) return; setRows(projects); if (projects[0]) { const loaded = await hydrateProject(projects[0].composition, alpineImage); if (!active) return; savedVersion.current = JSON.stringify(loaded); setProject(loaded); setSelected(loaded.clips[0]?.id ?? null); setHistory([]); setFuture([]); setTime(0); setSaveStatus('Salvo na nuvem'); } else { const blank = createProject(); setProject(blank); setSelected(null); } }).catch(fail);
    return () => { active = false; };
  }, [user?.id, fail]);

  const persist = useCallback(async (p: Project, u: User) => {
    const signature = JSON.stringify(p);
    if (savedVersion.current === signature) return;
    const version = ++requestVersion.current;
    setSaveStatus('Salvando…');
    const operation = saveQueue.current.catch(() => {}).then(async () => { await saveProject(p, u.id); if (version === requestVersion.current && owner.current === u.id) { savedVersion.current = signature; setSaveStatus('Salvo na nuvem'); } });
    saveQueue.current = operation;
    await operation;
  }, []);
  useEffect(() => {
    if (!ready || !user || !project.id || owner.current !== user.id) return;
    if (JSON.stringify(project) === savedVersion.current) return;
    setSaveStatus('Alterações não salvas');
    const timer = setTimeout(() => { void persist(project, user).catch(e => { setSaveStatus('Falha ao salvar'); fail(e); }); }, 1200);
    return () => clearTimeout(timer);
  }, [project, user?.id, ready, persist, fail]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => { if (exportController.current || uploadController.current || (user && JSON.stringify(projectRef.current) !== savedVersion.current)) { e.preventDefault(); } };
    window.addEventListener('beforeunload', guard); return () => window.removeEventListener('beforeunload', guard);
  }, [user]);

  function edit(transform: (p: Project) => Project) {
    if (exportProgress !== null) return;
    const previous = projectRef.current;
    const next = transform(previous);
    projectRef.current = next;
    setHistory(h => [...h.slice(-49), previous]); setFuture([]); setProject(next);
  }
  const updateClip = (id: string, patch: Partial<Clip>) => edit(p => ({ ...p, clips: p.clips.map(c => c.id === id ? { ...c, ...patch, ...(patch.speed !== undefined ? { duration: c.duration * c.speed / patch.speed } : {}) } : c) }));
  function undo() { const previous = history.at(-1); if (!previous || exportProgress !== null) return; setFuture(f => [project, ...f]); setProject(previous); setHistory(h => h.slice(0, -1)); }
  function redo() { const next = future[0]; if (!next || exportProgress !== null) return; setHistory(h => [...h, project]); setProject(next); setFuture(f => f.slice(1)); }
  function split() { if (!selected) return; const result = splitClip(project.clips, selected, time); if (result.length === project.clips.length) { setError('Posicione o indicador dentro do clipe para dividir.'); return; } edit(p => ({ ...p, clips: result })); }
  function removeClip() { if (!selected) return; edit(p => ({ ...p, clips: p.clips.filter(c => c.id !== selected) })); setSelected(null); }
  function duplicateClip() { if (!currentClip) return; const clip = { ...currentClip, id: crypto.randomUUID(), start: currentClip.start + currentClip.duration }; edit(p => ({ ...p, clips: [...p.clips, clip] })); setSelected(clip.id); }
  function addAsset(asset: MediaAsset) { const clip = addMediaClip(asset, time); if (project.clips.some(c => c.track === 2 && c.start <= time && c.start + c.duration > time) && asset.kind !== 'audio') clip.track = 1; edit(p => ({ ...p, clips: [...p.clips, clip] })); setSelected(clip.id); setMobilePanel(false); }
  function addText(text = 'Seu texto aqui', fontSize = 64) { const clip = { ...createClip('text', text, time), text, fontSize }; edit(p => ({ ...p, clips: [...p.clips, clip] })); setSelected(clip.id); setMobilePanel(false); setPropertyTab('Básico'); setPropertiesOpen(true); }
  const seek = (t: number) => { setTime(Math.max(0, Math.min(total, t))); };
  function togglePlay() { if (!total) return; if (!playing && time >= total) setTime(0); setPlaying(v => !v); }
  useEffect(() => {
    if (!playing) return;
    let raf = 0; const start = performance.now(); const initial = time;
    const frame = () => { const t = initial + (performance.now() - start) / 1000; if (t >= total) { setTime(total); setPlaying(false); } else { setTime(t); raf = requestAnimationFrame(frame); } };
    raf = requestAnimationFrame(frame); return () => cancelAnimationFrame(raf);
  }, [playing, total]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { const target = e.target; if (target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) || modal) return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeClip(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (user) void persist(project, user).catch(fail); else setModal('auth'); }
      if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) split();
      if (e.key === 'ArrowRight') seek(time + 1 / project.fps);
      if (e.key === 'ArrowLeft') seek(time - 1 / project.fps);
    }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  });

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(''); setPlaying(false);
    const controller = new AbortController(); uploadController.current = controller;
    try {
      if (user) await persist(projectRef.current, user);
      for (const file of Array.from(files)) {
        if (controller.signal.aborted) break;
        if (file.name.toLowerCase().endsWith('.srt')) {
          if (file.size > 2 * 1024 * 1024) throw new Error('O limite de legendas é 2 MB.');
          const captions = parseSrt(await file.text()); if (!captions.length) throw new Error('Nenhuma legenda SRT válida foi encontrada.');
          const clips = captions.map(c => ({ ...createClip('text', c.text, c.start), text: c.text, duration: c.duration, y: 85, fontSize: 44 })); edit(p => ({ ...p, clips: [...p.clips, ...clips] })); continue;
        }
        setUpload({ name: file.name, progress: 0 });
        let asset = await inspectFile(file);
        if (user) asset = await uploadMedia(file, asset, projectRef.current, user.id, progress => setUpload({ name: file.name, progress }), controller.signal);
        edit(p => ({ ...p, media: [...p.media, asset] }));
      }
    } catch (e) { fail(e); } finally { setUpload(null); uploadController.current = null; if (input.current) input.current.value = ''; }
  }
  async function refreshProjects() { if (!user) { setModal('auth'); return; } setBusy(true); try { await persist(project, user); setRows(await listProjects()); setModal('projects'); } catch (e) { fail(e); } finally { setBusy(false); } }
  async function openProject(row: SavedRow) { setBusy(true); try { if (user) await persist(project, user); const p = await hydrateProject(row.composition, alpineImage); setProject(p); savedVersion.current = JSON.stringify(p); setHistory([]); setFuture([]); setTime(0); setPlaying(false); setSelected(p.clips[0]?.id ?? null); setSaveStatus('Salvo na nuvem'); setModal(null); } catch (e) { fail(e); } finally { setBusy(false); } }
  async function newProject() { if (!user && project.media.some(m => !m.sample) && !window.confirm('Este projeto ainda não foi salvo. Criar um novo projeto?')) return; if (user) { try { await persist(project, user); } catch (e) { fail(e); return; } } const p = createProject(); setProject(p); setHistory([]); setFuture([]); setSelected(null); setTime(0); setPlaying(false); setModal(null); }
  async function duplicateProject(row: SavedRow) { if (!user) return; setBusy(true); try { const p = await hydrateProject(row.composition, alpineImage); p.id = crypto.randomUUID(); p.name += ' · cópia'; await saveProject(p, user.id); setRows(await listProjects()); } catch (e) { fail(e); } finally { setBusy(false); } }
  async function deleteProject(row: SavedRow) { setBusy(true); try { const { error: e } = await supabase.from('video_projects').delete().eq('id', row.id); if (e) throw e; setRows(await listProjects()); if (project.id === row.id) { setProject(createProject()); setSelected(null); setHistory([]); setFuture([]); } setDeleteTarget(null); } catch (e) { fail(e); } finally { setBusy(false); } }
  async function authenticate() { setBusy(true); setAuthMessage(''); try {
    if (authMode === 'reset') { const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }); if (e) throw e; setAuthMessage('Confira seu e-mail para redefinir a senha.'); }
    else if (authMode === 'signup') { const { data, error: e } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } }); if (e) throw e; if (data.session) { setModal(null); setPassword(''); } else setAuthMessage('Confira seu e-mail e confirme sua conta antes de entrar.'); }
    else { const { error: e } = await supabase.auth.signInWithPassword({ email, password }); if (e) throw e; setModal(null); setPassword(''); }
  } catch (e) { setAuthMessage(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); } }
  async function googleLogin() { setBusy(true); setAuthMessage(''); try { const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin }); if (result.error) throw result.error; if (!result.redirected) setModal(null); } catch (e) { setAuthMessage(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); } }
  function openExport() { setPlaying(false); setExportError(''); setExportName(project.name.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'meu-video'); setModal('export'); }
  async function doExport() {
    const validation = validateProject(project); if (validation) { setExportError(validation); return; }
    setPlaying(false); setExportError(''); setExportProgress(0);
    if (exportResult) URL.revokeObjectURL(exportResult.url); setExportResult(null);
    const controller = new AbortController(); exportController.current = controller;
    try { const result = await exportComposition(project, { resolution: exportResolution, fps: exportFps, audio: exportAudio, onProgress: setExportProgress, signal: controller.signal }); setExportResult({ url: URL.createObjectURL(result.blob), extension: result.extension }); }
    catch (e) { setExportError(e instanceof Error ? e.message : String(e)); }
    finally { exportController.current = null; setExportProgress(null); }
  }
  function downloadExport() { if (!exportResult) return; const a = document.createElement('a'); a.href = exportResult.url; a.download = `${exportName || 'meu-video'}.${exportResult.extension}`; a.click(); }
  const filteredMedia = project.media.filter(m => (!search || m.name.toLowerCase().includes(search.toLowerCase())) && (filter === 'Todos' || filter === 'Vídeos' && m.kind === 'video' || filter === 'Imagens' && m.kind === 'image' || filter === 'Áudio' && m.kind === 'audio'));

  return <main className="studio">
    <input type="file" ref={input} hidden multiple accept="video/*,audio/*,image/*,.srt" onChange={e => void importFiles(e.target.files)} />
    <header className="studio-header">
      <div className="studio-brand"><span className="studio-logo"><Film size={20} strokeWidth={2.2} /></span>Studio Video <em>AI</em></div>
      <div className="header-divider" />
      <div className="header-project"><input className="project-name" aria-label="Nome do projeto" value={project.name} onChange={e => edit(p => ({ ...p, name: e.target.value }))} /><IconButton icon={ChevronDown} label="Configurações do projeto" onClick={() => setModal('settings')} /><span className="header-save"><Cloud size={13} />{saveStatus}</span></div>
      <div className="header-actions"><IconButton icon={FolderOpen} label="Meus projetos" onClick={() => void refreshProjects()} className="project-list-button" /><Button variant="outline" size="sm" className="header-save-button" onClick={() => { if (user) void persist(project, user).catch(fail); else setModal('auth'); }}><Cloud size={14} /><span className="save-label">Salvar</span></Button><Button size="sm" className="export-button" onClick={openExport}><Download size={14} />Exportar<ChevronDown size={12} /></Button><Button variant="ghost" size="icon" className="profile-button" aria-label={user ? 'Minha conta' : 'Entrar na conta'} title={user ? 'Minha conta' : 'Entrar na conta'} onClick={() => setModal('auth')}>{user ? user.email?.slice(0, 2).toUpperCase() : 'SV'}</Button></div>
    </header>
    {error && <div className="error-banner" role="alert"><AlertCircle size={15} /><span>{error}</span><IconButton icon={X} label="Fechar aviso" onClick={() => setError('')} /></div>}
    <div className="editor-workspace">
      <nav className="tool-rail" aria-label="Ferramentas de edição">{tools.map(t => <Button variant="ghost" key={t.name} className={tool === t.name ? 'active' : ''} onClick={() => { setTool(t.name); setMobilePanel(tool === t.name ? !mobilePanel : true); setPropertiesOpen(false); }}><t.icon /><span>{t.name === 'Ferramentas IA' ? 'Ferramentas IA' : t.name}</span></Button>)}<div className="rail-bottom"><Button variant="ghost" title="Ajuda" onClick={() => setModal('help')}><HelpCircle /><span>Ajuda</span></Button></div></nav>
      <aside className={`media-panel ${mobilePanel ? 'mobile-open' : ''}`}>
        <div className="panel-title">{tool === 'Mídia' ? 'Biblioteca de mídia' : tool}<span>{tool === 'Mídia' ? `${project.media.length} arquivo${project.media.length === 1 ? '' : 's'}` : ''}</span></div>
        <div className="media-inner">
          {(tool === 'Mídia' || tool === 'Áudio') && <><Button className="import-button" onClick={() => input.current?.click()} disabled={upload !== null}><Upload size={14} />{tool === 'Áudio' ? 'Importar áudio' : 'Importar arquivos'}<Plus size={13} className="ml-auto" /></Button>
            {upload && <div className="upload-progress"><div><span>{upload.name}</span><IconButton icon={X} label="Cancelar upload" onClick={() => uploadController.current?.abort()} /></div><progress value={upload.progress} max={100} /><span>{user ? `Upload: ${Math.floor(upload.progress)}%` : 'Lendo arquivo…'}</span></div>}
            <div className="media-search"><Search size={13} /><input aria-label="Buscar mídia" placeholder="Buscar na biblioteca" value={search} onChange={e => setSearch(e.target.value)} /></div>
            {tool === 'Mídia' && <div className="media-filter">{['Todos', 'Vídeos', 'Imagens', 'Áudio'].map(f => <Button variant="ghost" key={f} size="sm" className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f}</Button>)}</div>}
            <div className="media-grid">{filteredMedia.filter(m => tool !== 'Áudio' || m.kind === 'audio').map(asset => <div className="media-item" key={asset.id} draggable onDragStart={e => e.dataTransfer.setData('media', asset.id)} onDoubleClick={() => addAsset(asset)}>
              <div className="media-thumb">{asset.thumbnail ? <img src={asset.thumbnail} alt={asset.name} loading="lazy" /> : asset.kind === 'audio' ? <Music2 size={27} /> : <Film size={27} />}<span className="media-duration">{asset.kind === 'image' ? 'IMG' : timecode(asset.duration).slice(0, 5)}</span><Button variant="ghost" size="icon" className="media-add" aria-label={`Adicionar ${asset.name} à timeline`} title="Adicionar à timeline" onClick={() => addAsset(asset)}><Plus size={12} /></Button></div><div className="media-name">{asset.name}</div><div className="media-meta">{asset.kind === 'audio' ? 'Áudio' : `${asset.width} × ${asset.height}`}{asset.sample && <span className="sample-label"> · Exemplo</span>}</div>
            </div>)}</div>
            {!filteredMedia.filter(m => tool !== 'Áudio' || m.kind === 'audio').length && <p className="media-empty">{tool === 'Áudio' ? 'Nenhum áudio importado' : 'Sua biblioteca está vazia'}</p>}
          </>}
          {tool === 'Texto' && <div className="tool-content"><Button className="import-button" onClick={() => addText()}><Plus />Adicionar texto</Button><h3>ESTILOS DE TEXTO</h3><Button variant="ghost" className="text-preset" onClick={() => addText('Seu título', 90)}>Seu título</Button><Button variant="ghost" className="text-preset small" onClick={() => addText('Uma história para contar', 42)}>Uma história para contar</Button><Button variant="outline" onClick={() => input.current?.click()}><Captions />Importar legendas SRT</Button></div>}
          {tool === 'Elementos' && <div className="tool-content"><h3>FORMAS</h3><div className="effect-buttons"><Button variant="ghost" onClick={() => { const c = createClip('shape', 'Círculo', time); edit(p => ({ ...p, clips: [...p.clips, c] })); setSelected(c.id); }}><Circle />Círculo</Button><Button variant="ghost" onClick={() => input.current?.click()}><ImagePlus />Importar imagem</Button></div></div>}
          {tool === 'Efeitos' && <div className="tool-content"><h3>AJUSTES VISUAIS</h3><div className="effect-buttons">{[{ label: 'Preto e branco', icon: Contrast, patch: { saturation: 0 } }, { label: 'Luminoso', icon: Sun, patch: { brightness: 120, contrast: 105 } }, { label: 'Intenso', icon: Sparkles, patch: { saturation: 130, contrast: 115 } }, { label: 'Original', icon: RotateCcw, patch: { brightness: 100, contrast: 100, saturation: 100 } }].map(effect => <Button key={effect.label} variant="ghost" disabled={!currentClip || currentClip.kind === 'audio'} onClick={() => { if (selected) updateClip(selected, effect.patch); }}><effect.icon />{effect.label}</Button>)}</div></div>}
          {tool === 'Transições' && <div className="tool-content"><h3>FADE DO CLIPE SELECIONADO</h3><Button variant="outline" disabled={!currentClip} onClick={() => { if (selected) updateClip(selected, { fadeIn: .6 }); }}>Fade de entrada</Button><Button variant="outline" disabled={!currentClip} onClick={() => { if (selected) updateClip(selected, { fadeOut: .6 }); }}>Fade de saída</Button><Button variant="ghost" disabled={!currentClip} onClick={() => { if (selected) updateClip(selected, { fadeIn: 0, fadeOut: 0 }); }}>Remover fades</Button></div>}
          {tool === 'Ferramentas IA' && <div className="ai-property"><WandSparkles size={30} /><h3>Remover fundo</h3><p>Configure o serviço de IA para ativar este recurso</p><Button variant="outline" onClick={() => setModal('ai')}>Ver configuração</Button></div>}
        </div><div className="media-footer"><Cloud size={13} />{user ? 'Arquivos privados na nuvem' : 'Entre para salvar seus arquivos'}</div>
      </aside>
      <section className="stage-panel" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const asset = project.media.find(m => m.id === e.dataTransfer.getData('media')); if (asset) addAsset(asset); else if (e.dataTransfer.files.length) void importFiles(e.dataTransfer.files); }}>
        <div className="stage-top"><span>Pré-visualização</span><div className="stage-top-right"><span>{project.resolution}p · {project.fps} FPS</span><select aria-label="Proporção" value={project.aspect} onChange={e => edit(p => ({ ...p, aspect: e.target.value as Aspect }))}>{['16:9', '9:16', '1:1', '4:5'].map(a => <option key={a}>{a}</option>)}</select><IconButton icon={PanelRight} label="Propriedades do clipe" className="mobile-properties-button" onClick={() => { setPropertiesOpen(!propertiesOpen); setMobilePanel(false); }} /></div></div>
        <div className="stage-center">{ready && <Preview project={project} time={time} playing={playing} onError={fail} onMove={(x, y) => { if (selected && currentClip?.kind !== 'audio') updateClip(selected, { x: Math.round(x), y: Math.round(y) }); }} />}</div>
        <div className="player-controls"><span className="player-time"><strong>{timecode(time)}</strong><span> / {timecode(total)}</span></span><div className="player-buttons"><IconButton icon={SkipBack} label="Ir para o início" onClick={() => { setPlaying(false); seek(0); }} /><IconButton icon={playing ? Pause : Play} label={playing ? 'Pausar' : 'Reproduzir'} onClick={togglePlay} disabled={!total} className="play-button" /><IconButton icon={SkipForward} label="Ir para o final" onClick={() => { setPlaying(false); seek(total); }} /></div><div className="player-zoom"><IconButton icon={Volume2} label={project.audio ? 'Silenciar projeto' : 'Ativar áudio do projeto'} onClick={() => edit(p => ({ ...p, audio: !p.audio }))} className={!project.audio ? 'text-primary' : ''} /><span>Ajustar</span><IconButton icon={Maximize} label="Tela cheia" onClick={() => { const c = document.querySelector('.composition-wrap'); if (c) void c.requestFullscreen().catch(fail); }} /></div></div>
      </section>
      <div className={propertiesOpen ? 'contents properties-container-open' : 'contents'}><Properties clip={currentClip} onUpdate={patch => { if (selected) updateClip(selected, patch); }} tab={propertyTab} onTab={setPropertyTab} onAI={() => setModal('ai')} /></div>
    </div>
    <section className="timeline-section" aria-label="Linha do tempo" onDragOver={e => e.preventDefault()} onDrop={e => { const asset = project.media.find(m => m.id === e.dataTransfer.getData('media')); if (asset) addAsset(asset); }}>
      <div className="timeline-toolbar"><div className="timeline-tools"><IconButton icon={Undo2} label="Desfazer" onClick={undo} disabled={!history.length} /><IconButton icon={Redo2} label="Refazer" onClick={redo} disabled={!future.length} /><span className="toolbar-separator" /><IconButton icon={Scissors} label="Dividir clipe" onClick={split} disabled={!currentClip} /><IconButton icon={Copy} label="Duplicar clipe" onClick={duplicateClip} disabled={!currentClip} /><IconButton icon={Trash2} label="Excluir clipe" onClick={removeClip} disabled={!currentClip} /><span className="toolbar-separator" /><IconButton icon={Layers} label="Mover para camada superior" onClick={() => { if (currentClip) updateClip(currentClip.id, { track: Math.max(0, currentClip.track - 1) }); }} disabled={!currentClip} /><IconButton icon={FolderPlus} label="Novo projeto" onClick={() => void newProject()} /></div><div className="timeline-zoom"><span>{timecode(total).slice(0, 5)} de duração</span><IconButton icon={ZoomOut} label="Diminuir zoom da timeline" onClick={() => setZoom(z => Math.max(10, z - 10))} /><input type="range" aria-label="Zoom da timeline" min={10} max={120} value={zoom} onChange={e => setZoom(Number(e.target.value))} /><IconButton icon={ZoomIn} label="Aumentar zoom da timeline" onClick={() => setZoom(z => Math.min(120, z + 10))} /></div></div>
      <Timeline project={project} time={time} zoom={zoom} selected={selected} onSelect={setSelected} onSeek={seek} onUpdate={updateClip} onAdd={() => input.current?.click()} />
    </section>
    <footer className="studio-status"><span><i className="status-dot" />{saveStatus}</span><span>{project.aspect} · {project.resolution}p · {project.fps} FPS<span>│</span>{project.clips.length} clipes<span>│</span>Studio Video AI</span></footer>

    <Dialog open={modal === 'auth'} onOpenChange={open => { if (!open) { setModal(null); setPassword(''); } }}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>{user ? 'Sua conta' : authMode === 'signup' ? 'Criar conta' : authMode === 'reset' ? 'Redefinir senha' : 'Seu estúdio, em qualquer lugar'}</DialogTitle><DialogDescription>{user ? 'Seus projetos e arquivos são privados.' : 'Entre para salvar e reabrir seus projetos.'}</DialogDescription></DialogHeader>{user ? <div className="dialog-fields"><p className="account-email">{user.email}</p><Button variant="outline" onClick={() => { setModal(null); void refreshProjects(); }}><FolderOpen />Meus projetos</Button><Button variant="ghost" onClick={async () => { try { await persist(project, user); const { error: e } = await supabase.auth.signOut(); if (e) throw e; setModal(null); } catch (e) { fail(e); } }}><LogOut />Sair da conta</Button></div> : <form className="auth-form" onSubmit={e => { e.preventDefault(); void authenticate(); }}><Button variant="outline" type="button" disabled={busy} onClick={() => void googleLogin()}><span className="font-bold">G</span>Continuar com Google</Button><input type="email" aria-label="E-mail" placeholder="Seu e-mail" value={email} onChange={e => setEmail(e.target.value)} required />{authMode !== 'reset' && <input type="password" aria-label="Senha" placeholder="Sua senha" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required />}<Button disabled={busy} type="submit">{busy && <LoaderCircle className="animate-spin" />}{authMode === 'signup' ? 'Criar conta' : authMode === 'reset' ? 'Enviar link' : 'Entrar'}</Button>{authMessage && <p className="auth-error" role="status">{authMessage}</p>}<Button variant="link" type="button" onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setAuthMessage(''); }}>{authMode === 'signup' ? 'Já tenho conta' : 'Criar uma conta'}</Button>{authMode === 'login' && <Button variant="ghost" type="button" size="sm" onClick={() => setAuthMode('reset')}>Esqueci minha senha</Button>}</form>}</DialogContent></Dialog>
    <Dialog open={modal === 'projects'} onOpenChange={open => { if (!open) setModal(null); }}><DialogContent><DialogHeader><DialogTitle>Meus projetos</DialogTitle><DialogDescription>{rows.length} projetos salvos na sua conta</DialogDescription></DialogHeader><Button onClick={() => void newProject()} disabled={busy}><Plus />Novo projeto</Button><div className="project-list">{rows.map(row => <div className="project-row" key={row.id}><Film size={21} /><div className="project-info"><h3>{row.name}</h3><p>{new Date(row.updated_at).toLocaleString('pt-BR')}</p></div><Button variant="ghost" size="sm" disabled={busy} onClick={() => void openProject(row)} title="Abrir projeto"><FolderOpen size={15} /></Button><IconButton icon={Copy} label={`Duplicar ${row.name}`} disabled={busy} onClick={() => void duplicateProject(row)} /><IconButton icon={Trash2} label={`Excluir ${row.name}`} disabled={busy} onClick={() => setDeleteTarget(row)} /></div>)}</div></DialogContent></Dialog>
    <Dialog open={deleteTarget !== null} onOpenChange={open => { if (!open) setDeleteTarget(null); }}><DialogContent><DialogHeader><DialogTitle>Excluir projeto?</DialogTitle><DialogDescription>{deleteTarget?.name} será excluído da sua conta. Esta ação não pode ser desfeita.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button variant="destructive" disabled={busy} onClick={() => { if (deleteTarget) void deleteProject(deleteTarget); }}>Excluir projeto</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={modal === 'export'} onOpenChange={open => { if (!open && exportProgress === null) setModal(null); }}><DialogContent onEscapeKeyDown={e => { if (exportProgress !== null) e.preventDefault(); }} onPointerDownOutside={e => { if (exportProgress !== null) e.preventDefault(); }}><DialogHeader><DialogTitle>{exportResult ? 'Seu vídeo está pronto' : 'Exportar vídeo'}</DialogTitle><DialogDescription>{exportResult ? 'Arquivo renderizado e validado para reprodução.' : 'Renderização real da composição no seu navegador.'}</DialogDescription></DialogHeader>{exportResult ? <div className="export-result"><video src={exportResult.url} controls playsInline /><p className="dialog-note">Formato gerado: {exportResult.extension.toUpperCase()}{exportResult.extension === 'webm' ? ' — H.264/MP4 não está disponível neste navegador.' : ''}</p><Button onClick={downloadExport}><Download />Baixar vídeo {exportResult.extension.toUpperCase()}</Button><Button variant="ghost" onClick={() => { URL.revokeObjectURL(exportResult.url); setExportResult(null); }}>Nova exportação</Button></div> : <><div className="dialog-fields"><label>Nome do arquivo<input value={exportName} onChange={e => setExportName(e.target.value)} disabled={exportProgress !== null} /></label><div className="dialog-row"><label>Resolução<select value={exportResolution} disabled={exportProgress !== null} onChange={e => setExportResolution(Number(e.target.value) as 720 | 1080)}><option value={720}>720p</option><option value={1080}>1080p</option></select></label><label>Taxa de quadros<select value={exportFps} disabled={exportProgress !== null} onChange={e => setExportFps(Number(e.target.value) as 30 | 60)}><option value={30}>30 FPS</option><option value={60}>60 FPS</option></select></label></div><div className="dialog-row"><span>Incluir áudio</span><Switch checked={exportAudio} disabled={exportProgress !== null} onCheckedChange={setExportAudio} /></div><p className="dialog-note">Até 2 minutos. Mantenha esta aba aberta durante a exportação. MP4 quando o navegador oferece H.264; caso contrário, WebM. Renderização pesada com FFmpeg: serviço externo não configurado.</p>{exportProgress !== null && <><progress className="export-progress" value={exportProgress} max={100} /><p className="dialog-note">{exportProgress >= 98 ? 'Validando vídeo…' : `Renderizando · ${Math.floor(exportProgress)}%`}</p></>}{exportError && <p role="alert" className="auth-error">{exportError}</p>}</div><DialogFooter>{exportProgress !== null ? <Button variant="outline" onClick={() => exportController.current?.abort()}>Cancelar exportação</Button> : <Button onClick={() => void doExport()}><Download />Renderizar vídeo</Button>}</DialogFooter></>}</DialogContent></Dialog>
    <Dialog open={modal === 'ai'} onOpenChange={open => { if (!open) setModal(null); }}><DialogContent><DialogHeader><DialogTitle>Remover fundo com IA</DialogTitle><DialogDescription>Configure o serviço de IA para ativar este recurso</DialogDescription></DialogHeader><p className="dialog-note">É necessário conectar um serviço de segmentação de pessoas que retorne vídeo com transparência ou máscaras por quadro. Nenhum arquivo será enviado a terceiros sem sua confirmação.</p><DialogFooter><Button variant="outline" onClick={() => setModal(null)}>Entendi</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={modal === 'settings'} onOpenChange={open => { if (!open) setModal(null); }}><DialogContent><DialogHeader><DialogTitle>Configurações do projeto</DialogTitle><DialogDescription>{project.name}</DialogDescription></DialogHeader><div className="dialog-fields"><label>Nome<input value={project.name} onChange={e => edit(p => ({ ...p, name: e.target.value }))} /></label><label>Proporção<select value={project.aspect} onChange={e => edit(p => ({ ...p, aspect: e.target.value as Aspect }))}>{['16:9', '9:16', '1:1', '4:5'].map(a => <option key={a}>{a}</option>)}</select></label><label>Resolução<select value={project.resolution} onChange={e => edit(p => ({ ...p, resolution: Number(e.target.value) as 720 | 1080 }))}><option value={720}>720p</option><option value={1080}>1080p</option></select></label><label>Taxa de quadros<select value={project.fps} onChange={e => edit(p => ({ ...p, fps: Number(e.target.value) as 30 | 60 }))}><option value={30}>30 FPS</option><option value={60}>60 FPS</option></select></label></div><DialogFooter><Button onClick={() => setModal(null)}>Concluir</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={modal === 'help'} onOpenChange={open => { if (!open) setModal(null); }}><DialogContent><DialogHeader><DialogTitle>Studio Video AI</DialogTitle><DialogDescription>Estado dos serviços</DialogDescription></DialogHeader><div className="dialog-fields"><p className="dialog-note">Contas, projetos e arquivos privados: Lovable Cloud conectado.</p><p className="dialog-note">Exportação no navegador: composição real, até 2 minutos. Exportação pesada no servidor: falta conectar serviço FFmpeg.</p><p className="dialog-note">Remoção de fundo: falta conectar serviço de segmentação de pessoas.</p></div><DialogFooter><Button variant="outline" onClick={() => setModal(null)}>Fechar</Button></DialogFooter></DialogContent></Dialog>
  </main>;
}