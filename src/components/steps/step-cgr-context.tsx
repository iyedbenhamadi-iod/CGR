"use client"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { type StepProps, PRODUITS_CGR, CLIENTS_EXISTANTS, USINES_CGR } from "@/lib/form-types"

export default function StepCGRContext({ formData, setFormData }: StepProps) {
  const handleArrayChange = (field: string, value: string, checked: boolean) =>
    setFormData((prev) => ({
      ...prev,
      [field]: checked
        ? [...(prev[field as keyof typeof prev] as string[]), value]
        : (prev[field as keyof typeof prev] as string[]).filter((item) => item !== value),
    }))

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-foreground">Précisez le contexte CGR International</h2>
      <p className="text-lg text-muted-foreground">
        Ces informations nous aideront à aligner la recherche avec les capacités et les objectifs de CGR.
      </p>

      {/* Produits CGR */}
      <div className="space-y-4">
        <Label className="text-lg font-medium text-foreground">Produits CGR à proposer</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {PRODUITS_CGR.map((produit) => (
            <div key={produit} className="flex items-center space-x-3">
              <Checkbox
                id={produit}
                checked={formData.produitsCGR.includes(produit)}
                onCheckedChange={(checked) => handleArrayChange("produitsCGR", produit, checked as boolean)}
              />
              <Label htmlFor={produit} className="text-base text-muted-foreground cursor-pointer">
                {produit}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Volume de pièces */}
      <div className="space-y-4">
        <Label className="text-lg font-medium text-foreground">Volume de pièces annuel attendu</Label>
        <div className="px-3 pt-2">
          <Slider
            value={formData.volumePieces}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, volumePieces: value }))}
            max={10000000}
            min={1000}
            step={10000}
            className="w-full"
          />
          <div className="flex justify-between text-base text-muted-foreground mt-3">
            <span>1K</span>
            <span className="font-semibold text-primary">{formData.volumePieces[0].toLocaleString()} pièces/an</span>
            <span>10M</span>
          </div>
        </div>
      </div>

      {/* Clients à exclure */}
      <div className="space-y-4">
        <Label htmlFor="clientsExclure" className="text-lg font-medium text-foreground">
          Clients existants à exclure
        </Label>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {CLIENTS_EXISTANTS.map((client) => (
              <Badge
                key={client}
                variant="secondary"
                className="text-base px-4 py-1.5 rounded-full font-normal bg-primary/10 text-primary"
              >
                {client}
              </Badge>
            ))}
          </div>
          <Textarea
            id="clientsExclure"
            value={formData.clientsExclure}
            onChange={(e) => setFormData((prev) => ({ ...prev, clientsExclure: e.target.value }))}
            placeholder="Ajouter d'autres clients à exclure (un par ligne)..."
            rows={2}
            className="min-h-[70px] text-base border-border focus:border-primary focus:ring-primary"
          />
        </div>
      </div>

      {/* Usines CGR */}
      <div className="space-y-4">
        <Label className="text-lg font-medium text-foreground">Usines CGR de référence (pour recherche locale)</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {USINES_CGR.map((usine) => (
            <div key={usine} className="flex items-center space-x-3">
              <Checkbox
                id={usine}
                checked={formData.usinesCGR.includes(usine)}
                onCheckedChange={(checked) => handleArrayChange("usinesCGR", usine, checked as boolean)}
              />
              <Label htmlFor={usine} className="text-base text-muted-foreground cursor-pointer">
                {usine}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
