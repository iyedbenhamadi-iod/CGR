"use client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { type StepProps, SECTEURS_ACTIVITE, ZONES_GEOGRAPHIQUES } from "@/lib/form-types"

export default function StepBasicParameters({ formData, setFormData }: StepProps) {
  const handleArrayChange = (field: string, value: string, checked: boolean) =>
    setFormData((prev) => ({
      ...prev,
      [field]: checked
        ? [...(prev[field as keyof typeof prev] as string[]), value]
        : (prev[field as keyof typeof prev] as string[]).filter((item) => item !== value),
    }))

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-foreground">Définissez vos paramètres de recherche de base</h2>
      <p className="text-lg text-muted-foreground">
        Ces critères généraux vous aideront à cibler les entreprises pertinentes.
      </p>

      {/* Secteurs d'activité */}
      <div className="space-y-4">
        <Label className="text-lg font-medium text-foreground">Secteurs d'activité cibles</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {SECTEURS_ACTIVITE.map((secteur) => (
            <div key={secteur} className="flex items-center space-x-3">
              <Checkbox
                id={secteur}
                checked={formData.secteursActivite.includes(secteur)}
                onCheckedChange={(checked) => handleArrayChange("secteursActivite", secteur, checked as boolean)}
              />
              <Label htmlFor={secteur} className="text-base text-muted-foreground cursor-pointer">
                {secteur}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Zone géographique */}
      <div className="space-y-4">
        <Label className="text-lg font-medium text-foreground">Zone géographique</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {ZONES_GEOGRAPHIQUES.map((zone) => (
            <div key={zone} className="flex items-center space-x-3">
              <Checkbox
                id={zone}
                checked={formData.zoneGeographique.includes(zone)}
                onCheckedChange={(checked) => handleArrayChange("zoneGeographique", zone, checked as boolean)}
              />
              <Label htmlFor={zone} className="text-base text-muted-foreground cursor-pointer">
                {zone}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Taille entreprise et mots-clés */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Label className="text-lg font-medium text-foreground">Taille de l'entreprise cible</Label>
          <Select
            value={formData.tailleEntreprise}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, tailleEntreprise: value }))}
          >
            <SelectTrigger className="h-12 text-base border-border focus:border-primary focus:ring-primary">
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PME">PME (moins de 250 employés)</SelectItem>
              <SelectItem value="ETI">ETI (de 250 à 5000 employés)</SelectItem>
              <SelectItem value="Grand Groupe">Grand Groupe (plus de 5000 employés)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-4">
          <Label htmlFor="motsCles" className="text-lg font-medium text-foreground">
            Mots-clés spécifiques
          </Label>
          <Input
            id="motsCles"
            value={formData.motsCles}
            onChange={(e) => setFormData((prev) => ({ ...prev, motsCles: e.target.value }))}
            placeholder="moteur électrique, système de freinage..."
            className="h-12 text-base border-border focus:border-primary focus:ring-primary"
          />
        </div>
      </div>
    </div>
  )
}
