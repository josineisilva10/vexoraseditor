import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function b64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}
function bytesToB64Url(value: Uint8Array): string {
  let raw = "";
  for (const byte of value) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function signLicense(payload: Record<string, unknown>): Promise<{ token: string; publicKeyId: string }> {
  const encodedPrivateKey = Deno.env.get("VEXORA_LICENSE_SIGNING_PRIVATE_KEY");
  const publicKeyId = Deno.env.get("VEXORA_LICENSE_PUBLIC_KEY_ID") ?? "v1";
  if (!encodedPrivateKey) throw new Error("VEXORA_LICENSE_SIGNING_PRIVATE_KEY is not configured");
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    b64ToBytes(encodedPrivateKey),
    { name: "Ed25519" },
    false,
    ["sign"],
  );
  const payloadPart = bytesToB64Url(new TextEncoder().encode(JSON.stringify({ ...payload, publicKeyId })));
  const signature = new Uint8Array(await crypto.subtle.sign("Ed25519", privateKey, new TextEncoder().encode(payloadPart)));
  return { token: payloadPart + "." + bytesToB64Url(signature), publicKeyId };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const key = String(body.licenseKey ?? "").trim().toUpperCase();
    const deviceId = String(body.deviceId ?? "").trim();

    if (!/^\S+@\S+\.\S+$/.test(email) || key.length < 12 || deviceId.length < 16 || deviceId.length > 256) {
      return json({ error: "invalid_input", message: "Confira o e-mail, a chave e a identificação desta instalação." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service configuration is missing");
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const keyHash = await sha256(key);
    const deviceHash = await sha256(deviceId);

    const { data: license, error } = await supabase
      .from("license_keys")
      .select("id, customer_email, status, license_type, device_binding_hash, activated_at")
      .eq("key_hash", keyHash)
      .maybeSingle();
    if (error) throw error;
    if (!license || license.customer_email.toLowerCase() !== email) {
      return json({ error: "license_not_found", message: "E-mail ou chave não reconhecidos." }, 403);
    }
    if (license.status === "revoked" || license.status === "support_hold") {
      return json({ error: "license_unavailable", message: "Esta licença está bloqueada. Entre em contato com o suporte." }, 403);
    }
    if (license.status === "active" && license.device_binding_hash !== deviceHash) {
      await supabase.from("license_activation_events").insert({
        license_id: license.id, event_type: "activation_rejected", device_binding_hash: deviceHash, detail_code: "device_already_bound",
      });
      return json({ error: "device_mismatch", message: "Esta licença já está vinculada a outro computador. Entre em contato para solicitar uma reativação." }, 409);
    }

    if (license.status === "issued") {
      const { data: claimed, error: claimError } = await supabase
        .from("license_keys")
        .update({ status: "active", device_binding_hash: deviceHash, activated_at: new Date().toISOString() })
        .eq("id", license.id)
        .eq("status", "issued")
        .select("id, customer_email, status, license_type, device_binding_hash, activated_at")
        .maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) {
        return json({ error: "activation_race", message: "A licença está sendo ativada. Tente novamente." }, 409);
      }
    }

    const payload = {
      schema: 1,
      licenseId: license.id,
      email,
      type: "lifetime",
      deviceBindingHash: deviceHash,
      issuedAt: new Date().toISOString(),
    };
    const signed = await signLicense(payload);
    await supabase.from("license_activation_events").insert({
      license_id: license.id, event_type: "activation_succeeded", device_binding_hash: deviceHash, detail_code: "online_activation",
    });
    return json({ ok: true, licenseToken: signed.token, publicKeyId: signed.publicKeyId, offlineReady: true });
  } catch (error) {
    console.error("activate-license failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "server_error", message: "Não foi possível ativar agora. Tente novamente mais tarde." }, 500);
  }
});
