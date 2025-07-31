"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FormData } from "@/lib/form-types"

// Step Components
import StepSearchType from "./steps/step-search-type"
import StepCompetitorContact from "./steps/step-competitor-contact"
import StepCompetitorIdentification from "./steps/step-competitor-identif"
import StepBasicParameters from "./steps/step-basic-parameters"
import StepCGRContext from "./steps/step-cgr-context"
import StepAdvancedParameters from "./steps/step-advanced-parameters"
import StepContactroles from "./steps/step-contact-roles"

interface SearchWizardProps {
  onSearch: (data: FormData) => void
  loading: boolean
}

export default function SearchWizard({ onSearch, loading }: SearchWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<FormData>({
    typeRecherche: "",
    secteursActivite: [],
    zoneGeographique: ["France"],
    tailleEntreprise: "",
    motsCles: "",
    produitsCGR: [],
    volumePieces: [100000],
    clientsExclure: "",
    usinesCGR: [],
    nomConcurrent: "",
    nomEntreprise: "",
    siteWebEntreprise: "",
    nombreResultats: 10,
    contactRoles: [],
    // Nouveaux champs pour l'identification de concurrents
    regionGeographique: "",
    regionPersonnalisee: "",
    typeProduitConcurrent: undefined,
    volumeProductionConcurrent: undefined,
    nombreConcurrents: 10,
    criteresAdditionnels: "",
  })

  const steps = [
    {
      id: "type",
      name: "Type de Recherche",
      component: StepSearchType,
      condition: true,
    },
    {
      id: "competitor-contact",
      name: "Détails Spécifiques",
      component: StepCompetitorContact,
      condition: formData.typeRecherche === "concurrent" 
    },
    {
      id: "competitor-identification",
      name: "Identification Concurrents",
      component: StepCompetitorIdentification,
      condition: formData.typeRecherche === "identification_concurrents"
    },
    {
      id: "basic-params",
      name: "Paramètres de Base",
      component: StepBasicParameters,
      condition: formData.typeRecherche === "brainstorming" || formData.typeRecherche === "entreprises",
    },
    {
      id: "cgr-context",
      name: "Contexte CGR",
      component: StepCGRContext,
      condition: formData.typeRecherche === "brainstorming" || formData.typeRecherche === "entreprises",
    },
    {
      id: "advanced-params",
      name: "Paramètres Avancés",
      component: StepAdvancedParameters,
      condition: formData.typeRecherche === "entreprises",
    },
    {
      id: "competitor-contact-roles",
      name: "Rôles de Contact Concurrent",
      component: StepContactroles,
      condition: formData.typeRecherche === "contacts",
    },
  ]

  const visibleSteps = steps.filter((step) => step.condition)
  const totalSteps = visibleSteps.length

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(formData)
  }

  const CurrentStepComponent = visibleSteps[currentStep]?.component

  return (
    <Card className="w-full max-w-5xl mx-auto bg-card text-foreground rounded-3xl shadow-2xl overflow-hidden border border-border/50">
      <CardHeader className="p-10 bg-gradient-to-br from-primary/5 to-background border-b border-border/50">
        <div className="flex items-center gap-6">
          <div className="p-6 bg-primary rounded-full shadow-xl">
            <Search className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-5xl font-extrabold tracking-tight leading-tight text-foreground">
              Plateforme de Prospection IA
            </CardTitle>
            <CardDescription className="text-xl text-muted-foreground mt-2">
              Optimisez votre recherche de prospects avec l'intelligence artificielle
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-10">
        {/* Progress Indicator */}
        <div className="mb-10">
          <div className="flex justify-between text-sm font-medium text-muted-foreground mb-2">
            {visibleSteps.map((step, index) => (
              <span
                key={step.id}
                className={cn(
                  "transition-colors duration-300",
                  index === currentStep && "text-primary font-semibold",
                  index < currentStep && "text-accent",
                )}
              >
                Étape {index + 1}: {step.name}
              </span>
            ))}
          </div>
          <div className="w-full bg-muted-foreground/20 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Step Content */}
        <div className="min-h-[400px] flex flex-col justify-between">
          {CurrentStepComponent && (
            <CurrentStepComponent
              formData={formData}
              setFormData={setFormData}
              onNext={handleNext}
              onPrevious={handlePrevious}
              isLastStep={currentStep === totalSteps - 1}
              loading={loading}
              handleSubmit={handleSubmit}
            />
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-10 pt-6 border-t border-border/50">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0 || loading}
              className="h-12 px-6 text-lg font-semibold bg-transparent"
            >
              <ChevronLeft className="mr-2 h-5 w-5" />
              Précédent
            </Button>
            {currentStep < totalSteps - 1 ? (
              <Button
                onClick={handleNext}
                disabled={loading || !formData.typeRecherche} // Basic validation for first step
                className="h-12 px-6 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Suivant
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || !formData.typeRecherche}
                className="h-12 px-8 text-xl font-bold tracking-wide transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-3" size={24} />
                    Recherche en cours...
                  </>
                ) : (
                  <>
                    <Search className="mr-3" size={24} />
                    Lancer la recherche IA
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}