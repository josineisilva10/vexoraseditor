import { createFileRoute } from "@tanstack/react-router";
import { Editor } from '@/components/editor/editor';
export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: 'Studio Video AI — Editor de vídeo' },
    { name: 'description', content: 'Seu espaço de criação: edite vídeos, áudio e textos em uma linha do tempo e exporte sua composição.' },
    { property: 'og:title', content: 'Studio Video AI — Seu próximo vídeo começa aqui' },
    { property: 'og:description', content: 'Um estúdio de edição com projetos privados, linha do tempo e exportação de vídeo.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Editor,
});
