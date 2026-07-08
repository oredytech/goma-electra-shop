import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listContactMessages, listProductSuggestions, markContactHandled, updateSuggestionStatus, replyContactMessage, replyProductSuggestion } from "@/lib/public-forms.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Lightbulb, Check, Reply, Mail } from "lucide-react";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  component: AdminMessages,
});

function ReplyBox({ onSubmit, initial = "" }: { onSubmit: (text: string) => Promise<void>; initial?: string }) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-3 space-y-2 rounded-md border bg-secondary/30 p-2">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Votre réponse…" />
      <div className="flex justify-end">
        <Button size="sm" disabled={busy || text.trim().length < 1} onClick={async () => {
          setBusy(true);
          try { await onSubmit(text.trim()); toast.success("Réponse envoyée"); setText(""); }
          catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
          finally { setBusy(false); }
        }} className="bg-gradient-brand text-brand-foreground">
          <Reply className="mr-1 size-4" /> Envoyer la réponse
        </Button>
      </div>
    </div>
  );
}

function AdminMessages() {
  const qc = useQueryClient();
  const fM = useServerFn(listContactMessages);
  const fS = useServerFn(listProductSuggestions);
  const fMark = useServerFn(markContactHandled);
  const fUpd = useServerFn(updateSuggestionStatus);
  const fReplyM = useServerFn(replyContactMessage);
  const fReplyS = useServerFn(replyProductSuggestion);
  const msgs = useQuery({ queryKey: ["contact-messages"], queryFn: () => fM() });
  const sugs = useQuery({ queryKey: ["product-suggestions"], queryFn: () => fS() });

  const [openReply, setOpenReply] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpenReply((o) => ({ ...o, [id]: !o[id] }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><MessageSquare className="size-6 text-accent" /> Messages & suggestions</h1>
        <p className="text-sm text-muted-foreground">Formulaires de contact et suggestions de produits envoyés depuis le site.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Messages de contact ({msgs.data?.length ?? 0})</h2>
        <div className="grid gap-3">
          {(msgs.data ?? []).map((m: any) => (
            <Card key={m.id} className={`p-4 ${m.handled ? "opacity-80" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{m.name}
                    {m.handled && <Badge variant="secondary" className="ml-2">Traité</Badge>}
                    {m.replied_at && <Badge className="ml-2 bg-emerald-500/15 text-emerald-700">Répondu</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">{m.email ?? ""} {m.phone ? `· ${m.phone}` : ""} · {formatDate(m.created_at)}</div>
                  {m.subject && <div className="mt-1 text-sm font-medium">{m.subject}</div>}
                  <p className="mt-2 whitespace-pre-wrap text-sm">{m.message}</p>
                  {m.admin_reply && (
                    <div className="mt-2 rounded-md border-l-4 border-accent bg-accent/5 p-2 text-sm">
                      <div className="mb-1 text-xs font-semibold text-accent">Votre réponse — {m.replied_at && formatDate(m.replied_at)}</div>
                      <p className="whitespace-pre-wrap">{m.admin_reply}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Button size="sm" onClick={() => toggle(m.id)} className="bg-gradient-brand text-brand-foreground">
                    <Reply className="mr-1 size-4" /> Répondre
                  </Button>
                  {m.email && (
                    <Button asChild size="sm" variant="outline">
                      <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject ?? "Votre message")}`}><Mail className="mr-1 size-4" /> Email</a>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={async () => { await fMark({ data: { id: m.id, handled: !m.handled } }); qc.invalidateQueries({ queryKey: ["contact-messages"] }); toast.success("Mis à jour"); }}>
                    <Check className="mr-1 size-4" /> {m.handled ? "Non traité" : "Traité"}
                  </Button>
                </div>
              </div>
              {openReply[m.id] && (
                <ReplyBox initial={m.admin_reply ?? ""} onSubmit={async (text) => {
                  await fReplyM({ data: { id: m.id, reply: text } });
                  qc.invalidateQueries({ queryKey: ["contact-messages"] });
                  toggle(m.id);
                }} />
              )}
            </Card>
          ))}
          {msgs.data?.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">Aucun message reçu.</Card>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Lightbulb className="size-5 text-accent" /> Suggestions de produits ({sugs.data?.length ?? 0})</h2>
        <div className="grid gap-3">
          {(sugs.data ?? []).map((s: any) => (
            <Card key={s.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{s.product_name}
                    {s.replied_at && <Badge className="ml-2 bg-emerald-500/15 text-emerald-700">Répondu</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">Par {s.suggester_name ?? "anonyme"} {s.suggester_phone ? `· ${s.suggester_phone}` : ""} · {formatDate(s.created_at)}</div>
                  {s.description && <p className="mt-2 text-sm">{s.description}</p>}
                  {s.admin_reply && (
                    <div className="mt-2 rounded-md border-l-4 border-accent bg-accent/5 p-2 text-sm">
                      <div className="mb-1 text-xs font-semibold text-accent">Votre réponse — {s.replied_at && formatDate(s.replied_at)}</div>
                      <p className="whitespace-pre-wrap">{s.admin_reply}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <select className="h-9 rounded-md border bg-background px-2 text-sm" value={s.status} onChange={async (e) => { await fUpd({ data: { id: s.id, status: e.target.value as any } }); qc.invalidateQueries({ queryKey: ["product-suggestions"] }); }}>
                    <option value="new">Nouveau</option>
                    <option value="reviewing">En étude</option>
                    <option value="added">Ajouté</option>
                    <option value="rejected">Refusé</option>
                  </select>
                  <Button size="sm" onClick={() => toggle(s.id)} className="bg-gradient-brand text-brand-foreground">
                    <Reply className="mr-1 size-4" /> Répondre
                  </Button>
                  {s.suggester_email && (
                    <Button asChild size="sm" variant="outline">
                      <a href={`mailto:${s.suggester_email}?subject=${encodeURIComponent("Re: " + s.product_name)}`}><Mail className="mr-1 size-4" /> Email</a>
                    </Button>
                  )}
                </div>
              </div>
              {openReply[s.id] && (
                <ReplyBox initial={s.admin_reply ?? ""} onSubmit={async (text) => {
                  await fReplyS({ data: { id: s.id, reply: text } });
                  qc.invalidateQueries({ queryKey: ["product-suggestions"] });
                  toggle(s.id);
                }} />
              )}
            </Card>
          ))}
          {sugs.data?.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">Aucune suggestion.</Card>}
        </div>
      </section>
    </div>
  );
}
