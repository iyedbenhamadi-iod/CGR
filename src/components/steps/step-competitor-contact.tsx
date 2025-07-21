"use client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { StepProps } from "@/lib/form-types"

export default function StepCompetitorContact({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-foreground">
        {formData.typeRecherche === "concurrent" ? "Détails du Concurrent" : "Détails de l'Entreprise Cible"}
      </h2>
      <p className="text-lg text-muted-foreground">
        Veuillez fournir les informations nécessaires pour votre recherche spécifique.
      </p>

      {formData.typeRecherche === "concurrent" && (
        <div className="space-y-4">
          <Label htmlFor="nomConcurrent" className="text-lg font-medium text-foreground">
            Nom du concurrent à analyser *
          </Label>
          <Input
            id="nomConcurrent"
            value={formData.nomConcurrent}
            onChange={(e) => setFormData((prev) => ({ ...prev, nomConcurrent: e.target.value }))}
            placeholder="ex: Boman, RPK, Lesjöfors..."
            required
            className="h-12 text-base border-border focus:border-primary focus:ring-primary"
          />
        </div>
      )}

      {formData.typeRecherche === "contacts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Label htmlFor="nomEntreprise" className="text-lg font-medium text-foreground">
              Nom de l'entreprise *
            </Label>
            <Input
              id="nomEntreprise"
              value={formData.nomEntreprise}
              onChange={(e) => setFormData((prev) => ({ ...prev, nomEntreprise: e.target.value }))}
              placeholder="ex: Bosch, Continental..."
              required
              className="h-12 text-base border-border focus:border-primary focus:ring-primary"
            />
          </div>
          <div className="space-y-4">
            <Label htmlFor="siteWebEntreprise" className="text-lg font-medium text-foreground">
              Site web de l'entreprise
            </Label>
            <Input
              id="siteWebEntreprise"
              value={formData.siteWebEntreprise}
              onChange={(e) => setFormData((prev) => ({ ...prev, siteWebEntreprise: e.target.value }))}
              placeholder="https://..."
              className="h-12 text-base border-border focus:border-primary focus:ring-primary"
            />
          </div>
        </div>
      )}
    </div>
  )
}
