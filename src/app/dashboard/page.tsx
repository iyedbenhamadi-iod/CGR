"use client"

import { useState } from "react"
import ResultsDisplay from "@/components/ui/ResultsDisplay"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TriangleAlert, Undo2, Sparkles, Brain, Database, Network, Search as SearchIcon, CheckCircle2, Zap, TrendingUp, Target, Loader2 } from "lucide-react"
import SearchWizard from "@/components/searchWizard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { FormData } from "@/lib/form-types"

export default function Dashboard() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState<string>("")
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [error, setError] = useState("")
  const [prefillData, setPrefillData] = useState<Partial<FormData> | undefined>(undefined)

  const handleSearch = async (searchData: any) => {
    setLoading(true)
    setError("")
    setResults(null)
    setLoadingStage("Initialisation de l'analyse IA...")
    setLoadingProgress(0)
    
    console.log("Frontend: Initiating search with data:", searchData)
    
    // Premium loading messages with progress
    const loadingStages = [
      { message: "Connexion aux sources de données premium", progress: 15 },
      { message: "Activation des algorithmes d'intelligence artificielle", progress: 30 },
      { message: "Exploration du web profond et sources propriétaires", progress: 45 },
      { message: "Analyse sémantique et validation des données", progress: 60 },
      { message: "Scoring et classification intelligente", progress: 75 },
      { message: "Enrichissement multicouche des profils", progress: 90 },
      { message: "Finalisation et optimisation des résultats", progress: 95 }
    ];
    
    let stageIndex = 0;
    const stageInterval = setInterval(() => {
      if (stageIndex < loadingStages.length) {
        setLoadingStage(loadingStages[stageIndex].message);
        setLoadingProgress(loadingStages[stageIndex].progress);
        stageIndex++;
      }
    }, 3500);
    
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(searchData),
      })
      
      clearInterval(stageInterval);
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Erreur lors de la recherche")
      }
      
      const data = await response.json()
      console.log("Frontend: 🔍 API Response received:", data)
      
      setLoadingStage("Préparation de l'affichage...")
      setLoadingProgress(100)
      
      const transformedData = transformApiResponse(data)
      console.log("Frontend: 🔄 Transformed Data for ResultsDisplay:", transformedData)
      
      setResults(transformedData)
      setLoadingStage("")
      setLoadingProgress(0)
      
    } catch (err: any) {
      clearInterval(stageInterval);
      setError(`Erreur lors de la recherche: ${err.message || "Veuillez réessayer."}`)
      console.error("Frontend: ❌ Search Error:", err)
      setLoadingStage("")
      setLoadingProgress(0)
    } finally {
      setLoading(false)
    }
  }

  const handleNewSearch = () => {
    setResults(null)
    setError("")
    setPrefillData(undefined)
    setLoadingStage("")
    setLoadingProgress(0)
  }

  const handleSearchFromBrainstorming = (marketName: string, cgrProducts: string[]) => {
    console.log("🚀 Launching company search from brainstorming:", { marketName, cgrProducts })
    setResults(null)
    setError("")
    setPrefillData({
      typeRecherche: "entreprises",
      secteurActiviteLibre: marketName,
      secteursActivite: [],
      produitsCGR: [],
      zoneGeographique: [],
      tailleEntreprise: "",
      motsCles: "",
      clientsExclure: "",
      usinesCGR: [],
      nombreResultats: 10,
    })
  }

  const handleSearchContacts = (companyName: string, website: string) => {
    console.log("👥 Launching contact search for company:", { companyName, website })
    setResults(null)
    setError("")
    setPrefillData({
      typeRecherche: "contacts",
      nomEntreprise: companyName,
      siteWebEntreprise: website || "",
      contactRoles: [],
      location: "",
      secteursActivite: [],
      zoneGeographique: [],
      tailleEntreprise: "",
      motsCles: "",
      produitsCGR: [],
      clientsExclure: "",
      usinesCGR: [],
      nombreResultats: 10,
    })
  }

  const transformApiResponse = (data: any) => {
    const baseResponse = {
      searchType: data.searchType || data.type,
      totalFound: data.totalFound || 0,
      cached: data.cached || false,
      sources: data.sources || [],
      searchId: data.searchId || undefined,
    }

    console.log("🔍 Transform API Response - Input data:", {
      searchType: baseResponse.searchType,
      dataKeys: Object.keys(data),
      competitors: data.competitors?.length || 0,
      prospects: data.prospects?.length || 0,
      totalFound: baseResponse.totalFound
    })

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
                entreprises_clientes: data.competitorAnalysis.entreprises_clientes || [],
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
      case "competitor-identification":
      case "identification_concurrents":
        console.log("🔧 Transforming competitor-identification data:", {
          competitors: data.competitors?.length || 0,
          statistics: data.statistics || {},
          hasCompetitors: data.hasCompetitors
        })
        return {
          ...baseResponse,
          competitors: data.competitors?.map((competitor: any) => ({
            nom_entreprise: competitor.nom_entreprise || "",
            presence_geographique: Array.isArray(competitor.presence_geographique) 
              ? competitor.presence_geographique 
              : (competitor.presence_geographique ? [competitor.presence_geographique] : []),
            marches_cibles: Array.isArray(competitor.marches_cibles) 
              ? competitor.marches_cibles 
              : (competitor.marches_cibles ? [competitor.marches_cibles] : []),
            taille_estimee: competitor.taille_estimee || competitor.taille_entreprise || "Non spécifiée",
            ca_estime: competitor.ca_estime || "Non communiqué",
            publications_recentes: Array.isArray(competitor.publications_recentes) 
              ? competitor.publications_recentes 
              : [],
            actualites_recentes: Array.isArray(competitor.actualites_recentes) 
              ? competitor.actualites_recentes 
              : [],
            site_web: competitor.site_web || undefined,
            specialites: Array.isArray(competitor.specialites) 
              ? competitor.specialites 
              : (Array.isArray(competitor.specialites_produits) 
                  ? competitor.specialites_produits 
                  : []),
            forces_concurrentielles: Array.isArray(competitor.forces_concurrentielles) 
              ? competitor.forces_concurrentielles 
              : [],
            positionnement_marche: competitor.positionnement_marche || "",
            contact_info: competitor.contact_info || {},
            sources: Array.isArray(competitor.sources) ? competitor.sources : [],
            criteres_correspondants: competitor.criteres_correspondants || {
              region: "Non spécifiée",
              produit: "Non spécifié",
              volume: "Non spécifié"
            }
          })) || [],
          statistics: data.statistics || {},
          hasCompetitors: data.hasCompetitors || false,
          searchCriteria: data.searchCriteria || {},
        }
      case "entreprises":
        return {
          ...baseResponse,
          prospects:
            data.prospects?.map((prospect: any) => ({
              nom_entreprise: prospect.company || prospect.nom_entreprise,
              site_web: prospect.website || prospect.site_web || "",
              description_activite: prospect.sector || prospect.description_activite || "",
              produits_entreprise: prospect.cgrData?.produits_entreprise || prospect.produits_entreprise || [],
              potentiel_cgr: {
                produits_cibles_chez_le_prospect: prospect.cgrData?.produits_cibles_chez_le_prospect || [],
                produits_cgr_a_proposer: prospect.cgrData?.produits_cgr_a_proposer || [],
                argumentaire_approche: prospect.reason || prospect.potentiel_cgr?.argumentaire_approche || "",
              },
              fournisseur_actuel_estimation: prospect.cgrData?.fournisseur_actuel_estimation || prospect.fournisseur_actuel_estimation || "",
              contacts:
                prospect.contacts?.map((contact: any) => ({
                  nom: contact.name?.split(" ").pop() || contact.nom || "",
                  prenom: contact.name?.split(" ").slice(0, -1).join(" ") || contact.prenom || contact.name || "",
                  poste: contact.position || contact.poste || "",
                  email: contact.email || undefined,
                  phone: contact.phone || undefined,
                  linkedin_url: contact.linkedin || contact.linkedin_url || undefined,
                  verified: contact.verified || false,
                })) || [],
              score: prospect.score || 0,
              sources: prospect.sources || [],
              taille_entreprise: prospect.size || prospect.taille_entreprise || "Non spécifiée",
              volume_pieces_estime: prospect.volume_pieces_estime || "Non spécifié",
              zone_geographique: prospect.zone_geographique || "Non spécifiée",
            })) || [],
          marketAnalysis: data.marketAnalysis || undefined,
          competitorAnalysis: data.competitorAnalysis || undefined,
        }
      default:
        console.warn("Unknown search type:", baseResponse.searchType)
        return {
          ...baseResponse,
          competitors: data.competitors || [],
          prospects: data.prospects || [],
          contacts: data.contacts || [],
          marketOpportunities: data.marketOpportunities || [],
          competitorAnalysis: data.competitorAnalysis || null,
          statistics: data.statistics || {},
        }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 text-gray-900 flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
      {!results ? (
        <SearchWizard 
          onSearch={handleSearch} 
          loading={loading} 
          prefillData={prefillData} 
        />
      ) : (
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
          <div className="flex justify-center mb-8">
            <Button onClick={handleNewSearch} variant="outline" className="text-lg px-6 py-3 bg-transparent">
              <Undo2 className="mr-2 h-5 w-5" />
              Nouvelle recherche
            </Button>
          </div>
          <ResultsDisplay 
            {...results} 
            onSearchFromBrainstorming={handleSearchFromBrainstorming}
            onSearchContacts={handleSearchContacts} 
          />
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
        <div className="mt-8 w-full max-w-5xl">
          <Card className="border-primary/20 shadow-2xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
            <CardContent className="p-10">
              <div className="flex flex-col items-center space-y-8">
                
                {/* Modern circular loader with gradient */}
                <div className="relative">
                  {/* Outer ring with gradient */}
                  <div className="absolute inset-0">
                    <svg className="animate-spin h-32 w-32" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="50%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        stroke="url(#gradient)"
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray="70 200"
                      />
                    </svg>
                  </div>
                  
                  {/* Center icon with pulse */}
                  <div className="relative flex items-center justify-center h-32 w-32">
                    <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping"></div>
                    <div className="relative bg-primary rounded-full p-6 shadow-lg">
                      <Sparkles className="h-8 w-8 text-primary-foreground" />
                    </div>
                  </div>
                </div>
                
                {/* Title and stage */}
                <div className="text-center space-y-3 max-w-2xl">
                  <AlertTitle className="text-3xl font-bold text-foreground">
                    Analyse IA en cours
                  </AlertTitle>
                  <AlertDescription className="text-lg text-muted-foreground">
                    {loadingStage}
                  </AlertDescription>
                </div>
                
                {/* Progress bar matching CGR theme */}
                <div className="w-full max-w-2xl space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground font-medium">
                    <span>Progression</span>
                    <span className="text-primary font-bold">{loadingProgress}%</span>
                  </div>
                  <div className="relative h-3 bg-secondary rounded-full overflow-hidden border border-border">
                    <div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${loadingProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                </div>
                
                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-6 w-full max-w-2xl pt-6 border-t border-border">
                  <div className="text-center space-y-2">
                    <Database className="h-8 w-8 text-blue-500 mx-auto" />
                    <div className="text-sm font-medium text-muted-foreground">Sources multiples</div>
                  </div>
                  <div className="text-center space-y-2">
                    <Brain className="h-8 w-8 text-purple-500 mx-auto" />
                    <div className="text-sm font-medium text-muted-foreground">IA avancée</div>
                  </div>
                  <div className="text-center space-y-2">
                    <TrendingUp className="h-8 w-8 text-pink-500 mx-auto" />
                    <div className="text-sm font-medium text-muted-foreground">Qualité 10/10</div>
                  </div>
                </div>
                
                {/* Description */}
                <p className="text-sm text-center text-muted-foreground max-w-2xl leading-relaxed pt-4 border-t border-border">
                  Notre intelligence artificielle analyse des centaines de sources en temps réel pour identifier les prospects les plus qualifiés. 
                  <span className="text-primary font-semibold"> Cette profondeur d'analyse garantit des résultats exceptionnels.</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  )
}