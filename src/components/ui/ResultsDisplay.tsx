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
  Info,
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
  accroche_personnalisee?:
    | {
        texte: string
        source_accroche: string
      }
    | string
  verified?: boolean
  entreprise?: string
  secteur?: string
  sources?: string[]
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
  entreprises_clientes: string[]; 
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
  competitorAnalysis?: CompetitorAnalysis // Use the defined interface
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
    const hostname = new URL(url).hostname
    return hostname.startsWith("www.") ? hostname.substring(4) : hostname
  } catch (error) {
    return "Source invalide"
  }
}

function ContactCard({ contact }: { contact: Contact }) {
  const emailLocked = !contact.email || contact.email.includes("email_not_unlocked")

  return (
    <Card className="bg-background border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h5 className="font-bold text-lg text-foreground">
              {contact.prenom} {contact.nom}
            </h5>
            <p className="text-sm text-muted-foreground mt-1">{contact.poste}</p>
          </div>
          <div className="flex items-center gap-2">
            {contact.verified ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="mr-1" size={14} /> Vérifié
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                <AlertCircle className="mr-1" size={14} /> Non vérifié
              </Badge>
            )}
          </div>
        </div>
        <div className="space-y-3">
          {/* Email */}
          <div className="flex items-center gap-3">
            <Mail className="text-primary" size={18} />
            {emailLocked ? (
              <span className="text-sm text-muted-foreground italic">Email disponible après déverrouillage</span>
            ) : (
              <a href={`mailto:${contact.email}`} className="text-sm text-primary hover:underline">
                {contact.email}
              </a>
            )}
          </div>
          {/* Téléphone */}
          {contact.phone && (
            <div className="flex items-center gap-3">
              <Phone className="text-primary" size={18} />
              <span className="text-sm text-foreground">{contact.phone}</span>
            </div>
          )}
          {/* LinkedIn */}
          {contact.linkedin_url && (
            <div className="flex items-center gap-3">
              <Linkedin className="text-primary" size={18} />
              <a
                href={contact.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                Profil LinkedIn <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          )}
          {/* Accroche personnalisée */}
          {contact.accroche_personnalisee && (
            <div className="mt-4 p-4 bg-accent/10 rounded-lg border-l-4 border-accent space-y-2">
              <p className="text-sm text-accent-foreground font-semibold">Accroche suggérée :</p>
              {typeof contact.accroche_personnalisee === "object" && contact.accroche_personnalisee.texte ? (
                <>
                  <p className="text-base text-foreground italic">"{contact.accroche_personnalisee.texte}"</p>
                  {contact.accroche_personnalisee.source_accroche && (
                    <a
                      href={contact.accroche_personnalisee.source_accroche}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-primary hover:underline mt-1"
                    >
                      Source <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                </>
              ) : typeof contact.accroche_personnalisee === "string" && contact.accroche_personnalisee.trim() ? (
                <p className="text-base text-foreground italic">"{contact.accroche_personnalisee}"</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Accroche en cours de génération...</p>
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
    <Card className="bg-card border border-border/50 shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Building2 className="text-primary flex-shrink-0 w-8 h-8" />
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">{prospect.nom_entreprise}</CardTitle>
              <CardDescription className="text-muted-foreground mt-1">{prospect.description_activite}</CardDescription>
              {prospect.site_web && isValidUrl(prospect.site_web) && (
                <Button variant="link" size="sm" className="h-auto p-0 text-sm mt-2 text-primary hover:underline">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Visiter le site web
                </Button>
              )}
            </div>
          </div>
          {prospect.score && (
            <Badge className="flex items-center gap-1 bg-accent text-accent-foreground text-base px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4" />
              {prospect.score}/10
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {/* Informations générales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-base text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary/70" />
            <span>Taille: {prospect.taille_entreprise || "Non spécifiée"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary/70" />
            <span>Volume: {prospect.volume_pieces_estime || "Non spécifié"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary/70" />
            <span>Zone: {prospect.zone_geographique || "Non spécifiée"}</span>
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Produits de l'entreprise */}
        {prospect.produits_entreprise && prospect.produits_entreprise.length > 0 && (
          <div>
            <h5 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Produits développés par l'entreprise
            </h5>
            <div className="flex flex-wrap gap-2">
              {prospect.produits_entreprise.slice(0, 5).map((produit, idx) => (
                <Badge key={idx} variant="outline" className="text-sm px-3 py-1 bg-secondary text-secondary-foreground">
                  {produit}
                </Badge>
              ))}
              {prospect.produits_entreprise.length > 5 && (
                <Badge variant="outline" className="text-sm px-3 py-1 bg-secondary text-secondary-foreground">
                  +{prospect.produits_entreprise.length - 5} autres
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Potentiel CGR */}
        {prospect.potentiel_cgr && (
          <Card className="bg-primary/5 border border-primary/20 shadow-inner">
            <CardContent className="p-6 space-y-4">
              <h5 className="font-bold text-xl text-primary mb-3 flex items-center gap-3">
                <TrendingUp className="w-6 h-6" />
                Potentiel Stratégique pour CGR
              </h5>
              {prospect.potentiel_cgr.produits_cibles_chez_le_prospect?.length > 0 && (
                <div>
                  <p className="text-base font-medium text-foreground mb-2">Produits cibles chez le prospect :</p>
                  <div className="flex flex-wrap gap-2">
                    {prospect.potentiel_cgr.produits_cibles_chez_le_prospect.map((produit, idx) => (
                      <Badge key={idx} className="text-sm bg-accent/20 text-accent-foreground px-3 py-1">
                        {produit}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {prospect.potentiel_cgr.produits_cgr_a_proposer?.length > 0 && (
                <div>
                  <p className="text-base font-medium text-foreground mb-2">Produits CGR recommandés :</p>
                  <div className="flex flex-wrap gap-2">
                    {prospect.potentiel_cgr.produits_cgr_a_proposer.map((produit, idx) => (
                      <Badge key={idx} className="text-sm bg-primary text-primary-foreground px-3 py-1">
                        {produit}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {prospect.potentiel_cgr.argumentaire_approche && (
                <div className="bg-background rounded-lg p-4 border border-border/50">
                  <p className="text-base text-foreground">
                    <span className="font-semibold text-primary">Argumentaire d'approche : </span>
                    {prospect.potentiel_cgr.argumentaire_approche}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Fournisseur actuel */}
        {prospect.fournisseur_actuel_estimation && prospect.fournisseur_actuel_estimation !== "Non spécifié" && (
          <div className="flex items-center gap-3 text-base text-muted-foreground">
            <Shield className="w-5 h-5 text-primary/70" />
            <span>
              <span className="font-medium text-foreground">Concurrents potentiels : </span>
              {prospect.fournisseur_actuel_estimation}
            </span>
          </div>
        )}

        {/* Contacts */}
        {prospect.contacts && prospect.contacts.length > 0 && (
          <div>
            <h5 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Contacts identifiés ({prospect.contacts.length})
            </h5>
            <div className="grid gap-4">
              {prospect.contacts.map((contact, contactIndex) => (
                <ContactCard key={contactIndex} contact={contact} />
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        {prospect.sources && prospect.sources.length > 0 && (
          <div className="pt-4 border-t border-border/50">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground font-medium">Sources :</span>
              {prospect.sources
                .filter((source) => isValidUrl(source))
                .slice(0, 3)
                .map((source, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-background text-primary hover:bg-primary/5 hover:text-primary border-primary/20"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    {getHostname(source)}
                  </Button>
                ))}
              {prospect.sources.length > 3 && (
                <Badge variant="outline" className="text-xs bg-background text-muted-foreground">
                  +{prospect.sources.length - 3} autres
                </Badge>
              )}
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
  const displayProspects = prospects || enterprises || []

  if (totalFound === 0) {
    return (
      <Card className="border-yellow-400 bg-yellow-50 shadow-lg rounded-xl">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-6" />
          <p className="text-yellow-800 font-bold text-xl">Aucun résultat trouvé</p>
          <p className="text-yellow-700 text-base mt-2">Veuillez ajuster vos critères de recherche et réessayer.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8 w-full max-w-5xl mx-auto">
      {/* Header résultats */}
      <Card className="bg-gradient-to-r from-primary/10 to-background border border-primary/20 shadow-md rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-2xl text-primary flex items-center gap-3">
                <Target className="w-6 h-6" />
                {totalFound} Résultat{totalFound > 1 ? "s" : ""} Trouvé{totalFound > 1 ? "s" : ""}
              </h3>
              <p className="text-base text-muted-foreground mt-2 flex items-center gap-2">
                {cached ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Résultats du cache (instantané)
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5 text-accent" />
                    Nouvelle recherche IA
                  </>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-foreground">Type de recherche: {searchType}</p>
              {searchType === "concurrent" && competitorAnalysis && (
                <p className="text-sm text-muted-foreground mt-1">
                  Analyse de: <span className="font-medium">{competitorAnalysis.nom_entreprise}</span>
                </p>
              )}
              {searchType === "entreprises" && (
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium">{displayProspects.length}</span> entreprise
                  {displayProspects.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Affichage selon le type de recherche */}
      {searchType === "brainstorming" && marketOpportunities && marketOpportunities.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-foreground">Opportunités de marché identifiées</h3>
          <div className="grid gap-6">
            {marketOpportunities.map((opportunity, index) => (
              <Card
                key={index}
                className="bg-card border border-border/50 shadow-md hover:shadow-lg transition-shadow duration-200"
              >
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-primary">
                    <Lightbulb className="w-6 h-6" />
                    {opportunity.nom_marche}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-4">
                  <div>
                    <h5 className="font-semibold text-lg text-foreground mb-2">Justification</h5>
                    <p className="text-muted-foreground text-base">{opportunity.justification}</p>
                  </div>
                  <div>
                    <h5 className="font-semibold text-lg text-foreground mb-2">Produits CGR applicables</h5>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.produits_cgr_applicables.map((produit, idx) => (
                        <Badge key={idx} className="text-sm bg-primary/10 text-primary px-3 py-1">
                          {produit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-semibold text-lg text-foreground mb-2">Entreprises leaders</h5>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.exemples_entreprises.map((entreprise, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-sm px-3 py-1 bg-secondary text-secondary-foreground"
                        >
                          {entreprise}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {searchType === "concurrent" && competitorAnalysis && (
        <Card className="bg-card border border-border/50 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-2xl font-bold text-primary">
              <Shield className="w-7 h-7" />
              Analyse de {competitorAnalysis.nom_entreprise || "Concurrent"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-4">
            {competitorAnalysis.synthese && (
              <div>
                <h5 className="font-semibold text-lg text-foreground mb-2">Synthèse</h5>
                <p className="text-muted-foreground text-base">{competitorAnalysis.synthese}</p>
              </div>
            )}

            {(competitorAnalysis.produits_services?.length > 0 || competitorAnalysis.marches_cibles?.length > 0) && (
              <Separator className="bg-border/50" />
            )}

            <div className="grid md:grid-cols-2 gap-8">
              {competitorAnalysis.produits_services && competitorAnalysis.produits_services.length > 0 && (
                <div>
                  <h5 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Produits & Services
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {competitorAnalysis.produits_services.map((produit, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-sm px-3 py-1 bg-secondary text-secondary-foreground"
                      >
                        {produit}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {competitorAnalysis.marches_cibles && competitorAnalysis.marches_cibles.length > 0 && (
                <div>
                  <h5 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Marchés Cibles
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {competitorAnalysis.marches_cibles.map((marche, idx) => (
                      <Badge key={idx} variant="secondary" className="text-sm px-3 py-1 bg-primary/10 text-primary">
                        {marche}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {competitorAnalysis.entreprises_clientes && competitorAnalysis.entreprises_clientes.length > 0 && (
                <>
                  <Separator className="bg-border/50" />
                  <div>
                    <h5 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      Clients Identifiés du Concurrent
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {competitorAnalysis.entreprises_clientes.map((client, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-sm px-3 py-1 bg-accent/10 border-accent/30 text-accent-foreground"
                        >
                          {client}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
            )}


            {(competitorAnalysis.forces_apparentes?.length > 0 ||
              competitorAnalysis.faiblesses_potentielles?.length > 0) && <Separator className="bg-border/50" />}

            <div className="grid md:grid-cols-2 gap-8">
              {competitorAnalysis.forces_apparentes && competitorAnalysis.forces_apparentes.length > 0 && (
                <div>
                  <h5 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-green-600" />
                    Forces apparentes
                  </h5>
                  <ul className="space-y-2">
                    {competitorAnalysis.forces_apparentes.map((force, idx) => (
                      <li key={idx} className="text-base text-muted-foreground flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                        {force}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {competitorAnalysis.faiblesses_potentielles && competitorAnalysis.faiblesses_potentielles.length > 0 && (
                <div>
                  <h5 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Faiblesses potentielles
                  </h5>
                  <ul className="space-y-2">
                    {competitorAnalysis.faiblesses_potentielles.map((faiblesse, idx) => (
                      <li key={idx} className="text-base text-muted-foreground flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                        {faiblesse}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {competitorAnalysis.strategie_communication && (
              <>
                <Separator className="bg-border/50" />
                <div>
                  <h5 className="font-semibold text-lg text-foreground mb-2">Stratégie de communication</h5>
                  <p className="text-muted-foreground text-base">{competitorAnalysis.strategie_communication}</p>
                </div>
              </>
            )}

            {!competitorAnalysis.synthese &&
              !competitorAnalysis.produits_services?.length &&
              !competitorAnalysis.marches_cibles?.length &&
              !competitorAnalysis.forces_apparentes?.length &&
              !competitorAnalysis.faiblesses_potentielles?.length &&
              !competitorAnalysis.strategie_communication && (
                <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Info className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                  <p className="text-yellow-800 font-medium text-lg">Analyse limitée disponible</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    L'analyse du concurrent "{competitorAnalysis.nom_entreprise}" n'a pas retourné de détails complets.
                  </p>
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {searchType === "concurrent" && !competitorAnalysis && (
        <Card className="border-orange-400 bg-orange-50 shadow-lg rounded-xl">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-orange-600 mx-auto mb-6" />
            <p className="text-orange-800 font-bold text-xl">Analyse du concurrent non disponible</p>
            <p className="text-orange-700 text-base mt-2">
              L'analyse du concurrent n'a pas pu être récupérée ou est vide.
            </p>
          </CardContent>
        </Card>
      )}

      {searchType === "entreprises" && (
        <div className="space-y-6">
          {displayProspects.length > 0 ? (
            <>
              <h3 className="text-2xl font-bold text-foreground">
                Entreprises identifiées ({displayProspects.length})
              </h3>
              <div className="grid gap-6">
                {displayProspects.map((prospect, index) => (
                  <ProspectCard key={index} prospect={prospect} />
                ))}
              </div>
            </>
          ) : (
            <Card className="border-orange-400 bg-orange-50 shadow-lg rounded-xl">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-16 h-16 text-orange-600 mx-auto mb-6" />
                <p className="text-orange-800 font-bold text-xl">Aucune entreprise trouvée</p>
                <p className="text-orange-700 text-base mt-2">
                  La recherche a été effectuée mais aucune entreprise ne correspond aux critères.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {searchType === "contacts" && (
        <div className="space-y-6">
          {contacts && contacts.length > 0 ? (
            <>
              <h3 className="text-2xl font-bold text-foreground">Contacts identifiés ({contacts.length})</h3>
              <div className="grid gap-6">
                {contacts.map((contact, index) => (
                  <ContactCard key={index} contact={contact} />
                ))}
              </div>
            </>
          ) : (
            <Card className="border-orange-400 bg-orange-50 shadow-lg rounded-xl">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-16 h-16 text-orange-600 mx-auto mb-6" />
                <p className="text-orange-800 font-bold text-xl">Aucun contact trouvé</p>
                <p className="text-orange-700 text-base mt-2">
                  La recherche a été effectuée mais aucun contact ne correspond aux critères.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Footer sources globales */}
      {sources && sources.length > 0 && (
        <Card className="bg-card border border-border/50 shadow-md rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-3 text-foreground font-bold">
              <ExternalLink className="w-6 h-6 text-primary" />
              Sources utilisées
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3">
              {[...new Set(sources)]
                .filter((source) => isValidUrl(source))
                .slice(0, 10)
                .map((source, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="h-9 text-sm bg-background text-primary hover:bg-primary/5 hover:text-primary border-primary/20 rounded-md"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {getHostname(source)}
                  </Button>
                ))}
              {[...new Set(sources)].filter((source) => isValidUrl(source)).length > 10 && (
                <Badge variant="outline" className="text-sm bg-background text-muted-foreground px-3 py-1">
                  +{([...new Set(sources)].filter((source) => isValidUrl(source)).length || 0) - 10} autres
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
