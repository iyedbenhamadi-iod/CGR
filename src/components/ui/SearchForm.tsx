"use client"

import type React from "react"
import { useState } from "react"
import { Search, Building2, Users, Package, Factory, Target, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"

interface SearchFormProps {
  onSearch: (data: any) => void
  loading: boolean
}

const SECTEURS_ACTIVITE = [
  "Médical",
  "Aéronautique",
  "Biens de consommation",
  "Pompes et vannes",
  "Industrie électrique",
  "Automobile",
  "Énergie",
  "Défense",
  "Ferroviaire",
]

const ZONES_GEOGRAPHIQUES = [
  "Rhône-Alpes",
  "Île-de-France",
  "PACA",
  "Nouvelle-Aquitaine",
  "France",
  "Europe",
  "Proximité usine Tricot",
  "Proximité usine PMPC",
]

const PRODUITS_CGR = [
  "Ressort fil",
  "Ressort plat",
  "Pièce découpée",
  "Formage de tubes",
  "Assemblage automatisé",
  "Mécatronique",
  "Injection plastique",
]

const USINES_CGR = ["Sevran", "Blagnac", "PMPC", "Tricot", "Igé", "Saint-Yorre"]

const CLIENTS_EXISTANTS = ["Forvia", "Valeo", "Schneider Electric", "Dassault Aviation", "Thales", "Safran"]

export default function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [searchType, setSearchType] = useState("")
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    context: false,
    advanced: false,
  })

  const [formData, setFormData] = useState({
    // Paramètres de base
    typeRecherche: "",
    secteursActivite: [] as string[],
    zoneGeographique: ["France"] as string[],
    tailleEntreprise: "",
    motsCles: "",

    // Contexte CGR
    produitsCGR: [] as string[],
    volumePieces: [100000],
    clientsExclure: "",
    usinesCGR: [] as string[],

    // Champs spécifiques selon le type
    nomConcurrent: "",
    nomEntreprise: "",
    siteWebEntreprise: "",
    nombreResultats: 10,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const handleArrayChange = (field: string, value: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: checked
        ? [...(prev[field as keyof typeof prev] as string[]), value]
        : (prev[field as keyof typeof prev] as string[]).filter((item) => item !== value),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(formData)
  }

  const getSearchTypeIcon = (type: string) => {
    switch (type) {
      case "brainstorming":
        return <Target className="w-4 h-4" />
      case "concurrent":
        return <Users className="w-4 h-4" />
      case "entreprises":
        return <Building2 className="w-4 h-4" />
      case "contacts":
        return <Search className="w-4 h-4" />
      default:
        return <Search className="w-4 h-4" />
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Search className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-2xl">Recherche de Prospects IA</CardTitle>
            <CardDescription>Outil de prospection intelligent pour les équipes commerciales CGR</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type de recherche */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Type de recherche *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  value: "brainstorming",
                  label: "Brainstorming de nouveaux marchés",
                  desc: "Identifier de nouveaux secteurs d'opportunité",
                },
                {
                  value: "concurrent",
                  label: "Analyse d'un concurrent",
                  desc: "Analyser la stratégie d'un concurrent",
                },
                { value: "entreprises", label: "Recherche d'entreprises", desc: "Trouver des prospects qualifiés" },
                { value: "contacts", label: "Identification de contacts", desc: "Trouver les bons interlocuteurs" },
              ].map((type) => (
                <div
                  key={type.value}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.typeRecherche === type.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setFormData((prev) => ({ ...prev, typeRecherche: type.value }))}
                >
                  <div className="flex items-start gap-3">
                    {getSearchTypeIcon(type.value)}
                    <div>
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-gray-600 mt-1">{type.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Champs spécifiques selon le type */}
          {formData.typeRecherche === "concurrent" && (
            <div className="space-y-3">
              <Label htmlFor="concurrent">Nom du concurrent à analyser *</Label>
              <Input
                id="concurrent"
                value={formData.nomConcurrent}
                onChange={(e) => setFormData((prev) => ({ ...prev, nomConcurrent: e.target.value }))}
                placeholder="ex: Boman, RPK, Lesjöfors..."
                required
              />
            </div>
          )}

          {formData.typeRecherche === "contacts" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label htmlFor="entreprise">Nom de l'entreprise *</Label>
                <Input
                  id="entreprise"
                  value={formData.nomEntreprise}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nomEntreprise: e.target.value }))}
                  placeholder="ex: Bosch, Continental..."
                  required
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="siteWeb">Site web de l'entreprise</Label>
                <Input
                  id="siteWeb"
                  value={formData.siteWebEntreprise}
                  onChange={(e) => setFormData((prev) => ({ ...prev, siteWebEntreprise: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          {/* Section Paramètres de base */}
          {(formData.typeRecherche === "brainstorming" || formData.typeRecherche === "entreprises") && (
            <Card>
              <CardHeader className="cursor-pointer" onClick={() => toggleSection("basic")}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Paramètres de recherche
                  </CardTitle>
                  {expandedSections.basic ? <ChevronUp /> : <ChevronDown />}
                </div>
              </CardHeader>

              {expandedSections.basic && (
                <CardContent className="space-y-4">
                  {/* Secteurs d'activité */}
                  <div className="space-y-3">
                    <Label>Secteurs d'activité cibles</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {SECTEURS_ACTIVITE.map((secteur) => (
                        <div key={secteur} className="flex items-center space-x-2">
                          <Checkbox
                            id={secteur}
                            checked={formData.secteursActivite.includes(secteur)}
                            onCheckedChange={(checked) =>
                              handleArrayChange("secteursActivite", secteur, checked as boolean)
                            }
                          />
                          <Label htmlFor={secteur} className="text-sm">
                            {secteur}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Zone géographique */}
                  <div className="space-y-3">
                    <Label>Zone géographique</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {ZONES_GEOGRAPHIQUES.map((zone) => (
                        <div key={zone} className="flex items-center space-x-2">
                          <Checkbox
                            id={zone}
                            checked={formData.zoneGeographique.includes(zone)}
                            onCheckedChange={(checked) =>
                              handleArrayChange("zoneGeographique", zone, checked as boolean)
                            }
                          />
                          <Label htmlFor={zone} className="text-sm">
                            {zone}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Taille entreprise et mots-clés */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label>Taille de l'entreprise cible</Label>
                      <Select
                        value={formData.tailleEntreprise}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, tailleEntreprise: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PME">PME (moins de 250 employés)</SelectItem>
                          <SelectItem value="ETI">ETI (de 250 à 5000 employés)</SelectItem>
                          <SelectItem value="Grand Groupe">Grand Groupe (plus de 5000 employés)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="motsCles">Mots-clés spécifiques</Label>
                      <Input
                        id="motsCles"
                        value={formData.motsCles}
                        onChange={(e) => setFormData((prev) => ({ ...prev, motsCles: e.target.value }))}
                        placeholder="moteur électrique, système de freinage..."
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Section Contexte CGR */}
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => toggleSection("context")}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Factory className="w-5 h-5" />
                  Contexte CGR International
                </CardTitle>
                {expandedSections.context ? <ChevronUp /> : <ChevronDown />}
              </div>
            </CardHeader>

            {expandedSections.context && (
              <CardContent className="space-y-4">
                {/* Produits CGR */}
                <div className="space-y-3">
                  <Label>Produits CGR à proposer</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {PRODUITS_CGR.map((produit) => (
                      <div key={produit} className="flex items-center space-x-2">
                        <Checkbox
                          id={produit}
                          checked={formData.produitsCGR.includes(produit)}
                          onCheckedChange={(checked) => handleArrayChange("produitsCGR", produit, checked as boolean)}
                        />
                        <Label htmlFor={produit} className="text-sm">
                          {produit}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Volume de pièces */}
                <div className="space-y-3">
                  <Label>Volume de pièces annuel attendu</Label>
                  <div className="px-3">
                    <Slider
                      value={formData.volumePieces}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, volumePieces: value }))}
                      max={10000000}
                      min={1000}
                      step={10000}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>1K</span>
                      <span className="font-medium">{formData.volumePieces[0].toLocaleString()} pièces/an</span>
                      <span>10M</span>
                    </div>
                  </div>
                </div>

                {/* Clients à exclure */}
                <div className="space-y-3">
                  <Label htmlFor="clientsExclure">Clients existants à exclure</Label>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {CLIENTS_EXISTANTS.map((client) => (
                        <Badge key={client} variant="secondary" className="text-xs">
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
                    />
                  </div>
                </div>

                {/* Usines CGR */}
                <div className="space-y-3">
                  <Label>Usines CGR de référence (pour recherche locale)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {USINES_CGR.map((usine) => (
                      <div key={usine} className="flex items-center space-x-2">
                        <Checkbox
                          id={usine}
                          checked={formData.usinesCGR.includes(usine)}
                          onCheckedChange={(checked) => handleArrayChange("usinesCGR", usine, checked as boolean)}
                        />
                        <Label htmlFor={usine} className="text-sm">
                          {usine}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Section Paramètres avancés */}
          {formData.typeRecherche === "entreprises" && (
            <Card>
              <CardHeader className="cursor-pointer" onClick={() => toggleSection("advanced")}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Paramètres avancés
                  </CardTitle>
                  {expandedSections.advanced ? <ChevronUp /> : <ChevronDown />}
                </div>
              </CardHeader>

              {expandedSections.advanced && (
                <CardContent>
                  <div className="space-y-3">
                    <Label htmlFor="nombreResultats">Nombre de résultats souhaités</Label>
                    <Select
                      value={formData.nombreResultats.toString()}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, nombreResultats: Number.parseInt(value) }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 entreprises</SelectItem>
                        <SelectItem value="10">10 entreprises</SelectItem>
                        <SelectItem value="20">20 entreprises</SelectItem>
                        <SelectItem value="50">50 entreprises</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Bouton de soumission */}
          <Button type="submit" disabled={loading || !formData.typeRecherche} className="w-full h-12 text-lg" size="lg">
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={20} />
                Recherche en cours...
              </>
            ) : (
              <>
                <Search className="mr-2" size={20} />
                Lancer la recherche IA
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}