import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { KeyRound, RefreshCw, ShieldCheck, Ban, Plus, Copy, LockKeyhole } from "lucide-react";

type License = {
  id: string;
  customer_email: string;
  status: string;
  license_type: string;
  device_binding_hash: string | null;
  activated_at: string | null;
  created_at: string;
  revoked_at: string | null;
  admin_notes: string | null;
};
type AdminResult = { ok?: boolean; error?: string; message?: string; licenseKey?: string; licenses?: License[]; license?: License };

function AdminLicensesPage() {
  const [secret, setSecret] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [licenses, setLicenses] = useState<License[]>([]);
  const [newKey, setNewKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const callAdmin = useCallback(async (action: string, values: Record<string, string> = {}) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
    if (!supabaseUrl || !publicKey) throw new Error("Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.");
    const response = await fetch(supabaseUrl.replace(/\/+$/, "") + "/functions/v1/admin-licenses", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: publicKey, "x-vexora-admin-secret": secret },
      body: JSON.stringify({ action, ...values }),
    });
    const result = await response.json() as AdminResult;
    if (!response.ok || !result.ok) throw new Error(result.message || "A operação administrativa falhou.");
    return result;
  }, [secret]);

  const run = async (action: string, values: Record<string, string> = {}) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await callAdmin(action, values);
      if (action === "list") setLicenses(result.licenses || []);
      if (action === "issue" && result.licenseKey) {
        setNewKey(result.licenseKey);
        setEmail("");
        setNotes("");
        setMessage("Licença criada. Copie a chave agora e entregue-a ao comprador; ela não será exibida novamente.");
        const refreshed = await callAdmin("list");
        setLicenses(refreshed.licenses || []);
      }
      if (action === "revoke" || action === "reactivate") {
        setMessage(action === "revoke" ? "Licença bloqueada." : "Vínculo removido. A próxima ativação online poderá registrar um computador.");
        const refreshed = await callAdmin("list");
        setLicenses(refreshed.licenses || []);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#080c12] px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="flex items-center gap-3 border-b border-slate-800 pb-6">
          <div className="grid h-12 w-12 place-items-center rounded-xl border border-lime-400/30 bg-lime-400/10 text-lime-300"><ShieldCheck size={26} /></div>
          <div><p className="text-xs font-bold tracking-[.25em] text-lime-300">VEXORA SAMPLER</p><h1 className="mt-1 text-2xl font-extrabold">Painel de licenças</h1><p className="mt-1 text-sm text-slate-400">Área administrativa · não compartilhe seu segredo de acesso.</p></div>
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold"><LockKeyhole size={16} className="text-lime-300" /> Segredo administrativo</label>
          <input type="password" autoComplete="off" value={secret} onChange={(event) => setSecret(event.target.value)} placeholder="Informe o segredo configurado no servidor" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-lime-400" />
          <div className="mt-3 flex flex-wrap gap-2"><button disabled={busy || !secret} onClick={() => void run("list")} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-bold hover:border-lime-400 disabled:opacity-50"><RefreshCw size={15} /> Carregar licenças</button><span className="self-center text-xs text-slate-500">O segredo fica apenas nesta sessão do navegador.</span></div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Plus size={18} className="text-lime-300" /> Emitir licença vitalícia</h2>
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); void run("issue", { email, notes }); }}>
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-mail do comprador" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-lime-400" />
            <input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} placeholder="Observação opcional" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-lime-400" />
            <button disabled={busy || !secret} className="inline-flex items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 py-3 text-sm font-extrabold text-slate-950 disabled:opacity-50"><KeyRound size={16} /> Gerar chave</button>
          </form>
          {newKey && <div className="mt-4 rounded-lg border border-lime-400/30 bg-lime-400/5 p-4"><p className="text-xs font-bold uppercase tracking-wider text-lime-300">Chave exibida uma única vez</p><code className="mt-2 block break-all text-base font-bold">{newKey}</code><button onClick={() => void navigator.clipboard.writeText(newKey)} className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-xs font-bold"><Copy size={14} /> Copiar chave</button></div>}
        </section>

        {(message || error) && <div role="status" className={`rounded-lg border p-3 text-sm ${error ? "border-rose-500/40 bg-rose-500/10 text-rose-200" : "border-lime-400/30 bg-lime-400/5 text-lime-200"}`}>{error || message}</div>}

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
          <div className="flex items-center justify-between border-b border-slate-800 p-5"><h2 className="text-lg font-bold">Licenças cadastradas</h2><span className="text-xs text-slate-400">{licenses.length} exibidas</span></div>
          {licenses.length === 0 ? <p className="p-6 text-sm text-slate-400">Informe o segredo e carregue as licenças. Nenhum registro foi carregado ainda.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Computador</th><th className="px-4 py-3">Ativação</th><th className="px-4 py-3">Ações</th></tr></thead><tbody>{licenses.map((license) => <tr key={license.id} className="border-t border-slate-800"><td className="px-4 py-4"><div className="font-semibold">{license.customer_email}</div><div className="mt-1 text-[10px] text-slate-500">{license.id}</div></td><td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-xs font-bold ${license.status === "active" ? "bg-lime-400/10 text-lime-300" : license.status === "revoked" ? "bg-rose-400/10 text-rose-300" : "bg-slate-700 text-slate-200"}`}>{license.status}</span></td><td className="px-4 py-4 text-xs text-slate-400">{license.device_binding_hash ? license.device_binding_hash.slice(0, 12) + "…" : "Ainda não vinculada"}</td><td className="px-4 py-4 text-xs text-slate-400">{license.activated_at ? new Date(license.activated_at).toLocaleString("pt-BR") : "—"}</td><td className="px-4 py-4"><div className="flex gap-2">{license.status !== "revoked" && <button disabled={busy} onClick={() => { if (confirm("Bloquear esta licença?")) void run("revoke", { licenseId: license.id }); }} className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 px-2 py-1.5 text-xs text-rose-200 disabled:opacity-50"><Ban size={13} /> Bloquear</button>}<button disabled={busy} onClick={() => { if (confirm("Remover o vínculo do computador? O cliente poderá ativar novamente online.")) void run("reactivate", { licenseId: license.id }); }} className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1.5 text-xs disabled:opacity-50"><RefreshCw size={13} /> Reativar</button></div></td></tr>)}</tbody></table></div>}
        </section>
        <p className="text-xs leading-6 text-slate-500">Segurança: o segredo administrativo precisa ser configurado como segredo de servidor. Este painel não substitui a camada nativa de identificação do Windows. Não distribua a licença como produto final antes de integrar e testar o vínculo do dispositivo no app desktop.</p>
      </div>
    </main>
  );
}

export const Route = createFileRoute("/admin/licenses")({ component: AdminLicensesPage });
