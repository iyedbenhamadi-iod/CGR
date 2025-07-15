"use client"
import {
  Building2,
  Users,
  Mail,
  Star,
  ExternalLink,
  Phone,
  Linkedin,
  CheckCircle,
  AlertCircle,
  Target,
  TrendingUp,
  Shield,
  Lightbulb,
  Package,
  Award,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface Contact {
  nom: string
  prenom: string
  poste: string
  email?: string
  phone?: string
  linkedin_url?: string
  accroche_personnalisee?: {
    texte: string
    source_accroche: string
  }
  verified?: boolean
}

interface Prospect {
  nom_entreprise: string
  site_web: string
  description_activite: string
  produits_entreprise: string[]
  potentiel_cgr: {
    produits_cibles_chez_le_prospect: string[]
    produits_cgr_a_proposer: string[]
    argumentaire_approche: string
  }
  fournisseur_actuel_estimation: string
  contacts?: Contact[]
  score?: number
  sources: string[]
  taille_entreprise: string
  volume_pieces_estime: string
  zone_geographique: string
}

interface MarketOpportunity {
  nom_marche: string
  justification: string
  produits_cgr_applicables: string[]
  exemples_entreprises: string[]
}

interface CompetitorAnalysis {
  nom_entreprise: string
  synthese: string
  produits_services: string[]
  marches_cibles: string[]
  forces_apparentes: string[]
  faiblesses_potentielles: string[]
  strategie_communication: string
  sources: string[]
}

interface ResultsDisplayProps {
  searchType: string
  prospects?: Prospect[]
  enterprises?: Prospect[] // Add this to handle the enterprises key
  marketOpportunities?: MarketOpportunity[]
   competitorAnalysis?: {
    nom_entreprise: string;
    synthese: string;
    produits_services: string[];
    marches_cibles: string[];
    forces_apparentes: string[];
    faiblesses_potentielles: string[];
    strategie_communication: string;
    sources: string[];
  };
  contacts?: Contact[]
  totalFound: number
  cached: boolean
  sources: string[]
  searchId?: string
}


function isValidUrl(url: string): boolean {
  if (!url || typeof url !== "string" || url.trim() === "") {
    return false
  }
  try {
    new URL(url)
    return true
  } catch (error) {
    return false
  }
}

function getHostname(url: string): string {
  if (!isValidUrl(url)) {
    return "Source invalide"
  }
  try {
    return new URL(url).hostname
  } catch (error) {
    return "Source invalide"
  }
}

function ContactCard({ contact }: { contact: Contact }) {
  const emailLocked = !contact.email || contact.email.includes("email_not_unlocked")

  return (
    <Card className="bg-gray-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h5 className="font-semibold text-gray-900">
              {contact.prenom} {contact.nom}
            </h5>
            <p className="text-sm text-gray-600 mb-2">{contact.poste}</p>
          </div>
          <div className="flex items-center gap-1">
            {contact.verified ? (
              <CheckCircle className="text-green-500" size={16} />
            ) : (
              <AlertCircle className="text-yellow-500" size={16} />
            )}
          </div>
        </div>

        <div className="space-y-2">
          {/* Email */}
          <div className="flex items-center gap-2">
            <Mail className="text-gray-400" size={14} />
            {emailLocked ? (
              <Badge variant="outline" className="text-orange-600">
                Email disponible après déverrouillage
              </Badge>
            ) : (
              <span className="text-sm text-blue-600">{contact.email}</span>
            )}
          </div>

          {/* Téléphone */}
          {contact.phone && (
            <div className="flex items-center gap-2">
              <Phone className="text-gray-400" size={14} />
              <span className="text-sm text-gray-700">{contact.phone}</span>
            </div>
          )}

          {/* LinkedIn */}
          {contact.linkedin_url && (
            <div className="flex items-center gap-2">
              <Linkedin className="text-gray-400" size={14} />
              <Button variant="link" size="sm" className="h-auto p-0 text-sm">
                <ExternalLink className="w-3 h-3 mr-1" />
                Profil LinkedIn
              </Button>
            </div>
          )}

          {/* Accroche personnalisée */}
          {contact.accroche_personnalisee && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <p className="text-sm text-blue-800 font-medium mb-1">Accroche suggérée :</p>
              <p className="text-sm text-blue-700 italic">"{contact.accroche_personnalisee.texte}"</p>
              {contact.accroche_personnalisee.source_accroche && (
                <Button variant="link" size="sm" className="h-auto p-0 text-xs mt-1">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Source
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ProspectCard({ prospect }: { prospect: Prospect }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="text-blue-600 flex-shrink-0" size={24} />
            <div>
              <CardTitle className="text-lg">{prospect.nom_entreprise}</CardTitle>
              <CardDescription>{prospect.description_activite}</CardDescription>
              {prospect.site_web && isValidUrl(prospect.site_web) && (
                <Button variant="link" size="sm" className="h-auto p-0 text-sm mt-1">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Site web
                </Button>
              )}
            </div>
          </div>
          {prospect.score && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {prospect.score}/10
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Informations générales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Taille: {prospect.taille_entreprise || "Non spécifiée"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Volume: {prospect.volume_pieces_estime || "Non spécifié"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Zone: {prospect.zone_geographique || "Non spécifiée"}</span>
          </div>
        </div>

        {/* Produits de l'entreprise */}
        {prospect.produits_entreprise && prospect.produits_entreprise.length > 0 && (
          <div>
            <h5 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Produits développés
            </h5>
            <div className="flex flex-wrap gap-1">
              {prospect.produits_entreprise.slice(0, 5).map((produit, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {produit}
                </Badge>
              ))}
              {prospect.produits_entreprise.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{prospect.produits_entreprise.length - 5} autres
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Potentiel CGR */}
        {prospect.potentiel_cgr && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <h5 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Potentiel pour CGR
              </h5>

              {prospect.potentiel_cgr.produits_cibles_chez_le_prospect?.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-green-700 mb-1">Produits cibles :</p>
                  <div className="flex flex-wrap gap-1">
                    {prospect.potentiel_cgr.produits_cibles_chez_le_prospect.map((produit, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs bg-green-100">
                        {produit}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {prospect.potentiel_cgr.produits_cgr_a_proposer?.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-green-700 mb-1">Produits CGR recommandés :</p>
                  <div className="flex flex-wrap gap-1">
                    {prospect.potentiel_cgr.produits_cgr_a_proposer.map((produit, idx) => (
                      <Badge key={idx} className="text-xs bg-green-600">
                        {produit}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {prospect.potentiel_cgr.argumentaire_approche && (
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-sm text-green-800">
                    <span className="font-medium">Argumentaire : </span>
                    {prospect.potentiel_cgr.argumentaire_approche}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Fournisseur actuel */}
        {prospect.fournisseur_actuel_estimation && prospect.fournisseur_actuel_estimation !== "Non spécifié" && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4" />
            <span>
              <span className="font-medium">Concurrents potentiels : </span>
              {prospect.fournisseur_actuel_estimation}
            </span>
          </div>
        )}

        {/* Contacts */}
        {prospect.contacts && prospect.contacts.length > 0 && (
          <div>
            <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Contacts identifiés ({prospect.contacts.length})
            </h5>
            <div className="grid gap-3">
              {prospect.contacts.map((contact, contactIndex) => (
                <ContactCard key={contactIndex} contact={contact} />
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        {prospect.sources && prospect.sources.length > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">Sources :</span>
              {prospect.sources
                .filter((source) => isValidUrl(source))
                .slice(0, 3)
                .map((source, idx) => (
                  <Button key={idx} variant="outline" size="sm" className="h-6 text-xs bg-transparent">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    {getHostname(source)}
                  </Button>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ResultsDisplay({
  searchType,
  prospects,
  enterprises,
  marketOpportunities,
  competitorAnalysis,
  contacts,
  totalFound,
  cached,
  sources,
}: ResultsDisplayProps) {
  // Use enterprises if prospects is not provided (for backward compatibility)
  const displayProspects = prospects || enterprises || []
  
  // Enhanced debug logs
  console.log('ResultsDisplay received:', {
    searchType,
    prospects: prospects?.length || 0,
    enterprises: enterprises?.length || 0,
    displayProspects: displayProspects.length,
    marketOpportunities: marketOpportunities?.length || 0,
    competitorAnalysis: !!competitorAnalysis,
    competitorAnalysisData: competitorAnalysis ? {
      nom_entreprise: competitorAnalysis.nom_entreprise,
      synthese: !!competitorAnalysis.synthese,
      produits_services: competitorAnalysis.produits_services?.length || 0,
      marches_cibles: competitorAnalysis.marches_cibles?.length || 0,
      forces_apparentes: competitorAnalysis.forces_apparentes?.length || 0,
      faiblesses_potentielles: competitorAnalysis.faiblesses_potentielles?.length || 0,
      strategie_communication: !!competitorAnalysis.strategie_communication,
      sources: competitorAnalysis.sources?.length || 0
    } : null,
    contacts: contacts?.length || 0,
    totalFound,
    cached,
    sourcesCount: sources?.length || 0
  });

  if (totalFound === 0) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <p className="text-yellow-800 font-medium">Aucun résultat trouvé</p>
          <p className="text-yellow-600 text-sm mt-1">Essayez de modifier vos critères de recherche</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header résultats */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-800 flex items-center gap-2">
                <Target className="w-5 h-5" />
                {totalFound} résultat{totalFound > 1 ? "s" : ""} trouvé{totalFound > 1 ? "s" : ""}
              </h3>
              <p className="text-sm text-green-600 mt-1">
                {cached ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Résultats du cache (instantané)
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Nouvelle recherche IA
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-600">Type: {searchType}</p>
              {searchType === "concurrent" && competitorAnalysis && (
                <p className="text-xs text-green-500">
                  Analyse de {competitorAnalysis.nom_entreprise}
                </p>
              )}
              {searchType === "entreprises" && (
                <p className="text-xs text-green-500">
                  {displayProspects.length} entreprise{displayProspects.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4">
            <h4 className="font-medium text-gray-800 mb-2">Debug Info</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Search Type: {searchType}</p>
              <p>Total Found: {totalFound}</p>
              <p>Prospects: {prospects?.length || 0}</p>
              <p>Enterprises: {enterprises?.length || 0}</p>
              <p>Display Prospects: {displayProspects.length}</p>
              <p>Market Opportunities: {marketOpportunities?.length || 0}</p>
              <p>Competitor Analysis: {competitorAnalysis ? 'Yes' : 'No'}</p>
              {competitorAnalysis && (
                <div className="ml-4 space-y-1">
                  <p>- Nom: {competitorAnalysis.nom_entreprise}</p>
                  <p>- Synthèse: {competitorAnalysis.synthese ? 'Yes' : 'No'}</p>
                  <p>- Produits/Services: {competitorAnalysis.produits_services?.length || 0}</p>
                  <p>- Marchés: {competitorAnalysis.marches_cibles?.length || 0}</p>
                  <p>- Forces: {competitorAnalysis.forces_apparentes?.length || 0}</p>
                  <p>- Faiblesses: {competitorAnalysis.faiblesses_potentielles?.length || 0}</p>
                  <p>- Communication: {competitorAnalysis.strategie_communication ? 'Yes' : 'No'}</p>
                  <p>- Sources: {competitorAnalysis.sources?.length || 0}</p>
                </div>
              )}
              <p>Contacts: {contacts?.length || 0}</p>
              <p>Sources: {sources?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Affichage selon le type de recherche */}
      {searchType === "brainstorming" && marketOpportunities && marketOpportunities.length > 0 && (
        <div className="grid gap-6">
          <h3 className="text-lg font-semibold text-gray-800">Opportunités de marché identifiées</h3>
          {marketOpportunities.map((opportunity, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-600" />
                  {opportunity.nom_marche}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Justification</h5>
                  <p className="text-gray-700 text-sm">{opportunity.justification}</p>
                </div>

                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Produits CGR applicables</h5>
                  <div className="flex flex-wrap gap-1">
                    {opportunity.produits_cgr_applicables.map((produit, idx) => (
                      <Badge key={idx} className="text-xs">
                        {produit}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Entreprises leaders</h5>
                  <div className="flex flex-wrap gap-1">
                    {opportunity.exemples_entreprises.map((entreprise, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {entreprise}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Fixed competitor analysis display with better error handling */}
      {searchType === "concurrent" && competitorAnalysis && (
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600" />
              Analyse de {competitorAnalysis.nom_entreprise || "Concurrent"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Synthèse */}
            {competitorAnalysis.synthese && (
              <div>
                <h5 className="font-medium text-gray-800 mb-2">Synthèse</h5>
                <p className="text-gray-700 text-sm">{competitorAnalysis.synthese}</p>
              </div>
            )}

            {(competitorAnalysis.produits_services?.length > 0 || competitorAnalysis.marches_cibles?.length > 0) && (
              <Separator />
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Produits & Services */}
              {competitorAnalysis.produits_services && competitorAnalysis.produits_services.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Produits & Services
                  </h5>
                  <div className="space-y-1">
                    {competitorAnalysis.produits_services.map((produit, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs mr-1 mb-1">
                        {produit}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Marchés Cibles */}
              {competitorAnalysis.marches_cibles && competitorAnalysis.marches_cibles.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Marchés Cibles
                  </h5>
                  <div className="space-y-1">
                    {competitorAnalysis.marches_cibles.map((marche, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs mr-1 mb-1">
                        {marche}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {(competitorAnalysis.forces_apparentes?.length > 0 || competitorAnalysis.faiblesses_potentielles?.length > 0) && (
              <Separator />
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Forces apparentes */}
              {competitorAnalysis.forces_apparentes && competitorAnalysis.forces_apparentes.length > 0 && (
                <div>
                  <h5 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Forces apparentes
                  </h5>
                  <ul className="space-y-1">
                    {competitorAnalysis.forces_apparentes.map((force, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                        {force}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Faiblesses potentielles */}
              {competitorAnalysis.faiblesses_potentielles && competitorAnalysis.faiblesses_potentielles.length > 0 && (
                <div>
                  <h5 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Faiblesses potentielles
                  </h5>
                  <ul className="space-y-1">
                    {competitorAnalysis.faiblesses_potentielles.map((faiblesse, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <AlertCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                        {faiblesse}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Stratégie de communication */}
            {competitorAnalysis.strategie_communication && (
              <>
                <Separator />
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Stratégie de communication</h5>
                  <p className="text-gray-700 text-sm">{competitorAnalysis.strategie_communication}</p>
                </div>
              </>
            )}

            {/* Show message if no detailed analysis is available */}
            {!competitorAnalysis.synthese && 
             !competitorAnalysis.produits_services?.length && 
             !competitorAnalysis.marches_cibles?.length && 
             !competitorAnalysis.forces_apparentes?.length && 
             !competitorAnalysis.faiblesses_potentielles?.length && 
             !competitorAnalysis.strategie_communication && (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                <p className="text-yellow-800 font-medium">Analyse limitée disponible</p>
                <p className="text-yellow-600 text-sm mt-1">
                  L'analyse du concurrent "{competitorAnalysis.nom_entreprise}" n'a pas retourné de détails complets.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No competitor analysis found */}
      {searchType === "concurrent" && !competitorAnalysis && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
            <p className="text-orange-800 font-medium">Analyse du concurrent non disponible</p>
            <p className="text-orange-600 text-sm mt-1">
              L'analyse du concurrent n'a pas pu être récupérée ou est vide.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Enterprise display */}
      {searchType === "entreprises" && (
        <div className="grid gap-6">
          {displayProspects.length > 0 ? (
            <>
              <h3 className="text-lg font-semibold text-gray-800">
                Entreprises identifiées ({displayProspects.length})
              </h3>
              {displayProspects.map((prospect, index) => (
                <ProspectCard key={index} prospect={prospect} />
              ))}
            </>
          ) : (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
                <p className="text-orange-800 font-medium">Aucune entreprise trouvée</p>
                <p className="text-orange-600 text-sm mt-1">
                  La recherche a été effectuée mais aucune entreprise ne correspond aux critères
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Contacts display */}
      {searchType === "contacts" && (
        <div className="grid gap-4">
          {contacts && contacts.length > 0 ? (
            <>
              <h3 className="text-lg font-semibold text-gray-800">
                Contacts identifiés ({contacts.length})
              </h3>
              {contacts.map((contact, index) => (
                <ContactCard key={index} contact={contact} />
              ))}
            </>
          ) : (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-12 h-12 text-orange-600 mx-auto mb-4" />
                <p className="text-orange-800 font-medium">Aucun contact trouvé</p>
                <p className="text-orange-600 text-sm mt-1">
                  La recherche a été effectuée mais aucun contact ne correspond aux critères
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Footer sources globales */}
      {sources && sources.length > 0 && (
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-gray-600" />
              Sources utilisées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[...new Set(sources)]
                .filter((source) => isValidUrl(source))
                .slice(0, 10)
                .map((source, idx) => (
                  <Button key={idx} variant="outline" size="sm" className="text-xs bg-transparent">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    {getHostname(source)}
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}