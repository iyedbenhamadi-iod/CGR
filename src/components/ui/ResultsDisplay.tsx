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
  Globe,
  TrendingDown,
  FileText,
  Calendar,
  MapPin,
  DollarSign,
  Briefcase,
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

// Add Competitor interface to match your API response
interface Competitor {
  nom_entreprise: string
  presence_geographique: string[]
  marches_cibles: string[]
  taille_estimee: string  // Changed from taille_estimee
  ca_estime: string
  publications_recentes: Array<{
    titre?: string
    date?: string
    source?: string
    url?: string
  }>
  actualites_recentes: Array<{
    titre?: string
    date?: string
    source?: string
    url?: string
  }>
  site_web?: string
  specialites: string[]  // This is the correct field name your API returns
  forces_concurrentielles: string[]
  positionnement_marche: string
  contact_info: {
    telephone?: string
    email?: string
    adresse?: string
  }
  sources: string[]
  criteres_correspondants: {
    region: string
    produit: string
    volume: string
  }
}

interface ResultsDisplayProps {
  searchType: string
  prospects?: Prospect[]
  enterprises?: Prospect[]
  marketOpportunities?: MarketOpportunity[]
  competitorAnalysis?: CompetitorAnalysis
  competitors?: Competitor[]
  contacts?: Contact[]
  totalFound: number
  cached: boolean
  sources: string[]
  searchId?: string
  statistics?: {
    total_concurrents?: number
    avec_site_web?: number
    avec_actualites?: number
    avec_publications?: number
    regions_representees?: string[]
    marches_identifies?: string[]
    specialites_identifiees?: string[]
  }
  onSearchFromBrainstorming?: (marketName: string, cgrProducts: string[]) => void // NEW
    onSearchContacts?: (companyName: string, website: string) => void // ADD THIS LINE

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

function CompetitorCard({ competitor }: { competitor: Competitor }) {
  return (
    <Card className="bg-card border border-border/50 shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Shield className="text-primary flex-shrink-0 w-8 h-8" />
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">{competitor.nom_entreprise}</CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                {competitor.positionnement_marche || "Concurrent identifié"}
              </CardDescription>
              {competitor.site_web && isValidUrl(competitor.site_web) && (
                <a
                  href={competitor.site_web}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-primary hover:underline mt-2"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Visiter le site web
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className="bg-red-100 text-red-800 border-red-200">
              <Shield className="w-4 h-4 mr-1" />
              Concurrent
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {/* Informations générales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-base text-muted-foreground">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary/70" />
            <span>Taille: {competitor.taille_estimee}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary/70" />
            <span>CA estimé: {competitor.ca_estime}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary/70" />
            <span>
              Zones: {competitor.presence_geographique.length > 0 
                ? competitor.presence_geographique.slice(0, 2).join(", ")
                : "Non spécifiée"}
              {competitor.presence_geographique.length > 2 && (
                <span className="text-xs"> (+{competitor.presence_geographique.length - 2})</span>
              )}
            </span>
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Critères de correspondance */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h5 className="font-semibold text-lg text-amber-800 mb-2 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Critères de correspondance
          </h5>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              {competitor.criteres_correspondants.region}
            </Badge>
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              {competitor.criteres_correspondants.produit.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              {competitor.criteres_correspondants.volume.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {/* Spécialités */}
        {competitor.specialites && competitor.specialites.length > 0 && (
          <div>
            <h5 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Spécialités produits
            </h5>
            <div className="flex flex-wrap gap-2">
              {competitor.specialites.slice(0, 6).map((specialite, idx) => (
                <Badge key={idx} variant="outline" className="text-sm px-3 py-1 bg-secondary text-secondary-foreground">
                  {specialite}
                </Badge>
              ))}
              {competitor.specialites.length > 6 && (
                <Badge variant="outline" className="text-sm px-3 py-1 bg-secondary text-secondary-foreground">
                  +{competitor.specialites.length - 6} autres
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Marchés cibles */}
        {competitor.marches_cibles && competitor.marches_cibles.length > 0 && (
          <div>
            <h5 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Marchés cibles
            </h5>
            <div className="flex flex-wrap gap-2">
              {competitor.marches_cibles.slice(0, 5).map((marche, idx) => (
                <Badge key={idx} className="text-sm bg-primary/10 text-primary px-3 py-1">
                  {marche}
                </Badge>
              ))}
              {competitor.marches_cibles.length > 5 && (
                <Badge className="text-sm bg-primary/10 text-primary px-3 py-1">
                  +{competitor.marches_cibles.length - 5} autres
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Forces concurrentielles */}
        {competitor.forces_concurrentielles && competitor.forces_concurrentielles.length > 0 && (
          <div>
            <h5 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-green-600" />
              Forces concurrentielles
            </h5>
            <ul className="space-y-2">
              {competitor.forces_concurrentielles.slice(0, 4).map((force, idx) => (
                <li key={idx} className="text-base text-muted-foreground flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                  {force}
                </li>
              ))}
              {competitor.forces_concurrentielles.length > 4 && (
                <li className="text-sm text-muted-foreground italic">
                  +{competitor.forces_concurrentielles.length - 4} autres forces identifiées
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Présence géographique complète */}
        {competitor.presence_geographique && competitor.presence_geographique.length > 2 && (
          <div>
            <h5 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Présence géographique
            </h5>
            <div className="flex flex-wrap gap-2">
              {competitor.presence_geographique.map((region, idx) => (
                <Badge key={idx} variant="outline" className="text-sm px-3 py-1 bg-blue-50 text-blue-700 border-blue-200">
                  {region}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actualités récentes */}
        {competitor.actualites_recentes && competitor.actualites_recentes.length > 0 && (
          <div>
            <h5 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Actualités récentes ({competitor.actualites_recentes.length})
            </h5>
            <div className="space-y-3">
              {competitor.actualites_recentes.slice(0, 3).map((actualite, idx) => (
                <div key={idx} className="border-l-4 border-blue-200 pl-4 py-2 bg-blue-50/30">
                  <h6 className="font-medium text-foreground text-sm">
                    {actualite.titre || "Actualité récente"}
                  </h6>
                  {actualite.date && (
                    <p className="text-xs text-muted-foreground mt-1">{actualite.date}</p>
                  )}
                  {actualite.source && (
                    <p className="text-xs text-blue-600 mt-1">Source: {actualite.source}</p>
                  )}
                </div>
              ))}
              {competitor.actualites_recentes.length > 3 && (
                <p className="text-sm text-muted-foreground italic">
                  +{competitor.actualites_recentes.length - 3} autres actualités
                </p>
              )}
            </div>
          </div>
        )}

        {/* Publications récentes */}
        {competitor.publications_recentes && competitor.publications_recentes.length > 0 && (
          <div>
            <h5 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Publications récentes ({competitor.publications_recentes.length})
            </h5>
            <div className="space-y-3">
              {competitor.publications_recentes.slice(0, 3).map((publication, idx) => (
                <div key={idx} className="border-l-4 border-green-200 pl-4 py-2 bg-green-50/30">
                  <h6 className="font-medium text-foreground text-sm">
                    {publication.titre || "Publication récente"}
                  </h6>
                  {publication.date && (
                    <p className="text-xs text-muted-foreground mt-1">{publication.date}</p>
                  )}
                  {publication.url && isValidUrl(publication.url) && (
                    <a
                      href={publication.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-green-600 hover:underline mt-1"
                    >
                      Lire <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                </div>
              ))}
              {competitor.publications_recentes.length > 3 && (
                <p className="text-sm text-muted-foreground italic">
                  +{competitor.publications_recentes.length - 3} autres publications
                </p>
              )}
            </div>
          </div>
        )}

        {/* Informations de contact */}
        {competitor.contact_info && Object.keys(competitor.contact_info).length > 0 && (
          <div className="bg-accent/5 rounded-lg p-4 border border-accent/20">
            <h5 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Informations de contact
            </h5>
            <div className="space-y-2">
              {competitor.contact_info.telephone && (
                <div className="flex items-center gap-3">
                  <Phone className="text-primary" size={16} />
                  <span className="text-sm text-foreground">{competitor.contact_info.telephone}</span>
                </div>
              )}
              {competitor.contact_info.email && (
                <div className="flex items-center gap-3">
                  <Mail className="text-primary" size={16} />
                  <a href={`mailto:${competitor.contact_info.email}`} className="text-sm text-primary hover:underline">
                    {competitor.contact_info.email}
                  </a>
                </div>
              )}
              {competitor.contact_info.adresse && (
                <div className="flex items-center gap-3">
                  <MapPin className="text-primary" size={16} />
                  <span className="text-sm text-foreground">{competitor.contact_info.adresse}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sources */}
        {competitor.sources && competitor.sources.length > 0 && (
          <div className="pt-4 border-t border-border/50">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground font-medium">Sources :</span>
              {competitor.sources
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
              {competitor.sources.filter((source) => isValidUrl(source)).length > 3 && (
                <Badge variant="outline" className="text-xs bg-background text-muted-foreground">
                  +{competitor.sources.filter((source) => isValidUrl(source)).length - 3} autres
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProspectCard({ 
  prospect, 
  onSearchContacts 
}: { 
  prospect: Prospect; 
  onSearchContacts?: (companyName: string, website: string) => void 
}) {
  return (
    <Card className="bg-card border border-border/50 shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Building2 className="text-primary flex-shrink-0 w-8 h-8" />
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">{prospect.nom_entreprise}</CardTitle>
              <CardDescription className="text-muted-foreground mt-1">{prospect.description_activite}</CardDescription>
              <div className="flex gap-2 mt-2">
                {prospect.site_web && isValidUrl(prospect.site_web) && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-sm text-primary hover:underline"
                    onClick={() => window.open(prospect.site_web, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Visiter le site web
                  </Button>
                )}
                {/* ADD THE CONTACT SEARCH BUTTON */}
                {onSearchContacts && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-accent/10 hover:bg-accent/20 text-accent-foreground border-accent/30"
                    onClick={() => onSearchContacts(prospect.nom_entreprise, prospect.site_web)}
                  >
                    <Users className="w-3 h-3 mr-1" />
                    Rechercher contacts
                  </Button>
                )}
              </div>
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
                    onClick={() => window.open(source, '_blank', 'noopener,noreferrer')}
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
  competitors,
  contacts,
  totalFound,
  cached,
  sources,
  statistics,
  onSearchFromBrainstorming,
    onSearchContacts, 

}: ResultsDisplayProps) {

// Replace the variables assignment and hasAnyResults function with this:

// CRITICAL FIX: The issue is in the data assignment, not the logic
// Replace the variable assignments at the top with this:

const displayProspects = prospects || enterprises || []
const displayCompetitors = competitors || [] // This should contain the 10 competitors

// Add comprehensive debugging right after variable assignments:
console.log('🔍 ResultsDisplay raw props:', {
  searchType,
  rawCompetitors: competitors,
  rawCompetitorsLength: competitors?.length || 0,
  rawProspects: prospects,
  rawEnterprises: enterprises,
  totalFound,
  propsReceived: Object.keys({
    searchType, prospects, enterprises, marketOpportunities, 
    competitorAnalysis, competitors, contacts, totalFound, cached, sources
  }).filter(key => arguments[0][key] !== undefined)
});

console.log('🔍 ResultsDisplay processed data:', {
  displayCompetitors: displayCompetitors.length,
  displayProspects: displayProspects.length,
  competitorAnalysis: !!competitorAnalysis,
  marketOpportunities: marketOpportunities?.length || 0,
  contacts: contacts?.length || 0
});

// Fixed hasAnyResults function:
const hasAnyResults = () => {
  switch (searchType) {
    case 'competitor-identification':
    case 'identification_concurrents':
      const hasCompetitors = displayCompetitors.length > 0;
      console.log('🎯 Competitor identification check:', { 
        hasCompetitors, 
        count: displayCompetitors.length, 
        totalFound,
        rawCompetitorsExists: !!competitors,
        rawCompetitorsLength: competitors?.length || 0
      });
      return hasCompetitors;
    case 'concurrent':
      return competitorAnalysis != null
    case 'brainstorming':
      return marketOpportunities && marketOpportunities.length > 0
    case 'contacts':
      return contacts && contacts.length > 0
    case 'entreprises':
    default:
      return displayProspects.length > 0
  }
}

// Debug the results check:
const debugHasResults = hasAnyResults();
console.log('🚨 hasAnyResults result:', debugHasResults, 'for searchType:', searchType);

// EMERGENCY FALLBACK: If totalFound > 0 but arrays are empty, there's a data mapping issue
if (!debugHasResults && totalFound > 0) {
  console.log('🚨 CRITICAL: totalFound > 0 but no display arrays populated!');
  console.log('🚨 This indicates a data structure mismatch between API and component');
  
  return (
    <div className="space-y-8 w-full max-w-5xl mx-auto">
      <Card className="border-red-400 bg-red-50 shadow-lg rounded-xl">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-6" />
          <p className="text-red-800 font-bold text-xl">Erreur de structure de données</p>
          <p className="text-red-700 text-base mt-2">
            Les données ont été trouvées ({totalFound} résultats) mais ne peuvent pas être affichées.
          </p>
          <div className="mt-4 text-sm text-red-600 space-y-1">
            <div>Debug: competitors={displayCompetitors.length}, prospects={displayProspects.length}, total={totalFound}</div>
            <div>Raw competitors: {competitors?.length || 0}</div>
            <div>Search type: {searchType}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
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
{totalFound || (displayProspects.length + displayCompetitors.length)} Résultat{(totalFound || (displayProspects.length + displayCompetitors.length)) > 1 ? "s" : ""} Trouvé{(totalFound || (displayProspects.length + displayCompetitors.length)) > 1 ? "s" : ""}
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

      {/* Statistics for competitor identification */}
      {searchType === "competitor-identification" && statistics && (
        <Card className="bg-accent/5 border border-accent/20 shadow-md rounded-xl">
          <CardContent className="p-6">
            <h4 className="font-bold text-xl text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Statistiques de l'analyse concurrentielle
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{statistics.total_concurrents || 0}</div>
                <div className="text-sm text-muted-foreground">Concurrents identifiés</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{statistics.avec_site_web || 0}</div>
                <div className="text-sm text-muted-foreground">Avec site web</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{statistics.avec_actualites || 0}</div>
                <div className="text-sm text-muted-foreground">Avec actualités</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{statistics.avec_publications || 0}</div>
                <div className="text-sm text-muted-foreground">Avec publications</div>
              </div>
            </div>
            
            {/* Additional statistics */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {statistics.regions_representees && statistics.regions_representees.length > 0 && (
                <div>
                  <h5 className="font-semibold text-sm text-foreground mb-2">Régions représentées</h5>
                  <div className="flex flex-wrap gap-1">
                    {statistics.regions_representees.slice(0, 5).map((region, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {region}
                      </Badge>
                    ))}
                    {statistics.regions_representees.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{statistics.regions_representees.length - 5}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {statistics.marches_identifies && statistics.marches_identifies.length > 0 && (
                <div>
                  <h5 className="font-semibold text-sm text-foreground mb-2">Marchés identifiés</h5>
                  <div className="flex flex-wrap gap-1">
                    {statistics.marches_identifies.slice(0, 5).map((marche, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-primary/10 text-primary">
                        {marche}
                      </Badge>
                    ))}
                    {statistics.marches_identifies.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{statistics.marches_identifies.length - 5}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {statistics.specialites_identifiees && statistics.specialites_identifiees.length > 0 && (
                <div>
                  <h5 className="font-semibold text-sm text-foreground mb-2">Spécialités identifiées</h5>
                  <div className="flex flex-wrap gap-1">
                    {statistics.specialites_identifiees.slice(0, 5).map((specialite, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-secondary">
                        {specialite}
                      </Badge>
                    ))}
                    {statistics.specialites_identifiees.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{statistics.specialites_identifiees.length - 5}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
            <div className="flex items-start justify-between">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-primary">
                <Lightbulb className="w-6 h-6" />
                {opportunity.nom_marche}
              </CardTitle>
              {onSearchFromBrainstorming && (
                <Button
                  onClick={() => onSearchFromBrainstorming(
                    opportunity.nom_marche, 
                    opportunity.produits_cgr_applicables
                  )}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground cursor-pointer"
                  size="sm"
                
                >
                  <Building2 className="w-4 h-4 mr-2"  />
                  Rechercher des entreprises
                </Button>
              )}
            </div>
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
                  <ProspectCard key={index} prospect={prospect}               onSearchContacts={onSearchContacts}/>
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
        
        {/* NOUVEAU : Commentaire d'information sur LinkedIn */}
        <Card className="bg-blue-50 border border-blue-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-800 font-medium">Information importante</p>
                <p className="text-sm text-blue-700 mt-1">
                  L'outil ne permet pas toujours d'identifier le bon lien LinkedIn. Nous vous recommandons de vérifier manuellement les profils LinkedIn avant de prendre contact.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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

{searchType === "competitor-identification" && displayCompetitors.length > 0 && (
  <div className="space-y-6">
    <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
      <Shield className="w-7 h-7 text-red-600" />
      Concurrents identifiés ({displayCompetitors.length})
    </h3>
    <div className="grid gap-6">
      {displayCompetitors.map((competitor, index) => (
        <CompetitorCard key={index} competitor={competitor} />
      ))}
    </div>
  </div>
)}

    </div>
  )
}