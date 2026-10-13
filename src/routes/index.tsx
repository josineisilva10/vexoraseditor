import { createFileRoute } from "@tanstack/react-router";
import { ActivationGate } from "@/components/ActivationGate";
import { VexoraSampler } from "@/components/VexoraSampler";

function VexoraWithActivation() {
  return (
    <ActivationGate>
      <VexoraSampler />
    </ActivationGate>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VEXORA SAMPLER — Live Audio Station" },
      { name: "description", content: "Sampler de áudio com pads, mapeamento de teclado e controle de reprodução." },
      { property: "og:title", content: "VEXORA SAMPLER" },
      { property: "og:description", content: "Seu som. Suas teclas. Controle total." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: VexoraWithActivation,
});
