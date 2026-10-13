import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AudioLines, CheckCircle2, Clock3, KeyRound, ShieldCheck, Wifi, WifiOff } from "lucide-react";

const TRIAL_KEY = "vexora-trial-started-at";
const LICENSE_KEY = "vexora-offline-license";
const DEVICE_KEY = "vexora-installation-id";
const TRIAL_MS = 5 * 60 * 1000;

type LicensePayload = {
  schema: number;
  licenseId: string;
  email: string;
  type: string;
  deviceBindingHash: string;
  issuedAt: string;
  publicKeyId: string;
};

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}
function fromBase64(value: string): Uint8Array {
  const raw = atob(value);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}
function toBase64(value: Uint8Array): string {
  let raw = "";
  for (const byte of value) raw += String.fromCharCode(byte);
  return btoa(raw);
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID() + "-" + crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}
async function verifyOfflineToken(token: string, deviceId: string): Promise<LicensePayload | null> {
  const publicKey = import.meta.env.VITE_VEXORA_LICENSE_PUBLIC_KEY as string | undefined;
  if (!publicKey) return null;
  try {
    const [payloadPart, signaturePart] = token.split(".");
    if (!payloadPart || !signaturePart) return null;
    const key = await crypto.subtle.importKey("spki", fromBase64(publicKey), { name: "Ed25519" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("Ed25519", key, fromBase64Url(signaturePart), new TextEncoder().encode(payloadPart));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadPart))) as LicensePayload;
    if (payload.schema !== 1 || payload.type !== "lifetime") return null;
    if (payload.deviceBindingHash !== await sha256(deviceId)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function ActivationGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"welcome" | "activate" | "expired">("welcome");
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [licensedEmail, setLicensedEmail] = useState("");
  const [email, setEmail] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasLicense, setHasLicense] = useState(false);
  const [trialActive, setTrialActive] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const deviceId = getDeviceId();
      const token = localStorage.getItem(LICENSE_KEY);
      if (token) {
        const payload = await verifyOfflineToken(token, deviceId);
        if (payload) {
          setHasLicense(true);
          setLicensedEmail(payload.email);
          setReady(true);
          return;
        }
        localStorage.removeItem(LICENSE_KEY);
      }
      const startedAt = Number(localStorage.getItem(TRIAL_KEY) || 0);
      if (startedAt > 0) {
        const remaining = Math.max(0, TRIAL_MS - (Date.now() - startedAt));
        setSecondsLeft(Math.ceil(remaining / 1000));
        if (remaining > 0) {
          setTrialActive(true);
          setReady(true);
          return;
        }
        setMode("expired");
      }
    } catch {
      setError("Não foi possível verificar a ativação local.");
    }
    setReady(true);
  }, []);

  useEffect(() => { void refreshStatus(); }, [refreshStatus]);

  useEffect(() => {
    if (!trialActive || hasLicense) return;
    const interval = window.setInterval(() => {
      const startedAt = Number(localStorage.getItem(TRIAL_KEY) || 0);
      const remaining = Math.max(0, TRIAL_MS - (Date.now() - startedAt));
      setSecondsLeft(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        setTrialActive(false);
        setMode("expired");
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [trialActive, hasLicense]);

  const startTrial = () => {
    const now = Date.now();
    localStorage.setItem(TRIAL_KEY, String(now));
    setSecondsLeft(300);
    setTrialActive(true);
    setMode("welcome");
    setReady(true);
  };

  const activate = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
    if (!supabaseUrl || !publicKey) {
      setError("O serviço de licenças ainda não foi configurado no ambiente do aplicativo.");
      return;
    }
    if (!import.meta.env.VITE_VEXORA_LICENSE_PUBLIC_KEY) {
      setError("Falta configurar a chave pública de verificação da licença.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(supabaseUrl.replace(/\/+$/, "") + "/functions/v1/activate-license", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: publicKey },
        body: JSON.stringify({ email, licenseKey, deviceId: getDeviceId() }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok || !result.licenseToken) {
        setError(result.message || "Não foi possível ativar esta licença.");
        return;
      }
      const payload = await verifyOfflineToken(result.licenseToken, getDeviceId());
      if (!payload) {
        setError("A assinatura da licença não pôde ser verificada. Confira a chave pública configurada.");
        return;
      }
      localStorage.setItem(LICENSE_KEY, result.licenseToken);
      setLicensedEmail(payload.email);
      setHasLicense(true);
      setTrialActive(false);
      setError("");
    } catch {
      setError("Sem conexão com o serviço de ativação. Conecte-se à internet e tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return <div className="vx-activation-loading"><AudioLines size={34} /><span>Verificando VEXORA SAMPLER…</span></div>;
  if (hasLicense) return <>{children}</>;
  if (trialActive && secondsLeft > 0) return <>{children}<div className="vx-trial-pill"><Clock3 size={14} /> TESTE GRATUITO · {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</div></>;

  return (
    <div className="vx-activation-backdrop">
      <section className="vx-activation-card" role="dialog" aria-modal="true" aria-labelledby="vx-activation-title">
        <div className="vx-activation-brand"><div className="vx-activation-logo"><AudioLines size={27} /></div><span>VEXORA <b>SAMPLER</b><small>LIVE AUDIO STATION</small></span></div>
        <div className="vx-activation-rule" />
        {mode === "activate" ? (
          <>
            <div className="vx-activation-icon"><KeyRound size={24} /></div>
            <h1 id="vx-activation-title">Ativar licença</h1>
            <p className="vx-activation-subtitle">Informe o e-mail da compra e sua chave de licença.</p>
            <form onSubmit={activate} className="vx-activation-form">
              <label>E-mail da compra<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" /></label>
              <label>Chave de licença<input autoComplete="off" required value={licenseKey} onChange={(event) => setLicenseKey(event.target.value.toUpperCase())} placeholder="VEX-XXXXX-XXXXX-XXXXX-XXXXX" /></label>
              {error && <p className="vx-activation-error" role="alert">{error}</p>}
              <button className="vx-activation-primary" type="submit" disabled={busy}>{busy ? "VALIDANDO…" : "ATIVAR NESTE COMPUTADOR"}</button>
              <p className="vx-activation-foot"><ShieldCheck size={14} /> Uma licença só pode ser vinculada a um computador. Formatação ou troca de máquina exige contato com o suporte.</p>
              <button className="vx-activation-secondary" type="button" onClick={() => { setError(""); setMode("welcome"); }}>Voltar</button>
            </form>
          </>
        ) : (
          <>
            <div className="vx-activation-icon">{mode === "expired" ? <Clock3 size={24} /> : <ShieldCheck size={24} />}</div>
            <h1 id="vx-activation-title">{mode === "expired" ? "Seu teste terminou" : "Bem-vindo ao VEXORA"}</h1>
            <p className="vx-activation-subtitle">{mode === "expired" ? "Ative sua licença para continuar usando o sampler." : "Experimente o VEXORA SAMPLER por 5 minutos ou ative sua licença."}</p>
            <div className="vx-activation-options">
              {mode !== "expired" && <button className="vx-activation-primary" onClick={startTrial}><Clock3 size={17} /> EXPERIMENTAR POR 5 MINUTOS</button>}
              <button className="vx-activation-secondary" onClick={() => { setError(""); setMode("activate"); }}><KeyRound size={17} /> JÁ TENHO UMA LICENÇA</button>
            </div>
            {error && <p className="vx-activation-error" role="alert">{error}</p>}
            <div className="vx-activation-offline"><Wifi size={15} /><span>Ativação inicial online</span><span className="vx-activation-dot">•</span><WifiOff size={15} /><span>Uso offline após ativar</span></div>
            <p className="vx-activation-foot">A licença é pessoal e vinculada a um único computador. Para reativar após formatação, entre em contato com o suporte.</p>
          </>
        )}
        <div className="vx-activation-bottom">SEU SOM. SUAS TECLAS. CONTROLE TOTAL.</div>
      </section>
    </div>
  );
}
