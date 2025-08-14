"use client"

import React from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

// --- TYPES AND CONSTANTS ---
// These definitions are included here to make the component self-contained.

export interface FormData {
  typeRecherche: string
  secteursActivite: string[]
  zoneGeographique: string[]
  secteurActiviteLibre: string
  zoneGeographiqueLibre: string
  tailleEntreprise: string
  motsCles: string
  produitsCGR: string[]
  autresProduits?: string
  volumePieces: number[]
  clientsExclure: string
  usinesCGR: string[]
  nomConcurrent: string
  nomEntreprise: string
  siteWebEntreprise: string
  nombreResultats: number
  contactRoles: string[]
  location?: string
  regionGeographique?: string
  showAutresProduits?: boolean
  regionPersonnalisee?: string
  typeProduitConcurrent?: 'ressort_fil' | 'ressort_feuillard' | 'piece_plastique'
  volumeProductionConcurrent?: 'petite_serie' | 'moyenne_serie' | 'grande_serie'
  nombreConcurrents?: number
  criteresAdditionnels?: string
  // Fields for this specific form step
  produitsCGRCompetitor?: string[];
  autresProduitsCompetitor?: string;
  showAutresProduitsCompetitor?: boolean;
}

export interface StepProps {
  formData: FormData
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
}

export const ZONES_GEOGRAPHIQUES = [
  "France ", "Allemagne", "Espagne", "Roumanie", "Pologne", 
  "Brésil", "Thaïlande", "Chine", "Mexique", "Royaume-Uni"
]

export const PRODUITS_CGR = [
  "Ressort fil", "Ressort plat", "Pièce découpée", "Formage de tubes",
  "Assemblage automatisé", "Mécatronique", "Injection plastique",
]

const VOLUMES_PRODUCTION = [
  { value: "petite_serie", label: "Petites séries (prototypage, séries limitées)" },
  { value: "moyenne_serie", label: "Moyennes séries (production récurrente)" },
  { value: "grande_serie", label: "Grandes séries (production de masse)" }
];

// --- COMPONENT ---

export default function StepCompetitorIdentification({ formData, setFormData }: StepProps) {

  // --- HANDLERS ---

  const handleZoneChange = (zone: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      regionGeographique: checked ? zone : "",
      regionPersonnalisee: ""
    }));
  };

  const handleCustomZoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      regionPersonnalisee: e.target.value,
      regionGeographique: ""
    }));
  };

  const handleProductArrayChange = (value: string, checked: boolean) => {
    const currentProducts = formData.produitsCGRCompetitor || [];
    setFormData((prev) => ({
      ...prev,
      produitsCGRCompetitor: checked
        ? [...currentProducts, value]
        : currentProducts.filter((item) => item !== value),
    }));
  };

  const handleShowAutresProduits = (checked: boolean) => {
    setFormData((prev) => {
      const existingCustomProduct = prev.autresProduitsCompetitor || "";
      const currentProducts = prev.produitsCGRCompetitor || [];
      
      return {
        ...prev,
        showAutresProduitsCompetitor: checked,
        // If unchecking, remove the custom product from the main array
        produitsCGRCompetitor: checked ? currentProducts : currentProducts.filter(p => p !== existingCustomProduct),
        // And clear the custom product field itself
        autresProduitsCompetitor: checked ? existingCustomProduct : ""
      };
    });
  };

  const handleAutresProduitsInput = (value: string) => {
    setFormData((prev) => {
      const oldCustomValue = prev.autresProduitsCompetitor || "";
      const currentProducts = prev.produitsCGRCompetitor || [];
      // Remove the previous custom product value from the array
      const filteredProduits = currentProducts.filter(p => p !== oldCustomValue);
      
      return {
        ...prev,
        autresProduitsCompetitor: value,
        // Add the new custom product to the array if it's not empty
        produitsCGRCompetitor: value.trim() ? [...filteredProduits, value.trim()] : filteredProduits
      };
    });
  };

  const isAutresChecked = formData.showAutresProduitsCompetitor || !!formData.autresProduitsCompetitor;

  // --- RENDER ---

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-foreground">Identification de concurrents</h2>
      <p className="text-lg text-muted-foreground">
        Définissez les critères pour identifier vos concurrents selon leur région, spécialité produit et capacité de production.
      </p>

      {/* Section: Région géographique */}
      <div className="space-y-4">
        <Label className="text-lg font-medium text-foreground">Région géographique cible</Label>
        {/* ... (Region selection UI remains the same as previous version) ... */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {ZONES_GEOGRAPHIQUES.map((zone) => (
            <div key={zone} className="flex items-center space-x-3">
              <Checkbox
                id={`competitor-zone-${zone}`}
                checked={formData.regionGeographique === zone}
                onCheckedChange={(checked) => handleZoneChange(zone, checked as boolean)}
              />
              <Label htmlFor={`competitor-zone-${zone}`} className="text-base text-muted-foreground cursor-pointer">{zone}</Label>
            </div>
          ))}
        </div>
        <div className="space-y-2 pt-4 border-t border-border">
          <Label htmlFor="zoneGeographiquePersonnalisee" className="text-base font-medium text-muted-foreground">Ou région personnalisée (précisez)</Label>
          <Input id="zoneGeographiquePersonnalisee" value={formData.regionPersonnalisee || ""} onChange={handleCustomZoneChange} placeholder="Ex: Bassin lémanique, Triangle d'or..." className="h-12 text-base border-border focus:border-primary focus:ring-primary" />
        </div>
      </div>

      {/* Section: Type de produit (New multi-select UI) */}
      <div className="space-y-4">
        <Label className="text-lg font-medium text-foreground">Spécialité(s) produit recherchée(s)</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {PRODUITS_CGR.map((produit) => (
            <div key={produit} className="flex items-center space-x-3">
              <Checkbox
                id={`competitor-produit-${produit}`}
                checked={(formData.produitsCGRCompetitor || []).includes(produit)}
                onCheckedChange={(checked) => handleProductArrayChange(produit, checked as boolean)}
              />
              <Label htmlFor={`competitor-produit-${produit}`} className="text-base text-muted-foreground cursor-pointer">{produit}</Label>
            </div>
          ))}
        </div>
        <div className="col-span-full space-y-3 pt-4 border-t border-border">
          <div className="flex items-center space-x-3">
            <Checkbox id="autres-produits-competitor" checked={isAutresChecked} onCheckedChange={(checked) => handleShowAutresProduits(checked as boolean)} />
            <Label htmlFor="autres-produits-competitor" className="text-base text-muted-foreground cursor-pointer">Autres produits (préciser)</Label>
          </div>
          {isAutresChecked && (
            <div className="ml-6">
              <Input
                id="champ-libre-produits-competitor"
                value={formData.autresProduitsCompetitor || ""}
                onChange={(e) => handleAutresProduitsInput(e.target.value)}
                placeholder="Spécifiez les autres produits souhaités..."
                className="text-base border-border focus:border-primary focus:ring-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* --- UNCHANGED SECTIONS --- */}
      {/* ... (Volume, Nombre de résultats, etc. remain the same) ... */}
       <div className="space-y-4">
        <Label className="text-lg font-medium text-foreground">Capacité de production souhaitée</Label>
        <Select value={formData.volumeProductionConcurrent || ""} onValueChange={(value) => setFormData((prev) => ({ ...prev, volumeProductionConcurrent: value as 'petite_serie' | 'moyenne_serie' | 'grande_serie' }))} >
          <SelectTrigger className="h-12 text-base border-border focus:border-primary focus:ring-primary">
            <SelectValue placeholder="Sélectionner un volume de production..." />
          </SelectTrigger>
          <SelectContent>
            {VOLUMES_PRODUCTION.map((volume) => ( <SelectItem key={volume.value} value={volume.value}>{volume.label}</SelectItem> ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-4">
        <Label htmlFor="nombreConcurrents" className="text-lg font-medium text-foreground">Nombre de concurrents à identifier</Label>
        <Select value={String(formData.nombreConcurrents || 10)} onValueChange={(value) => setFormData((prev) => ({ ...prev, nombreConcurrents: parseInt(value) }))} >
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
      <div className="space-y-4">
        <Label htmlFor="criteresAdditionnels" className="text-lg font-medium text-foreground">Critères additionnels (optionnel)</Label>
        <Input id="criteresAdditionnels" value={formData.criteresAdditionnels || ""} onChange={(e) => setFormData((prev) => ({ ...prev, criteresAdditionnels: e.target.value }))} placeholder="Ex: certification ISO, export international, innovation..." className="h-12 text-base border-border focus:border-primary focus:ring-primary" />
        <p className="text-sm text-muted-foreground">Ajoutez des critères spécifiques pour affiner la recherche (certifications, marchés, etc.)</p>
      </div>
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
