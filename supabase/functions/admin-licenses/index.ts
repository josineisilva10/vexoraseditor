import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vexora-admin-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function randomKey() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const chars = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
  return "VEX-" + [chars.slice(0, 5).join(""), chars.slice(5, 10).join(""), chars.slice(10, 15).join(""), chars.slice(15, 20).join("")].join("-");
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const configuredSecret = Deno.env.get("VEXORA_ADMIN_SECRET");
  if (!configuredSecret || request.headers.get("x-vexora-admin-secret") !== configuredSecret) {
    return json({ error: "unauthorized", message: "Acesso administrativo não autorizado." }, 401);
  }

  try {
    const body = await request.json();
    const action = String(body.action ?? "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service configuration is missing");
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

    if (action === "issue") {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "invalid_email", message: "Informe um e-mail válido." }, 400);
      const licenseKey = randomKey();
      const { data, error } = await supabase.from("license_keys").insert({
        key_hash: await sha256(licenseKey),
        customer_email: email,
        status: "issued",
        license_type: "lifetime",
        admin_notes: String(body.notes ?? "").slice(0, 500) || null,
      }).select("id, customer_email, status, license_type, created_at").single();
      if (error) throw error;
      return json({ ok: true, license: data, licenseKey });
    }

    const licenseId = String(body.licenseId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(licenseId)) return json({ error: "invalid_license_id", message: "Identificador de licença inválido." }, 400);
    const { data: existing, error: lookupError } = await supabase.from("license_keys").select("id, status, device_binding_hash").eq("id", licenseId).maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) return json({ error: "not_found", message: "Licença não encontrada." }, 404);

    if (action === "revoke") {
      const { error } = await supabase.from("license_keys").update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("id", licenseId);
      if (error) throw error;
      await supabase.from("license_activation_events").insert({ license_id: licenseId, event_type: "revoked", detail_code: "admin_revoked" });
      return json({ ok: true });
    }
    if (action === "reactivate") {
      const { error } = await supabase.from("license_keys").update({ status: "issued", device_binding_hash: null, activated_at: null, revoked_at: null }).eq("id", licenseId);
      if (error) throw error;
      await supabase.from("license_activation_events").insert({ license_id: licenseId, event_type: "admin_reactivation", detail_code: "device_binding_reset_by_admin" });
      return json({ ok: true, message: "Vínculo removido. A próxima ativação online vinculará a chave a um único computador." });
    }
    if (action === "list") {
      const { data, error } = await supabase.from("license_keys").select("id, customer_email, status, license_type, device_binding_hash, activated_at, created_at, revoked_at, admin_notes").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return json({ ok: true, licenses: data });
    }
    return json({ error: "unknown_action", message: "Operação não reconhecida." }, 400);
  } catch (error) {
    console.error("admin-licenses failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "server_error", message: "Não foi possível concluir a operação administrativa." }, 500);
  }
});
