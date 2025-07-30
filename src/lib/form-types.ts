import type React from "react"

export interface FormData {
  typeRecherche: string
  secteursActivite: string[]
  zoneGeographique: string[]
  tailleEntreprise: string
  motsCles: string
  produitsCGR: string[]
  volumePieces: number[]
  clientsExclure: string
  usinesCGR: string[]
  nomConcurrent: string
  nomEntreprise: string
  siteWebEntreprise: string
  nombreResultats: number
  contactRoles: string[] // Nouveau champ pour les rôles de contacts
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
  "Rhône-Alpes",
  "Île-de-France",
  "PACA",
  "Nouvelle-Aquitaine",
  "France",
  "Europe",
  "Proximité usine Tricot",
  "Proximité usine PMPC",
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
  "Directeur Technique/R&D/Innovation",
  "Responsable Achats/Approvisionnement",
  "Directeur Production/Qualité",
  "Direction Générale"
]