import { Upload } from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { serializeProject, type Project, type MediaAsset } from './editor-model';
export async function saveProject(project: Project, userId: string) {
  const { error } = await supabase.from('video_projects').upsert({ id: project.id, user_id: userId, name: project.name, composition: serializeProject(project) as unknown as Json, updated_at: new Date().toISOString() });
  if (error) throw error;
}
export async function listProjects() {
  const { data, error } = await supabase.from('video_projects').select('id,name,updated_at,composition').order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}
export async function hydrateProject(composition: Json, sampleUrl: string): Promise<Project> {
  const p = composition as unknown as Project;
  const media = await Promise.all(p.media.map(async asset => {
    if (asset.sample) return { ...asset, url: sampleUrl, thumbnail: sampleUrl };
    if (!asset.path) return { ...asset, url: '' };
    const { data, error } = await supabase.storage.from('studio-media').createSignedUrl(asset.path, 60 * 60 * 24);
    if (error) throw error;
    return { ...asset, url: data.signedUrl, ...(asset.kind === 'image' ? { thumbnail: data.signedUrl } : {}) };
  }));
  return { ...p, media };
}
export async function uploadMedia(file: File, asset: MediaAsset, project: Project, userId: string, progress: (p: number) => void, signal: AbortSignal): Promise<MediaAsset> {
  const path = `${userId}/${project.id}/${asset.id}/${file.name.replace(/[^\p{L}\p{N}._-]/gu, '_')}`;
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Entre na sua conta para importar arquivos para a nuvem.');
  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`,
      headers: { authorization: `Bearer ${data.session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [1000, 3000, 5000],
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: { bucketName: 'studio-media', objectName: path, contentType: file.type, cacheControl: '3600' },
      onError: error => { signal.removeEventListener('abort', abort); reject(error); },
      onProgress: (uploaded, total) => progress(uploaded / total * 100),
      onSuccess: () => { signal.removeEventListener('abort', abort); resolve(); },
    });
    const abort = () => { void upload.abort().finally(() => reject(new DOMException('Upload cancelado.', 'AbortError'))); };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) { abort(); return; }
    void upload.findPreviousUploads().then(previous => { if (previous[0]) upload.resumeFromPreviousUpload(previous[0]); upload.start(); }).catch(reject);
  });
  const { error } = await supabase.from('video_media').insert({ id: asset.id, project_id: project.id, user_id: userId, name: asset.name, path, kind: asset.kind, metadata: { duration: asset.duration, width: asset.width, height: asset.height } });
  if (error) { await supabase.storage.from('studio-media').remove([path]); throw error; }
  return { ...asset, path };
}