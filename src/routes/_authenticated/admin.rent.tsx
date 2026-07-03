import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/rent")({
  component: () => (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Building2 className="size-6 text-accent" /> Loyer</h1>
        <p className="text-sm text-muted-foreground">Chaque paiement de loyer est enregistré en dépense « Loyer » — visible aussi dans les dépenses globales.</p>
      </div>
      <Card className="p-6">
        <p className="text-sm">
          Utilisez la page <Link to="/admin/expenses" className="font-semibold text-accent hover:underline">Dépenses</Link>
          {" "}et choisissez la catégorie <strong>« Loyer »</strong> pour enregistrer un paiement de loyer. L'historique complet apparaîtra ici prochainement.
        </p>
      </Card>
    </div>
  ),
});
