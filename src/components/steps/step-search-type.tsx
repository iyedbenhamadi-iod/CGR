"use client"
import { Building2, Users, Target, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StepProps } from "@/lib/form-types"

const getSearchTypeIcon = (type: string) => {
  switch (type) {
    case "brainstorming":
      return <Target className="w-6 h-6" />
    case "concurrent":
      return <Users className="w-6 h-6" />
    case "entreprises":
      return <Building2 className="w-6 h-6" />
    case "contacts":
      return <Search className="w-6 h-6" />
    default:
      return <Search className="w-6 h-6" />
  }
}

export default function StepSearchType({ formData, setFormData }: StepProps) {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-foreground">Choisissez votre type de recherche</h2>
      <p className="text-lg text-muted-foreground">
        Sélectionnez l'objectif principal de votre prospection pour affiner les paramètres.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          {
            value: "brainstorming",
            label: "Brainstorming de nouveaux marchés",
            desc: "Identifier de nouveaux secteurs d'opportunité et des entreprises innovantes.",
          },
          {
            value: "concurrent",
            label: "Analyse d'un concurrent",
            desc: "Obtenir des informations détaillées sur la stratégie et les clients d'un concurrent.",
          },
          {
            value: "entreprises",
            label: "Recherche d'entreprises",
            desc: "Trouver des prospects qualifiés selon des critères précis.",
          },
          {
            value: "contacts",
            label: "Identification de contacts",
            desc: "Découvrir les bons interlocuteurs au sein d'une entreprise cible.",
          },
        ].map((type) => (
          <div
            key={type.value}
            className={cn(
              "p-6 rounded-xl cursor-pointer transition-all duration-300 ease-in-out border-2",
              "flex items-start gap-5 group",
              formData.typeRecherche === type.value
                ? "border-primary bg-primary text-primary-foreground shadow-lg transform scale-[1.02]"
                : "border-border bg-background hover:border-primary/50 hover:shadow-md",
            )}
            onClick={() => setFormData((prev) => ({ ...prev, typeRecherche: type.value }))}
          >
            <div
              className={cn(
                "p-3 rounded-lg transition-colors duration-300",
                formData.typeRecherche === type.value
                  ? "bg-primary-foreground text-primary"
                  : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary",
              )}
            >
              {getSearchTypeIcon(type.value)}
            </div>
            <div>
              <div
                className={cn(
                  "font-semibold text-xl",
                  formData.typeRecherche === type.value ? "text-primary-foreground" : "text-foreground",
                )}
              >
                {type.label}
              </div>
              <div
                className={cn(
                  "text-base mt-1",
                  formData.typeRecherche === type.value ? "text-primary-foreground/90" : "text-muted-foreground",
                )}
              >
                {type.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
