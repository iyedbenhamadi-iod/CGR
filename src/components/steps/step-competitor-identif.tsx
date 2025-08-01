"use client"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { type StepProps } from "@/lib/form-types"

// Types spécifiques pour l'identification de concurrents
const TYPES_PRODUITS = [
  { value: "ressort_fil", label: "Ressorts fil et spiraux" },
  { value: "ressort_feuillard", label: "Ressorts feuillard et ressorts plats" },
  { value: "piece_plastique", label: "Pièces plastiques et composants polymères" }
]

const VOLUMES_PRODUCTION = [
  { value: "petite_serie", label: "Petites séries (prototypage, séries limitées)" },
  { value: "moyenne_serie", label: "Moyennes séries (production récurrente)" },
  { value: "grande_serie", label: "Grandes séries (production de masse)" }
]

const REGIONS_PREDEFINIES = [
  "Auvergne-Rhône-Alpes",
  "Nouvelle-Aquitaine", 
  "Occitanie",
  "Provence-Alpes-Côte d'Azur",
  "Grand Est",
  "Hauts-de-France",
  "Normandie",
  "Bretagne",
  "Pays de la Loire",
  "Centre-Val de Loire",
  "Bourgogne-Franche-Comté",
  "Île-de-France",
  "Europe du Nord",
  "Europe de l'Est",
  "Amérique du Nord",
  "Asie-Pacifique"
]

export default function StepCompetitorIdentification({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-foreground">Identification de concurrents</h2>
      <p className="text-lg text-muted-foreground">
        Définissez les critères pour identifier vos concurrents selon leur région, spécialité produit et capacité de production.
      </p>

      {/* Région géographique */}
      <div className="space-y-4">
        <Label className="text-lg font-medium text-foreground">Région géographique cible</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Région prédéfinie</Label>
            <Select
              value={formData.location || ""}
              onValueChange={(value) => setFormData((prev) => ({ 
                ...prev, 
                regionGeographique: value,
                regionPersonnalisee: "" // Reset custom when selecting predefined
              }))}
            >
              <SelectTrigger className="h-12 text-base border-border focus:border-primary focus:ring-primary">
                <SelectValue placeholder="Sélectionner une région..." />
              </SelectTrigger>
              <SelectContent>
                {REGIONS_PREDEFINIES.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="regionPersonnalisee" className="text-sm font-medium text-muted-foreground">
              Ou région personnalisée
            </Label>
            <Input
              id="regionPersonnalisee"
              value={formData.regionPersonnalisee || ""}
              onChange={(e) => setFormData((prev) => ({ 
                ...prev, 
                regionPersonnalisee: e.target.value,
                regionGeographique: "" // Reset predefined when typing custom
              }))}
              placeholder="Ex: Bassin lémanique, Triangle d'or..."
              className="h-12 text-base border-border focus:border-primary focus:ring-primary"
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground italic">
          Choisissez une région prédéfinie ou saisissez une zone géographique spécifique
        </p>
      </div>

      {/* Type de produit */}
      <div className="space-y-4">
        <Label className="text-lg font-medium text-foreground">Spécialité produit recherchée</Label>
        <Select
          value={formData.typeProduitConcurrent || ""}
          onValueChange={(value) => setFormData((prev) => ({ ...prev, typeProduitConcurrent: value as 'ressort_fil' | 'ressort_feuillard' | 'piece_plastique' }))}
        >
          <SelectTrigger className="h-12 text-base border-border focus:border-primary focus:ring-primary">
            <SelectValue placeholder="Sélectionner un type de produit..." />
          </SelectTrigger>
          <SelectContent>
            {TYPES_PRODUITS.map((produit) => (
              <SelectItem key={produit.value} value={produit.value}>
                {produit.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Volume de production */}
      <div className="space-y-4">
        <Label className="text-lg font-medium text-foreground">Capacité de production souhaitée</Label>
        <Select
          value={formData.volumeProductionConcurrent || ""}
          onValueChange={(value) => setFormData((prev) => ({ ...prev, volumeProductionConcurrent: value as 'petite_serie' | 'moyenne_serie' | 'grande_serie' }))}
        >
          <SelectTrigger className="h-12 text-base border-border focus:border-primary focus:ring-primary">
            <SelectValue placeholder="Sélectionner un volume de production..." />
          </SelectTrigger>
          <SelectContent>
            {VOLUMES_PRODUCTION.map((volume) => (
              <SelectItem key={volume.value} value={volume.value}>
                {volume.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Nombre de résultats souhaités */}
      <div className="space-y-4">
        <Label htmlFor="nombreConcurrents" className="text-lg font-medium text-foreground">
          Nombre de concurrents à identifier
        </Label>
        <Select
          value={String(formData.nombreConcurrents || 10)}
          onValueChange={(value) => setFormData((prev) => ({ ...prev, nombreConcurrents: parseInt(value) }))}
        >
          <SelectTrigger className="h-12 text-base border-border focus:border-primary focus:ring-primary">
            <SelectValue placeholder="Sélectionner..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 concurrents</SelectItem>
            <SelectItem value="10">10 concurrents</SelectItem>
            <SelectItem value="15">15 concurrents</SelectItem>
            <SelectItem value="20">20 concurrents</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Critères additionnels optionnels */}
      <div className="space-y-4">
        <Label htmlFor="criteresAdditionnels" className="text-lg font-medium text-foreground">
          Critères additionnels (optionnel)
        </Label>
        <Input
          id="criteresAdditionnels"
          value={formData.criteresAdditionnels || ""}
          onChange={(e) => setFormData((prev) => ({ ...prev, criteresAdditionnels: e.target.value }))}
          placeholder="Ex: certification ISO, export international, innovation..."
          className="h-12 text-base border-border focus:border-primary focus:ring-primary"
        />
        <p className="text-sm text-muted-foreground">
          Ajoutez des critères spécifiques pour affiner la recherche (certifications, marchés, etc.)
        </p>
      </div>

      {/* Informations de contexte */}
      <div className="bg-muted/50 rounded-lg p-6 border border-border/50">
        <h3 className="text-lg font-semibold text-foreground mb-3">Informations collectées pour chaque concurrent :</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Nom de l'entreprise et présence géographique</li>
          <li>• Marchés cibles et spécialités techniques</li>
          <li>• Taille estimée et chiffre d'affaires</li>
          <li>• Publications et actualités récentes</li>
          <li>• Site web et coordonnées</li>
        </ul>
      </div>
    </div>
  )
}