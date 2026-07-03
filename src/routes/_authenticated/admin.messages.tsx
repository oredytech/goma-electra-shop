import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listContactMessages, listProductSuggestions, markContactHandled, updateSuggestionStatus } from "@/lib/public-forms.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Lightbulb, Check } from "lucide-react";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  component: AdminMessages,
});

function AdminMessages() {
  const qc = useQueryClient();
  const fM = useServerFn(listContactMessages);
  const fS = useServerFn(listProductSuggestions);
  const fMark = useServerFn(markContactHandled);
  const fUpd = useServerFn(updateSuggestionStatus);
  const msgs = useQuery({ queryKey: ["contact-messages"], queryFn: () => fM() });
  const sugs = useQuery({ queryKey: ["product-suggestions"], queryFn: () => fS() });

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
            <Card key={m.id} className={`p-4 ${m.handled ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{m.name} {m.handled && <Badge variant="secondary" className="ml-2">Traité</Badge>}</div>
                  <div className="text-xs text-muted-foreground">{m.email ?? ""} {m.phone ? `· ${m.phone}` : ""} · {formatDate(m.created_at)}</div>
                  {m.subject && <div className="mt-1 text-sm font-medium">{m.subject}</div>}
                  <p className="mt-2 whitespace-pre-wrap text-sm">{m.message}</p>
                </div>
                <Button size="sm" variant="outline" onClick={async () => { await fMark({ data: { id: m.id, handled: !m.handled } }); qc.invalidateQueries({ queryKey: ["contact-messages"] }); toast.success("Mis à jour"); }}>
                  <Check className="mr-1 size-4" /> {m.handled ? "Marquer non traité" : "Marquer traité"}
                </Button>
              </div>
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
                <div>
                  <div className="font-semibold">{s.product_name}</div>
                  <div className="text-xs text-muted-foreground">Par {s.suggester_name ?? "anonyme"} {s.suggester_phone ? `· ${s.suggester_phone}` : ""} · {formatDate(s.created_at)}</div>
                  {s.description && <p className="mt-2 text-sm">{s.description}</p>}
                </div>
                <select className="h-9 rounded-md border bg-background px-2 text-sm" value={s.status} onChange={async (e) => { await fUpd({ data: { id: s.id, status: e.target.value as any } }); qc.invalidateQueries({ queryKey: ["product-suggestions"] }); }}>
                  <option value="new">Nouveau</option>
                  <option value="reviewing">En étude</option>
                  <option value="added">Ajouté</option>
                  <option value="rejected">Refusé</option>
                </select>
              </div>
            </Card>
          ))}
          {sugs.data?.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">Aucune suggestion.</Card>}
        </div>
      </section>
    </div>
  );
}
