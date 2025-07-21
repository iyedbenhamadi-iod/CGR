"use client"

import { useState } from "react"
import ResultsDisplay from "@/components/ui/ResultsDisplay" // Assuming this component exists
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TriangleAlert, Loader2, Undo2 } from "lucide-react" // Using Lucide icons for alerts
import SearchWizard from "@/components/searchWizard"
import { Button } from "@/components/ui/button" // Import Button component

export default function Dashboard() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSearch = async (searchData: any) => {
    setLoading(true)
    setError("")
    setResults(null) // Clear previous results
    console.log("Frontend: Initiating search with data:", searchData)
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(searchData),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Erreur lors de la recherche")
      }
      const data = await response.json()
      console.log("Frontend: 🔍 API Response received:", data)
      // Transform the API response to match ResultsDisplay expectations
      const transformedData = transformApiResponse(data)
      console.log("Frontend: 🔄 Transformed Data for ResultsDisplay:", transformedData)
      setResults(transformedData)
    } catch (err: any) {
      setError(`Erreur lors de la recherche: ${err.message || "Veuillez réessayer."}`)
      console.error("Frontend: ❌ Search Error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleNewSearch = () => {
    setResults(null)
    setError("")
  }

  const transformApiResponse = (data: any) => {
    const baseResponse = {
      searchType: data.searchType || data.type, // Use searchType if available, fallback to type
      totalFound: data.totalFound || 0,
      cached: data.cached || false,
      sources: data.sources || [],
      searchId: data.searchId || undefined, // Pass searchId if available
    }
    switch (baseResponse.searchType) {
      case "brainstorming":
        return {
          ...baseResponse,
          marketOpportunities:
            data.marketOpportunities?.map((market: any) => ({
              nom_marche: market.nom_marche,
              justification: market.justification,
              produits_cgr_applicables: market.produits_cgr_applicables || [],
              exemples_entreprises: market.exemples_entreprises || [],
            })) || [],
        }
      case "concurrent":
        return {
          ...baseResponse,
          competitorAnalysis: data?.competitorAnalysis
            ? {
                nom_entreprise: data.competitorAnalysis.nom_entreprise || "",
                synthese: data.competitorAnalysis.synthese || "",
                produits_services: data.competitorAnalysis.produits_services || [],
                marches_cibles: data.competitorAnalysis.marches_cibles || [],
                forces_apparentes: data.competitorAnalysis.forces_apparentes || [],
                faiblesses_potentielles: data.competitorAnalysis.faiblesses_potentielles || [],
                strategie_communication: data.competitorAnalysis.strategie_communication || "",
                sources: data.competitorAnalysis.sources || [],
              }
            : null,
        }
      case "contacts":
        return {
          ...baseResponse,
          contacts:
            data.contacts?.map((contact: any) => ({
              nom: contact.nom || "",
              prenom: contact.prenom || "",
              poste: contact.poste || "",
              email: contact.email || undefined,
              phone: contact.phone || undefined,
              linkedin_url: contact.linkedin_url || undefined,
              verified: contact.verified || false,
              accroche_personnalisee: contact.accroche_personnalisee || undefined,
              entreprise: contact.entreprise || "",
              secteur: contact.secteur || "",
              sources: contact.sources || [],
            })) || [],
          searchCriteria: data.searchCriteria || {},
          hasContacts: data.hasContacts || false,
        }
      case "entreprises":
        return {
          ...baseResponse,
          prospects:
            data.prospects?.map((prospect: any) => ({
              nom_entreprise: prospect.company,
              site_web: prospect.website || "",
              description_activite: prospect.sector || "",
              produits_entreprise: prospect.cgrData?.produits_entreprise || [],
              potentiel_cgr: {
                produits_cibles_chez_le_prospect: prospect.cgrData?.produits_cibles_chez_le_prospect || [],
                produits_cgr_a_proposer: prospect.cgrData?.produits_cgr_a_proposer || [],
                argumentaire_approche: prospect.reason || "",
              },
              fournisseur_actuel_estimation: prospect.cgrData?.fournisseur_actuel_estimation || "",
              contacts:
                prospect.contacts?.map((contact: any) => ({
                  nom: contact.name?.split(" ").pop() || "",
                  prenom: contact.name?.split(" ").slice(0, -1).join(" ") || contact.name || "",
                  poste: contact.position || "",
                  email: contact.email || undefined,
                  phone: contact.phone || undefined,
                  linkedin_url: contact.linkedin || undefined,
                  verified: contact.verified || false,
                })) || [],
              score: prospect.score || 0,
              sources: prospect.sources || [],
              taille_entreprise: prospect.size || "Non spécifiée",
              volume_pieces_estime: prospect.volume_pieces_estime || "Non spécifié",
              zone_geographique: prospect.zone_geographique || "Non spécifiée",
            })) || [],
          // Include additional analyses if present
          marketAnalysis: data.marketAnalysis || undefined,
          competitorAnalysis: data.competitorAnalysis || undefined,
        }
      default:
        console.warn("Unknown search type:", baseResponse.searchType)
        return baseResponse
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 text-gray-900 flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
      {!results ? (
        <SearchWizard onSearch={handleSearch} loading={loading} />
      ) : (
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
          <div className="flex justify-center mb-8">
            <Button onClick={handleNewSearch} variant="outline" className="text-lg px-6 py-3 bg-transparent">
              <Undo2 className="mr-2 h-5 w-5" />
              Nouvelle recherche
            </Button>
          </div>
          <ResultsDisplay {...results} />
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mt-8 w-full max-w-5xl">
          <TriangleAlert className="h-5 w-5" />
          <AlertTitle>Erreur de recherche</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <Alert className="mt-8 w-full max-w-5xl">
          <Loader2 className="h-5 w-5 animate-spin" />
          <AlertTitle>Recherche en cours...</AlertTitle>
          <AlertDescription>Veuillez patienter pendant que l'IA traite votre demande.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
