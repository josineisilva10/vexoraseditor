import "./vexora-sampler.css";
import { useEffect, useRef, useState } from "react";
import { AudioLines, Volume2, Play, Square, Plus, Settings2, ImagePlus, Save, Music2, Check } from "lucide-react";

type Pad = { key: string; label: string; name: string; url?: string; audioId?: string; duration?: number; color: string; loop: boolean; volume: number; mode?: "restart" | "toggle" | "overlap"; };
type AudioAsset = { id: string; blob: Blob; name: string; duration: number };
const DB_NAME = "vexora-sampler";
function openAudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains("audio")) request.result.createObjectStore("audio", { keyPath: "id" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function saveAudioAsset(asset: AudioAsset) {
  const db = await openAudioDb();
  await new Promise<void>((resolve, reject) => { const tx = db.transaction("audio", "readwrite"); tx.objectStore("audio").put(asset); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  db.close();
}
async function saveWallpaperAsset(blob: Blob) {
  const db = await openAudioDb();
  await new Promise<void>((resolve, reject) => { const tx = db.transaction("wallpaper", "readwrite"); tx.objectStore("wallpaper").put({id:"current",blob}); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  db.close();
}
async function readWallpaperAsset(): Promise<Blob | undefined> {
  const db = await openAudioDb();
  const item = await new Promise<{id:string;blob:Blob}|undefined>((resolve, reject) => { const req = db.transaction("wallpaper", "readonly").objectStore("wallpaper").get("current"); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  db.close(); return item?.blob;
}
async function readAudioAssets(): Promise<AudioAsset[]> {
  const db = await openAudioDb();
  const items = await new Promise<AudioAsset[]>((resolve, reject) => { const req = db.transaction("audio", "readonly").objectStore("audio").getAll(); req.onsuccess = () => resolve(req.result as AudioAsset[]); req.onerror = () => reject(req.error); });
  db.close(); return items;
}
const KEY_DEFS: {key:string;label:string}[] = [
  ...Array.from({length:12},(_,i)=>({key:"F"+(i+1),label:"F"+(i+1)})),
  ...Array.from("1234567890").map((label,i)=>({key:"Digit"+label,label})),
  ...Array.from("QWERTYUIOP").map(label=>({key:"Key"+label,label})),
  ...Array.from("ASDFGHJKL").map(label=>({key:"Key"+label,label})),
  ...Array.from("ZXCVBNM").map(label=>({key:"Key"+label,label})),
  ...["Space","Enter","Escape","Tab","Backspace","CapsLock","ShiftLeft","ShiftRight","ControlLeft","ControlRight","AltLeft","AltRight","MetaLeft","MetaRight","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Insert","Delete","Home","End","PageUp","PageDown","Numpad0","Numpad1","Numpad2","Numpad3","Numpad4","Numpad5","Numpad6","Numpad7","Numpad8","Numpad9","NumpadAdd","NumpadSubtract","NumpadMultiply","NumpadDivide","NumpadDecimal","NumpadEnter"].map(key=>({key,label:({Space:"ESPAÇO",Enter:"ENTER",Escape:"ESC",Tab:"TAB",Backspace:"⌫",CapsLock:"CAPS",ShiftLeft:"SHIFT",ShiftRight:"SHIFT",ControlLeft:"CTRL",ControlRight:"CTRL",AltLeft:"ALT",AltRight:"ALT",MetaLeft:"WIN",MetaRight:"WIN",ArrowUp:"↑",ArrowDown:"↓",ArrowLeft:"←",ArrowRight:"→",PageUp:"PG↑",PageDown:"PG↓",NumpadAdd:"NUM +",NumpadSubtract:"NUM −",NumpadMultiply:"NUM ×",NumpadDivide:"NUM ÷",NumpadDecimal:"NUM .",NumpadEnter:"NUM ↵"} as Record<string,string>)[key]||key.replace("Numpad","NUM ")}))
];
const colors = ["#8cff00", "#00d9ff", "#ff4d6d", "#ffb020", "#a78bfa", "#ffffff"];
const keys = KEY_DEFS.map(k=>k.key);
const rows = [["Escape","F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"],["Digit1","Digit2","Digit3","Digit4","Digit5","Digit6","Digit7","Digit8","Digit9","Digit0"],["KeyQ","KeyW","KeyE","KeyR","KeyT","KeyY","KeyU","KeyI","KeyO","KeyP"],["KeyA","KeyS","KeyD","KeyF","KeyG","KeyH","KeyJ","KeyK","KeyL"],["ShiftLeft","KeyZ","KeyX","KeyC","KeyV","KeyB","KeyN","KeyM","Space"],["ControlLeft","AltLeft","MetaLeft","Enter","Backspace","ArrowLeft","ArrowDown","ArrowUp","ArrowRight"],["Numpad7","Numpad8","Numpad9","Numpad4","Numpad5","Numpad6","Numpad1","Numpad2","Numpad3","Numpad0","NumpadEnter"]];
export function VexoraSampler() {
  const [pads,setPads] = useState<Pad[]>(keys.map((key,i)=>({key,name:"PAD LIVRE",color:colors[i%colors.length],loop:false,volume:85})));
  const [master,setMaster] = useState(80);
  const [bank,setBank] = useState("A");
  const [selected,setSelected] = useState("KeyA");
  const [active,setActive] = useState<string[]>([]);
  const [notice,setNotice] = useState("Pronto para receber seus áudios");
  const [wallpaper,setWallpaper] = useState("");
  const [dim,setDim] = useState(65);
  const [settings,setSettings] = useState(false);
  const [library,setLibrary] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<Record<string,HTMLAudioElement>>({});
  const chosen = pads.find(p=>p.key===selected);
  const patch = (key:string, data:Partial<Pad>)=>setPads(old=>old.map(p=>p.key===key?{...p,...data}:p));
  useEffect(()=>{try{const raw=localStorage.getItem("vexora-sampler-settings");if(raw){const s=JSON.parse(raw);if(s.bank)setBank(s.bank);if(s.master!==undefined)setMaster(s.master);if(s.dim!==undefined)setDim(s.dim);if(s.maxVoices)setMaxVoices(s.maxVoices);if(s.bankPads)setBankPads(old=>({...old,...s.bankPads}));}}catch{setNotice("Não foi possível carregar todas as preferências salvas.");}
    void readWallpaperAsset().then(blob=>{if(blob)setWallpaper(URL.createObjectURL(blob));}).catch(()=>{});
    void readAudioAssets().then(assets=>{setBankPads(old=>{const next={...old};for(const b of Object.keys(next)){next[b]=next[b].map(p=>{const a=assets.find(x=>x.id===p.audioId);return a?{...p,url:URL.createObjectURL(a.blob),duration:a.duration,name:p.name||a.name}:p;});}return next;});setAudioReady(true);}).catch(()=>{setAudioReady(true);setNotice("Armazenamento de áudio indisponível neste navegador.");});
  },[]);
  useEffect(()=>{try{const safe={bank,master,dim,maxVoices,bankPads:Object.fromEntries(Object.entries(bankPads).map(([b,ps])=>[b,ps.map(({url,...p})=>p)]))};localStorage.setItem("vexora-sampler-settings",JSON.stringify(safe));}catch{setNotice("Armazenamento cheio: exporte uma cópia do projeto.");}},[bank,master,dim,maxVoices,bankPads]);
  const stop = (key:string)=>{const a=audioRef.current[key];if(a){a.pause();a.currentTime=0;}setActive(old=>old.filter(k=>k!==key));setProgress(old=>({...old,[key]:{...old[key],current:0}}));};
  const play = (p:Pad)=>{
    if(!p.url){setSelected(p.key);setNotice("Escolha um áudio para o pad "+p.key);fileRef.current?.click();return;}
    audioRef.current[p.key]?.pause();
    const a=new Audio(p.url);a.volume=master/100*p.volume/100;a.loop=p.loop;audioRef.current[p.key]=a;
    a.onended=()=>setActive(old=>old.filter(k=>k!==p.key));
    void a.play().then(()=>{setActive(old=>old.includes(p.key)?old:[...old,p.key]);setNotice("Reproduzindo: "+p.name);}).catch(()=>setNotice("Clique novamente para iniciar o áudio."));
  };
  useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(e.repeat||e.ctrlKey||e.altKey||e.metaKey)return;const t=e.target as HTMLElement|null;if(t&&["INPUT","TEXTAREA"].includes(t.tagName))return;const k=e.code;const p=pads.find(x=>x.key===k);if(p){e.preventDefault();play(p);}};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn);},[pads,master]);
  const importAudio=(f?:File)=>{if(!f)return;if(!f.type.startsWith("audio/")&&!/\.(wav|mp3|ogg|flac|m4a|aac)$/i.test(f.name)){setNotice("Formato de áudio não reconhecido.");return;}patch(selected,{name:f.name.replace(/\.[^.]+$/,""),url:URL.createObjectURL(f)});setNotice("Áudio carregado no pad "+selected);};
  const stopAll=()=>{Object.keys(audioRef.current).forEach(stop);setActive([]);setNotice("Stop geral executado");};
  const exportConfig=()=>{const data={schemaVersion:1,name:"VEXORA SAMPLER",bank,master,dim,maxVoices,bankPads:Object.fromEntries(Object.entries(bankPads).map(([b,ps])=>[b,ps.map(({url,...p})=>p)]))};const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=u;a.download="vexora-banco-"+bank+".json";a.click();URL.revokeObjectURL(u);setNotice("Configuração exportada em JSON. Os áudios precisam ser recarregados.");};
  return <main className="vexora-app" style={wallpaper?{backgroundImage:"linear-gradient(rgba(5,8,12,"+(dim/100)+"),rgba(5,8,12,"+(dim/100)+")),url("+JSON.stringify(wallpaper)+")"}:undefined}>
    <header className="vx-topbar"><div className="vx-brand"><div className="vx-logo"><AudioLines size={25}/></div><div><strong>VEXORA <span>SAMPLER</span></strong><small>LIVE AUDIO STATION</small></div></div><div className="vx-online"><i/> INTERFACE WEB · ETAPA 1</div><nav><button title="Papel de parede" onClick={()=>imageRef.current?.click()}><ImagePlus/></button><button title="Biblioteca" onClick={()=>setLibrary(!library)}>♫</button><button title="Configurações" onClick={()=>setSettings(!settings)}><Settings2/></button></nav></header>
    <div className="vx-layout"><aside className="vx-sidebar"><label className="vx-label">SESSÃO ATUAL</label><div className="vx-project"><Music2/><div><b>Meu sampler</b><small>Projeto local</small></div><span>LIVE</span></div><label className="vx-label">BANCOS DE ÁUDIO</label><div className="vx-banks">{["A","B","C"].map(b=><button key={b} className={bank===b?"on":""} onClick={()=>{setBank(b);setNotice("Banco "+b+" selecionado");}}><b>BANCO {b}</b><small>{b==="A"?"PRINCIPAL":b==="B"?"ALTERNATIVO":"RESERVA"}</small>{bank===b&&<Check size={15}/>}</button>)}</div><label className="vx-label">CONTROLES MASTER</label><div className="vx-master"><div> <Volume2 size={16}/> VOLUME MASTER <b>{master}%</b></div><input aria-label="Volume master" type="range" min="0" max="100" value={master} onChange={e=>setMaster(Number(e.target.value))}/><div className="vx-minmax"><span>0%</span><span>100%</span></div><small>NÍVEL DE SAÍDA · {active.length?"SINAL ATIVO":"SEM SINAL"}</small><div className="vx-meter">{Array.from({length:20},(_,i)=><i key={i} className={active.length&&i<master/5?"lit":""}/>)}</div></div><label className="vx-label">TRANSPORTE</label><button className="vx-transport" onClick={stopAll}><Square size={16}/> STOP GERAL</button>
    <button className="vx-transport" onClick={()=>setMuted(v=>!v)}>{muted?"ATIVAR SOM":"MUDO"}</button><button className="vx-transport" onClick={exportConfig}><Save size={16}/> EXPORTAR CONFIGURAÇÃO</button><div className="vx-side-foot"><i/> ARQUIVOS LOCAIS</div></aside>
    <section className="vx-main"><div className="vx-heading"><div><label className="vx-label">PAINEL DE PERFORMANCE</label><h1>Disparo de <span>áudio</span></h1><p>Seu som. Suas teclas. Controle total.</p></div><button className="vx-add" onClick={()=>{setSelected(pads.find(p=>!p.url)?.key||"KeyA");fileRef.current?.click()}}><Plus size={17}/> ADICIONAR ÁUDIO</button></div>
    <div className="vx-stats"><div><small>PADS CONFIGURADOS</small><b>{pads.filter(p=>p.url).length}<em> / {pads.length}</em></b></div><div><small>TOCANDO AGORA</small><b>{active.length}</b></div><div><small>BANCO ATIVO</small><b>{bank}<em> / 03</em></b></div><div><small>VOLUME MASTER</small><b>{master}<em>%</em></b></div></div>
    <section className="vx-panel"><div className="vx-panel-head"><div><h2>PAD GRID <span>/ BANCO {bank}</span></h2><p>Clique para disparar ou use a tecla correspondente.</p></div><span className="vx-chip">● ÁUDIO LOCAL</span></div><div className="vx-pad-grid">{pads.map((p,i)=><button key={p.key} className={"vx-pad "+(active.includes(p.key)?"playing ":"")+(selected===p.key?"selected":"")} style={{"--pad-color":p.color} as React.CSSProperties} onClick={()=>{setSelected(p.key);if(p.url)play(p);else setNotice("Pad "+p.key+" vazio — use Adicionar áudio");}} onContextMenu={e=>{e.preventDefault();setSelected(p.key);setSettings(true);}}><small>{String(i+1).padStart(2,"0")}</small><strong>{p.label}</strong><span>{p.name}</span><em>{active.includes(p.key)?"● TOCANDO":p.url?"PRONTO":"PAD VAZIO"}</em>{p.duration!==undefined&&<small>{Math.floor(p.duration/60)}:{String(Math.floor(p.duration%60)).padStart(2,"0")}</small>}<i/></button>)}</div><div className="vx-pad-foot"><span>● PRONTO</span><span>● SELECIONADO</span><span>● EM REPRODUÇÃO</span></div></section>
    <section className="vx-panel vx-key-panel"><div className="vx-panel-head"><div><h2>⌨ TECLADO <span>/ MAPEAMENTO VISUAL</span></h2><p>As teclas funcionam enquanto a janela estiver ativa.</p></div><span className="vx-chip">LAYOUT VISUAL</span></div><div className="vx-keyboard">{rows.map((row,i)=><div className="vx-key-row" key={i}>{row.map(k=><button key={k} className={pads.some(p=>p.key===k)?"mapped":""} onClick={()=>{setSelected(k);setNotice("Tecla "+(KEY_DEFS.find(x=>x.key===k)?.label||k)+" selecionada");}}>{KEY_DEFS.find(x=>x.key===k)?.label||k}</button>)}</div>)}</div><small className="vx-disclaimer">Atalhos globais do Windows e engine nativa serão implementados na etapa desktop.</small></section><div className="vx-statusbar"><span><i/> {notice}</span><span>{audioReady?"ARMAZENAMENTO LOCAL ATIVO":"CARREGANDO ÁUDIOS"} · VEXORA SAMPLER <b>v0.2.0</b></span></div></section>
    {settings&&<aside className="vx-drawer"><button className="vx-close" onClick={()=>setSettings(false)}>✕</button><label className="vx-label">CONFIGURAÇÃO DO PAD</label><h2>Personalizar pad</h2>{chosen?<><label>Nome<input value={chosen.name} onChange={e=>patch(chosen.key,{name:e.target.value})}/></label><label>Volume · {chosen.volume}%<input type="range" min="0" max="100" value={chosen.volume} onChange={e=>patch(chosen.key,{volume:Number(e.target.value)})}/></label><label className="vx-check"><input type="checkbox" checked={chosen.loop} onChange={e=>patch(chosen.key,{loop:e.target.checked})}/> Repetir áudio (loop)</label><label className="vx-label">COR</label><div className="vx-colors">{colors.map(c=><button key={c} style={{background:c}} onClick={()=>patch(chosen.key,{color:c})}/>)}</div><button className="vx-add vx-full" onClick={()=>fileRef.current?.click()}>ESCOLHER ÁUDIO</button><button className="vx-transport" onClick={()=>{stop(chosen.key);patch(chosen.key,{name:"PAD LIVRE",url:undefined});}}>LIMPAR PAD</button></>:<p>Selecione um pad.</p>}<label>Comportamento<select value={chosen.mode||"restart"} onChange={e=>patch(chosen.key,{mode:e.target.value as Pad["mode"]})}><option value="restart">Reiniciar ao pressionar</option><option value="toggle">Pressionar novamente para parar</option><option value="overlap">Permitir sobreposição</option></select></label><label>Limite de sons simultâneos<input type="number" min="1" max="64" value={maxVoices} onChange={e=>setMaxVoices(Math.max(1,Math.min(64,Number(e.target.value)||1)))}/></label><p className="vx-note">Preferências e áudio importado são salvos neste navegador. Para atalhos globais, a versão desktop nativa ainda é necessária.</p></aside>}
    {library&&<aside className="vx-drawer"><button className="vx-close" onClick={()=>setLibrary(false)}>✕</button><label className="vx-label">BIBLIOTECA LOCAL</label><h2>Áudios carregados</h2>{pads.filter(p=>p.url).map(p=><div className="vx-library-item" key={p.key}><span>{p.name}<small>Tecla {p.key}</small></span><button onClick={()=>play(p)}><Play size={15}/></button></div>)}</aside>}
    </div><input ref={fileRef} hidden type="file" accept="audio/*,.wav,.mp3,.ogg,.flac,.m4a,.aac" onChange={e=>{importAudio(e.target.files?.[0]);e.currentTarget.value="";}}/><input ref={imageRef} hidden type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f){void saveWallpaperAsset(f).then(()=>{setWallpaper(URL.createObjectURL(f));setNotice("Papel de parede salvo para as próximas sessões");}).catch(()=>setNotice("Não foi possível salvar o papel de parede."));}e.currentTarget.value="";}}/>{wallpaper&&<div className="vx-wallpaper-control">Escurecer fundo <input type="range" min="0" max="100" value={dim} onChange={e=>setDim(Number(e.target.value))}/><button onClick={()=>{setWallpaper("");void saveWallpaperAsset(new Blob([]));}}>Restaurar fundo</button></div>}</main>;
}