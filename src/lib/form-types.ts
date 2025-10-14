import type React from "react"

export interface FormData {
  typeRecherche: string
  secteursActivite: string[]
  zoneGeographique: string[]
  secteurActiviteLibre: string // Nouveau champ libre
  zoneGeographiqueLibre: string // Nouveau champ libre
  tailleEntreprise: string
  motsCles: string
  produitsCGR: string[]
  autresProduits?: string // Nouveau champ pour les autres produits
  clientsExclure: string
  usinesCGR: string[]
  nomConcurrent: string
  nomEntreprise: string
  siteWebEntreprise: string
  nombreResultats: number
  contactRoles: string[] 
  location?: string
  
    regionGeographique?: string // Add this line
  showAutresProduits?: boolean // Nouveau champ pour afficher/masquer le champ libre
  regionPersonnalisee?: string
  typeProduitConcurrent?: 'ressort_fil' | 'ressort_feuillard' | 'piece_plastique'
  volumeProductionConcurrent?: 'petite_serie' | 'moyenne_serie' | 'grande_serie'
  nombreConcurrents?: number
  criteresAdditionnels?: string// Nouveau champ pour les rôles de contacts
  zoneGeographiqueCompetitor?: string[];
  zoneGeographiqueLibreCompetitor?: string;
  produitsCGRCompetitor?: string[];
  autresProduitsCompetitor?: string;
  showAutresProduitsCompetitor?: boolean;
}

export interface StepProps {
  formData: FormData
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
  onNext: () => void
  onPrevious: () => void
  isLastStep: boolean
  loading: boolean
  handleSubmit: (e: React.FormEvent) => void
}

export const SECTEURS_ACTIVITE = [
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

export const ZONES_GEOGRAPHIQUES = [
  "France ",
  "Allemagne",
  "Espagne",
  "Roumanie",
  "Pologne",
  "Brésil",
  "Thaïlande",
  "Chine",
  "Mexique",
  "Royaume-Uni",
  "Europe",
  "Monde Entier"
]
  export const PRODUITS_CGR = [
  "Ressort fil",
  "Ressort plat",
  "Pièce découpée",
  "Formage de tubes",
  "Assemblage automatisé",
  "Mécatronique",
  "Injection plastique",
]

export const USINES_CGR = ["Sevran", "Blagnac", "PMPC", "Tricot", "Igé", "Saint-Yorre"]

export const CLIENTS_EXISTANTS = ["Forvia", "Valeo", "Schneider Electric", "Dassault Aviation", "Thales", "Safran"]

// Nouveaux rôles de contacts
export const CONTACT_ROLES = [
  "Responsable achat",
  "Responsable achat métal", 
  "Responsable achat ressort",
  "Responsable découpe",
  "Acheteur commodité",
  "Acheteur projet",
  "Responsable Achats/Approvisionnement",
  "Directeur Production/Qualité"]