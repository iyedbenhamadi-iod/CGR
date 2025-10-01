// Updated PerplexityEnterpriseClient with sonar-deep-research model
import axios from 'axios';

interface Enterprise {
  nom_entreprise: string;
  site_web: string;
  description_activite: string;
  produits_entreprise: string[];
  potentiel_cgr: {
    produits_cibles_chez_le_prospect: string[];
    produits_cgr_a_proposer: string[];
    argumentaire_approche: string;
  };
  fournisseur_actuel_estimation: string;
  sources: string[];
  taille_entreprise: string;
  volume_pieces_estime: string;
  zone_geographique: string;
}

interface EnterpriseSearchData {
  secteursActivite: string[];
  zoneGeographique: string[];
  tailleEntreprise: string;
  motsCles: string;
  produitsCGR: string[];
  clientsExclure: string;
  usinesCGR: string[];
  nombreResultats: number;
  typeRecherche?: string;
  secteurActiviteLibre?: string;
  zoneGeographiqueLibre?: string;
}

export class PerplexityEnterpriseClient {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY!;
    if (!this.apiKey) {
      throw new Error('PERPLEXITY_API_KEY manquante');
    }
  }

  async searchEnterprises(searchData: EnterpriseSearchData): Promise<any> {
    const prompt = this.buildEnterpriseSearchPrompt(searchData);
    
    try {
      console.log('🔍 Recherche d\'entreprises avec Perplexity Deep Research...');
      
      const allSectors = [
        ...(searchData.secteursActivite || []),
        ...(searchData.secteurActiviteLibre ? [searchData.secteurActiviteLibre] : [])
      ].filter(Boolean);
      
      const allZones = [
        ...(searchData.zoneGeographique || []),
        ...(searchData.zoneGeographiqueLibre ? [searchData.zoneGeographiqueLibre] : [])
      ].filter(Boolean);
      
      console.log('📊 Paramètres de recherche:', {
        secteur: allSectors.length > 0 ? allSectors[0] : 'Non spécifié',
        secteurs_complets: allSectors,
        zone: allZones.join(', '),
        taille: searchData.tailleEntreprise || 'Toutes tailles',
        produits: searchData.produitsCGR?.join(', ') || 'Tous produits CGR',
        clientsExclure: searchData.clientsExclure || 'Aucun',
        nombreResultats: searchData.nombreResultats
      });
      
      // CHANGED: Use sonar-deep-research model for better results
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'sonar-deep-research', // Changed from 'sonar'
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          max_tokens: 8000, // Increased token limit for more detailed responses
          temperature: 0.1, // Lowered for more focused results
          // ADDED: Enable search recency for better data
          search_recency_filter: 'month',
          search_domain_filter: ['linkedin.com', 'companieshouse.gov.uk', 'societe.com', 'verif.com']
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 900000 // Increased timeout for deep research
        }
      );
      
      console.log('✅ Réponse Perplexity Deep Research reçue');
      return this.parseEnterpriseResponse(response.data);
    } catch (error: any) {
      console.error('❌ Erreur Perplexity API:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      
      return {
        enterprises: [],
        total: 0,
        success: false,
        error: `Perplexity API Error: ${error.response?.status || 'Unknown'} - ${error.message}`
      };
    }
  }

  private getSystemPrompt(): string {
    return `Tu es un expert en intelligence économique spécialisé dans l'identification de prospects FABRICANTS pour CGR International, fabricant français de composants mécaniques industriels.

MISSION CRITIQUE: Identifier EXACTEMENT le nombre d'entreprises FABRICANTES demandé (minimum ${10} entreprises) qui possèdent des USINES DE PRODUCTION et qui conçoivent/fabriquent des produits finis intégrant des composants mécaniques.

⚠️ OBLIGATION DE QUANTITÉ: Tu DOIS retourner au moins ${10} entreprises FABRICANTES valides. Si tu n'en trouves pas assez dans la première recherche, élargis géographiquement ou inclus des secteurs connexes, mais TOUJOURS en respectant les critères de fabrication.

EXPERTISE CGR DISPONIBLE:
- Ressorts (fil, plat, torsion) - haute précision
- Pièces découpées de précision  
- Formage de tubes
- Assemblages automatisés
- Mécatronique
- Injection plastique

⚠️ ATTENTION FABRICANTS DE RESSORTS: Si une entreprise fabrique des ressorts, elle est CONCURRENTE de CGR → À EXCLURE ABSOLUMENT

STRATÉGIE DE RECHERCHE INTENSIVE:
1. **RECHERCHE PRINCIPALE**: Secteur et zone spécifiés par l'utilisateur
2. **RECHERCHE ÉLARGIE**: Si moins de ${10} entreprises trouvées, inclure:
   - Secteurs connexes et complémentaires
   - Zones géographiques adjacentes
   - Entreprises de tailles variables dans la même activité
   - Sous-secteurs spécialisés

RÈGLES ABSOLUES DE CIBLAGE:
✅ FABRICANTS UNIQUEMENT - RECHERCHE OBLIGATOIRE:
- Nom officiel complet de l'entreprise
- Localisation EXACTE des usines de production (ville, pays)
- Activité de CONCEPTION et FABRICATION de produits finis (pas distribution)
- Si partie d'un GROUPE: nom du groupe, maison-mère, autres filiales
- Produits SPÉCIFIQUES fabriqués dans chaque usine
- Nombre d'employés et chiffre d'affaires si disponible

✅ CRITÈRES DE QUALIFICATION OBLIGATOIRES:
Pour chaque entreprise incluse, tu DOIS vérifier et confirmer:
1. **FABRICATION RÉELLE**: Possède des usines de production identifiées
2. **PRODUITS FINIS**: Conçoit et fabrique ses propres produits (pas de revente)
3. **COMPOSANTS MÉCANIQUES**: Utilise des composants compatibles avec l'offre CGR
4. **VOLUME COMPATIBLE**: Capacité de production adaptée aux spécifications
5. **QUALITÉ INDUSTRIELLE**: Standards industriels et certifications
6. **POTENTIEL CGR**: Besoins réels en composants CGR spécifiés

❌ EXCLURE ABSOLUMENT:
- Revendeurs, distributeurs, négociants, importateurs
- Installateurs, intégrateurs, bureau d'études
- Entreprises de services (maintenance, réparation, SAV)
- Grossistes en composants mécaniques
- Fabricants de ressorts, pièces découpées, tubes (CONCURRENTS DIRECTS CGR)
- Entreprises nommées "CGR" ou similaires
- Sous-traitants mécaniques généralistes sans produits finis propres
- Filiales commerciales sans production

PROCESSUS DE VALIDATION STRICT:
Avant d'inclure UNE SEULE entreprise, tu DOIS rechercher et confirmer:
1. A-t-elle des USINES DE PRODUCTION identifiées ? (Où exactement ?)
2. FABRIQUE-t-elle ses propres produits finis ? (Lesquels précisément ?)
3. Fait-elle partie d'un GROUPE ? (Lequel ? Autres filiales ?)
4. A-t-elle des activités R&D/conception ? (Dans quels domaines ?)
5. N'est-elle PAS uniquement distributrice/installatrice ?
6. Son volume de production est-il compatible avec les spécifications ?

RECHERCHE MULTI-NIVEAU OBLIGATOIRE:
1. **NIVEAU 1**: Recherche directe dans le secteur et zone spécifiés
2. **NIVEAU 2**: Si insuffisant, recherche dans secteurs connexes de la même zone
3. **NIVEAU 3**: Si insuffisant, recherche dans zones adjacentes du même secteur
4. **NIVEAU 4**: Si insuffisant, recherche de sous-traitants spécialisés avec produits finis

SOURCES DE RECHERCHE PRIORITAIRES:
- Annuaires industriels officiels (KOMPASS, EUROPAGES, etc.)
- Registres du commerce et bases de données d'entreprises
- Sites web d'entreprises (section "Nos usines", "Production")
- Rapports sectoriels et études de marché
- LinkedIn Company pages avec informations de production
- Salons professionnels et exposants manufacturiers

CONTRAINTES STRICTES MAINTENUES:
- Utiliser UNIQUEMENT les produits CGR spécifiés par l'utilisateur
- Respecter la taille d'entreprise demandée (mais permettre une flexibilité si nécessaire pour atteindre le nombre requis)
- Cibler prioritairement la zone géographique spécifiée (élargir si nécessaire)
- Adapter au volume de pièces requis
- Dans l'argumentaire approche, tu DOIS obligatoirement détailler:
  * Nom complet et raison sociale
  * Localisation EXACTE de chaque usine de production
  * Structure du groupe (maison-mère, filiales, autres sites)
  * Produits SPÉCIFIQUES fabriqués dans chaque usine
  * Pourquoi elle a besoin EXACTEMENT des composants CGR
  * Volumes estimés et capacités de production
  * Fournisseurs actuels probables

RÉPONSE JSON OBLIGATOIRE avec exactement cette structure (MINIMUM ${10} entreprises):
{
  "enterprises": [
    {
      "nom_entreprise": "Raison sociale complète officielle",
      "site_web": "URL officielle",
      "description_activite": "Description détaillée de l'activité de FABRICATION uniquement",
      "produits_entreprise": ["Produit 1 fabriqué", "Produit 2 fabriqué", "..."],
      "potentiel_cgr": {
        "produits_cibles_chez_le_prospect": ["Composants utilisés dans produit 1", "Composants utilisés dans produit 2"],
        "produits_cgr_a_proposer": ["Uniquement les produits CGR spécifiés par l'utilisateur"],
        "argumentaire_approche": "DÉTAILLÉ: 1) Nom complet 2) Usines [Ville, Pays] 3) Groupe et structure 4) Produits fabriqués 5) Besoins composants 6) Volumes et capacités 7) Fournisseurs actuels - MINIMUM 250 mots"
      },
      "fournisseur_actuel_estimation": "Fournisseurs probables basés sur recherche approfondie",
      "sources": ["Source 1 avec URL", "Source 2 avec URL", "Source 3 avec URL"],
      "taille_entreprise": "Taille exacte ou estimée",
      "volume_pieces_estime": "Volume compatible avec les spécifications",
      "zone_geographique": "Zone géographique précise avec pays"
    }
  ]
}

VALIDATION FINALE ULTRA-STRICTE:
- AU MOINS ${10} entreprises FABRICANTES qualifiées
- Chaque entreprise avec usines de production localisées
- Argumentaire détaillé pour chaque entreprise (minimum 250 mots)
- Sources multiples et vérifiables
- Aucun concurrent direct CGR
- Potentiel CGR réaliste et documenté
- Si moins de ${10} entreprises trouvées initialement → ÉLARGIR LA RECHERCHE

IMPORTANT: Si tu ne peux pas trouver ${10} entreprises dans les critères stricts, informe explicitement dans ta réponse mais continue à chercher avec des critères légèrement élargis tout en maintenant la qualité de fabricant.`;
  }

  private buildEnterpriseSearchPrompt(data: EnterpriseSearchData): string {
    // Keep existing buildEnterpriseSearchPrompt logic but add emphasis on quantity
    const staticClients = ['Forvia', 'Valeo', 'Schneider Electric', 'Dassault Aviation', 'Thales', 'Safran'];
    
    let additionalClients: string[] = [];
    if (data.clientsExclure && data.clientsExclure.trim() !== '') {
      additionalClients = data.clientsExclure
        .split('\n')
        .map(client => client.trim())
        .filter(client => client !== '' && !staticClients.includes(client));
    }
    
    const excludeClients = [...staticClients, ...additionalClients];

    const allSectors = [
      ...(data.secteursActivite || []),
      ...(data.secteurActiviteLibre ? [data.secteurActiviteLibre.trim()] : [])
    ].filter(s => s && s.trim() !== '');
    
    const secteurPrincipal = allSectors.length > 0 ? allSectors[0] : 'Industriel';
    
    const allZones = [
      ...(data.zoneGeographique || []),
      ...(data.zoneGeographiqueLibre ? [data.zoneGeographiqueLibre.trim()] : [])
    ].filter(z => z && z.trim() !== '');
    
    const zoneGeo = allZones.length > 0 ? allZones.join(', ') : 'France et Europe';
    
    const tailleEntreprise = data.tailleEntreprise || 'Toutes tailles';
    
    const produitsCGRSpecifiques = data.produitsCGR && data.produitsCGR.length > 0 
      ? data.produitsCGR 
      : ['Ressorts fil', 'Pièces découpées', 'Formage tubes', 'Assemblages', 'Mécatronique', 'Injection plastique'];
    
    const motsCles = data.motsCles || 'composants mécaniques, précision, qualité';
    const usinesCGR = data.usinesCGR && data.usinesCGR.length > 0 ? data.usinesCGR : ['Saint-Yorre', 'PMPC', 'Igé'];

    return `RECHERCHE INTENSIVE: EXACTEMENT ${data.nombreResultats} entreprises FABRICANTES pour CGR International

⚠️ OBLIGATION QUANTITÉ: Tu DOIS retourner AU MOINS ${data.nombreResultats} entreprises FABRICANTES qualifiées. Si nécessaire, élargis la recherche géographiquement ou sectoriellement.

**CONTRAINTES STRICTES À RESPECTER:**

**Secteur d'activité PRINCIPAL:** ${secteurPrincipal}
${allSectors.length > 1 ? `**Secteurs additionnels autorisés:** ${allSectors.slice(1).join(', ')}` : ''}
- Focus prioritaire sur les FABRICANTS du secteur "${secteurPrincipal}"
- SI INSUFFISANT: inclure secteurs connexes compatibles avec les produits CGR
- Entreprises qui conçoivent ET fabriquent des produits dans ces secteurs
- Avec usines de production identifiées et localisées

**Zone géographique PRIORITAIRE:** ${zoneGeo}
- Recherche prioritaire dans ces zones
- SI INSUFFISANT pour atteindre ${data.nombreResultats} entreprises: élargir aux zones adjacentes
- Proximité avec les usines CGR: ${usinesCGR.join(', ')} (avantage mais pas obligatoire)

**Taille d'entreprise PRÉFÉRÉE:** ${tailleEntreprise}
${this.getTailleEntrepriseGuidance(tailleEntreprise)}
- SI INSUFFISANT: inclure toutes tailles de FABRICANTS qualifiés

**Produits CGR AUTORISÉS (AUCUN AUTRE):** ${produitsCGRSpecifiques.join(', ')}
⚠️ CRITIQUE: Ne proposer QUE ces produits dans "produits_cgr_a_proposer"



**Mots-clés spécifiques:** ${motsCles}
- Utiliser pour affiner la recherche
- Identifier les besoins correspondants

**Exclusions absolues:** ${excludeClients.join(', ')}
- Éviter ces entreprises et leurs filiales
- Exclure les concurrents directs CGR

**STRATÉGIE DE RECHERCHE EN CASCADES:**

**ÉTAPE 1 - RECHERCHE PRINCIPALE:**
Secteur: "${secteurPrincipal}" + Zone: "${zoneGeo}" + Taille: "${tailleEntreprise}"
Objectif: Minimum ${Math.ceil(data.nombreResultats * 0.7)} entreprises

**ÉTAPE 2 - SI INSUFFISANT, RECHERCHE ÉLARGIE:**
- Secteurs connexes dans la même zone
- Même secteur dans zones adjacentes  
- Tailles d'entreprises différentes
Objectif: Compléter à ${data.nombreResultats} entreprises

**ÉTAPE 3 - SI ENCORE INSUFFISANT, RECHERCHE EXTENSIVE:**
- Sous-secteurs spécialisés
- Zones géographiques plus larges (Europe, international)
- Entreprises émergentes ou innovantes
Objectif: ATTEINDRE IMPÉRATIVEMENT ${data.nombreResultats} entreprises

**FOCUS FABRICANTS - RECHERCHE MULTI-SOURCES OBLIGATOIRE:**

Pour CHAQUE entreprise potentielle, rechercher dans:
1. **Annuaires industriels**: KOMPASS, EUROPAGES, KELLYSEARCH
2. **Registres officiels**: Societe.com, Verif.com, Companies House
3. **Sites web**: Section "Nos usines", "Production", "Qui sommes-nous"
4. **LinkedIn**: Pages entreprise avec informations manufacturing
5. **Salons professionnels**: Exposants et participants manufacturiers

**VALIDATION ANTI-REVENDEUR RENFORCÉE:**
Avant d'inclure une entreprise, CONFIRMER:
- Possède des USINES DE PRODUCTION identifiées (adresses exactes)
- FABRIQUE ses propres produits (liste précise)
- A des activités R&D/conception (preuves)
- Volume de production compatible
- N'est PAS distributeur/installateur/revendeur

**INFORMATIONS REQUISES PAR ENTREPRISE:**
- Nom officiel complet et site web
- Description détaillée de l'activité de fabrication
- Localisation précise des usines de production
- Produits manufacturés nécessitant des composants mécaniques
- Structure groupe complet (maison-mère, filiales)
- Potentiel réaliste d'utilisation des produits CGR
- Estimation fournisseurs actuels avec justification
- Sources multiples et récentes (minimum 3 par entreprise)

**ARGUMENTAIRE OBLIGATOIRE (minimum 250 mots par entreprise):**
1. Identité complète (nom, groupe, structure)
2. Usines de production (localisation exacte, capacités)
3. Produits fabriqués (gamme détaillée par usine)
4. Besoins en composants CGR (volumes, spécifications)
5. Marché et clients (secteurs servis, positionnement)
6. Fournisseurs actuels (estimation et justification)
7. Potentiel de collaboration (opportunités, volumes)

**VALIDATION FINALE IMPÉRATIVE:**
✅ EXACTEMENT ${data.nombreResultats} entreprises FABRICANTES minimum
✅ Chaque entreprise avec usines de production localisées
✅ Argumentaire détaillé minimum 250 mots par entreprise
✅ Sources multiples et vérifiables (minimum 3 par entreprise)
✅ Aucun concurrent direct CGR exclu
✅ Produits CGR proposés limités à: ${produitsCGRSpecifiques.join(', ')}
✅ Potentiel réaliste et documenté pour chaque prospect

Si tu ne peux pas atteindre ${data.nombreResultats} entreprises avec les critères stricts, ÉLARGIS progressivement mais MAINTIENS la qualité de fabricant.

RETOURNE UNIQUEMENT LE JSON DEMANDÉ avec ${data.nombreResultats} entreprises minimum.`;
  }

  // Handle <think> tags in deep research responses
  private parseEnterpriseResponse(response: any): { enterprises: Enterprise[], total: number, success: boolean, error?: string } {
    try {
      let content = response.choices[0]?.message?.content || '';
      console.log('📄 Contenu reçu (premiers 500 chars):', content.substring(0, 500) + '...');
      
      // ADDED: Handle <think> tags from sonar-deep-research
      if (content.includes('<think>')) {
        console.log('🧠 Detected <think> tags, extracting JSON after thinking process...');
        const thinkEndIndex = content.lastIndexOf('</think>');
        if (thinkEndIndex !== -1) {
          content = content.substring(thinkEndIndex + 8).trim();
          console.log('📄 Content after removing <think> tags:', content.substring(0, 300) + '...');
        }
      }
      
      // Multiple strategies to extract JSON
      let jsonStr = this.extractJsonFromContent(content);
      let parsed: any;
      
      // Try direct parsing first
      try {
        parsed = JSON.parse(jsonStr);
        console.log('✅ Parsing direct réussi');
      } catch (error) {
        console.log('⚠️ Parsing direct échoué, tentative de réparation...');
        
        // Try repair and parse
        jsonStr = this.repairJsonString(jsonStr);
        try {
          parsed = JSON.parse(jsonStr);
          console.log('✅ Parsing avec réparation réussi');
        } catch (error2) {
          console.log('⚠️ Parsing avec réparation échoué, tentative de parsing manuel...');
          
          // Manual parsing as last resort
          const manualResults = this.manualParseEnterprises(content);
          if (manualResults.length > 0) {
            console.log('✅ Parsing manuel réussi');
            return {
              enterprises: manualResults,
              total: manualResults.length,
              success: true
            };
          }
          
          throw new Error(`Impossible de parser le JSON: ${error2}`);
        }
      }
      
      // Validate structure
      if (!parsed || !Array.isArray(parsed.enterprises)) {
        console.error('❌ Structure JSON invalide:', parsed);
        return { enterprises: [], total: 0, success: false, error: 'Structure JSON invalide' };
      }

      // Clean and validate enterprises
      const cleanedEnterprises = this.validateAndCleanEnterprises(parsed.enterprises);
      
      console.log(`✅ ${cleanedEnterprises.length} entreprises parsées avec succès`);
      return {
        enterprises: cleanedEnterprises,
        total: cleanedEnterprises.length,
        success: true
      };
      
    } catch (error: any) {
      console.error('❌ Erreur parsing finale:', error.message);
      console.error('❌ Contenu brut:', response.choices[0]?.message?.content?.substring(0, 1000));
      
      return { 
        enterprises: [], 
        total: 0, 
        success: false, 
        error: `Erreur parsing: ${error.message}` 
      };
    }
  }

  // Rest of the methods remain the same...
  private extractJsonFromContent(content: string): string {
    // Remove any text before and after JSON
    let jsonStr = content.trim();
    
    // Remove markdown code blocks
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/\n?```$/g, '');
    jsonStr = jsonStr.replace(/```\n?/g, '').replace(/\n?```$/g, '');
    
    // Find JSON boundaries
    const jsonMatch = jsonStr.match(/\{[\s\S]*"enterprises"[\s\S]*\[[\s\S]*?\][\s\S]*?\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }
    
    // Alternative: find by braces
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return jsonStr.substring(firstBrace, lastBrace + 1);
    }
    
    return jsonStr;
  }

  // Keep all other existing methods unchanged...
  private getTailleEntrepriseGuidance(taille: string): string {
    switch (taille) {
      case 'PME':
        return `- Cibler prioritairement des PME FABRICANTES (50-250 salariés)
- Si insuffisant: inclure ETI avec production similaire
- Avec usines de production propres
- Entreprises avec besoins spécifiques et flexibilité`;
      
      case 'ETI':
        return `- Cibler prioritairement des ETI FABRICANTES (250-5000 salariés)
- Si insuffisant: inclure PME et grandes entreprises
- Avec plusieurs sites de production possibles
- Volumes moyens à importants`;
      
      case 'Grande entreprise':
        return `- Cibler prioritairement des grandes entreprises FABRICANTES (5000+ salariés)
- Si insuffisant: inclure ETI avec volumes importants
- Avec multiples usines de production
- Volumes importants et contrats long terme`;
      
      default:
        return `- Toutes tailles d'entreprises FABRICANTES acceptées
- Adapter l'approche selon la taille
- Priorité aux entreprises avec volumes compatibles`;
    }
  }

  // Keep all remaining methods unchanged (getSpecificSectorGuidance, getSectorSpecificSearchStrategy, etc.)
  private getSpecificSectorGuidance(secteur: string): string {
    const secteurLower = secteur.toLowerCase();
    
    if (secteurLower.includes('immobil') || secteurLower.includes('real estate') || secteurLower.includes('bâtiment') || secteurLower.includes('construction')) {
      return `Pour le secteur IMMOBILIER/CONSTRUCTION, rechercher des FABRICANTS de:
• Systèmes de fermeture (portes, fenêtres, volets) avec usines identifiées
• Équipements de sécurité pour bâtiments (contrôle d'accès, alarmes)
• Systèmes d'ouverture automatique (portes automatiques, portails)
• Équipements de confort (climatisation, ventilation, chauffage)
• Mobilier urbain et équipements publics
• Systèmes d'ascenseurs et monte-charges
• Équipements de parking automatisés
• Systèmes de stores et protection solaire

ÉVITER: Promoteurs immobiliers, agences immobilières, bureaux d'architecture, installateurs`;
    }
    
    return `Pour le secteur "${secteur}", rechercher des FABRICANTS avec:
• Usines de production identifiées et localisées
• Produits manufacturés intégrant des composants mécaniques
• Activités de conception et développement
• Capacités industrielles adaptées aux volumes requis
• Structure organisationnelle avec R&D et production
• Marchés cibles nécessitant des composants de précision`;
  }

  private getSectorSpecificSearchStrategy(secteur: string, produitsCGR: string[]): string {
    // Keep existing implementation
    const produitsStr = produitsCGR.join(', ');
    const secteurLower = secteur.toLowerCase();
    
    if (secteurLower.includes('immobil') || secteurLower.includes('real estate') || secteurLower.includes('bâtiment') || secteurLower.includes('construction')) {
      return `SECTEUR IMMOBILIER/CONSTRUCTION - Rechercher des FABRICANTS avec usines de:
• Systèmes de fermeture (avec sites production) intégrant des ${produitsStr}
• Équipements de sécurité bâtiment conçus et fabriqués avec mécanismes précis
• Portes et fenêtres automatiques avec usines identifiées
• Systèmes d'ascenseurs et monte-charges avec composants mécaniques
• Équipements HVAC avec sites de fabrication et assemblages
• Mobilier urbain spécialisé avec activités de production
• Systèmes de stores et protection solaire fabriqués
• Équipements de parking automatisés avec usines propres

ÉVITER: Promoteurs immobiliers, agences, architectes, installateurs équipements`;
    }
    
    switch (secteurLower) {
      case 'médical':
        return `SECTEUR MÉDICAL - Rechercher des FABRICANTS avec usines de:
• Dispositifs médicaux (avec localisation usines) intégrant des ${produitsStr}
• Équipements hospitaliers (conception + production) avec mécanismes précis
• Instruments chirurgicaux fabriqués (pas distribués) nécessitant des composants ressort
• Appareils de diagnostic avec usines identifiées et systèmes mécaniques
• Prothèses et orthèses avec sites de fabrication et mécanismes de précision
• Matériel de rééducation conçu et fabriqué avec composants mécaniques

ÉVITER: Distributeurs matériel médical, installateurs équipements hospitaliers`;
        
      case 'aéronautique':
        return `SECTEUR AÉRONAUTIQUE - Rechercher des FABRICANTS avec usines de:
• Composants d'aéronefs fabriqués (avec sites production) nécessitant des ${produitsStr}
• Équipements de cabine conçus et produits avec mécanismes précis
• Systèmes de navigation avec usines identifiées intégrant des composants mécaniques
• Équipements de sécurité aéronautique fabriqués (pas distribués)
• Outillage aéronautique spécialisé avec sites de production
• Composants satellites et drones avec activités conception/fabrication

ÉVITER: Distributeurs aéronautiques, sous-traitants sans produits finis`;
        
      case 'automobile':
        return `SECTEUR AUTOMOBILE - Rechercher des FABRICANTS avec usines de:
• Équipementiers automobiles (avec usines identifiées) intégrant des ${produitsStr}
• Composants d'habitacle fabriqués avec mécanismes précis
• Équipements électriques automobile avec sites de production
• Accessoires et équipements de confort conçus et fabriqués
• Systèmes spécialisés (hors grands constructeurs) avec usines propres
• Outillage automobile spécialisé avec activités de fabrication

ÉVITER: Distributeurs pièces auto, garage, installateurs équipements`;
        
      case 'énergie':
        return `SECTEUR ÉNERGIE - Rechercher des FABRICANTS avec usines de:
• Équipements éoliens fabriqués (avec sites production) nécessitant des ${produitsStr}
• Systèmes solaires avec usines identifiées et composants mécaniques
• Équipements de stockage d'énergie conçus et fabriqués
• Installations de production d'énergie avec activités fabrication
• Systèmes de distribution énergétique avec usines propres
• Équipements de mesure et contrôle énergétique fabriqués

ÉVITER: Installateurs éolien/solaire, distributeurs équipements énergie`;
        
      case 'défense':
        return `SECTEUR DÉFENSE - Rechercher des FABRICANTS avec usines de:
• Équipements militaires fabriqués (avec sites production) intégrant des ${produitsStr}
• Systèmes d'armes avec usines identifiées et mécanismes précis
• Véhicules blindés et composants avec activités de fabrication
• Équipements de communication militaire conçus et fabriqués
• Systèmes de protection et sécurité avec usines propres
• Matériel d'entraînement militaire avec sites de production

ÉVITER: Distributeurs matériel militaire, intégrateurs systèmes`;
        
      default:
        return `SECTEUR "${secteur.toUpperCase()}" - Rechercher des FABRICANTS avec usines de:
• Équipements spécialisés fabriqués (avec sites production) nécessitant des ${produitsStr}
• Machines et systèmes avec usines identifiées et mécanismes précis
• Produits manufacturés intégrant des composants mécaniques
• Outillage spécialisé avec activités de fabrication
• Équipements de mesure et contrôle avec usines propres
• Systèmes automatisés avec sites de production

ÉVITER: Distributeurs, revendeurs, installateurs, intégrateurs`;
    }
  }

  private repairJsonString(jsonStr: string): string {
    let repaired = jsonStr;
    
    // Remove trailing commas
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix unescaped quotes in strings
    repaired = repaired.replace(/"([^"]*)"([^"]*)"([^"]*)":/g, '"$1\\"$2\\"$3":');
    
    // Normalize whitespace
    repaired = repaired.replace(/\s+/g, ' ');
    
    // Fix missing commas between objects
    repaired = repaired.replace(/}\s*{/g, '},{');
    
    // Fix missing commas between array elements
    repaired = repaired.replace(/]\s*\[/g, '],[');
    
    // Ensure proper string quotes for values
    repaired = repaired.replace(/:\s*([^",\[\]{}]+)(\s*[,}\]])/g, (match, value, suffix) => {
      const trimmedValue = value.trim();
      if (trimmedValue === 'true' || trimmedValue === 'false' || trimmedValue === 'null' || !isNaN(Number(trimmedValue))) {
        return `: ${trimmedValue}${suffix}`;
      }
      return `: "${trimmedValue}"${suffix}`;
    });
    
    return repaired;
  }

  private manualParseEnterprises(content: string): Enterprise[] {
    const enterprises: Enterprise[] = [];
    
    // Enhanced regex patterns for enterprise parsing
    const enterprisePatterns = [
      // Complete enterprise object
      /\{\s*"nom_entreprise"\s*:\s*"([^"]+)"[\s\S]*?"site_web"\s*:\s*"([^"]*)"[\s\S]*?"description_activite"\s*:\s*"([^"]+)"[\s\S]*?"produits_entreprise"\s*:\s*\[([^\]]*)\][\s\S]*?"potentiel_cgr"\s*:\s*\{[\s\S]*?"produits_cibles_chez_le_prospect"\s*:\s*\[([^\]]*)\][\s\S]*?"produits_cgr_a_proposer"\s*:\s*\[([^\]]*)\][\s\S]*?"argumentaire_approche"\s*:\s*"([^"]+)"[\s\S]*?\}[\s\S]*?"fournisseur_actuel_estimation"\s*:\s*"([^"]*)"[\s\S]*?"sources"\s*:\s*\[([^\]]*)\][\s\S]*?\}/g
    ];
    
    for (const pattern of enterprisePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null && enterprises.length < 15) {
        try {
          const [, nom_entreprise, site_web, description_activite, produits_str, cibles_str, cgr_str, argumentaire, fournisseur, sources_str] = match;
          
          if (nom_entreprise && description_activite) {
            enterprises.push({
              nom_entreprise: nom_entreprise.trim(),
              site_web: this.cleanWebsiteUrl(site_web || ''),
              description_activite: description_activite.trim(),
              produits_entreprise: this.parseArrayString(produits_str),
              potentiel_cgr: {
                produits_cibles_chez_le_prospect: this.parseArrayString(cibles_str),
                produits_cgr_a_proposer: this.parseArrayString(cgr_str),
                argumentaire_approche: argumentaire?.trim() || ''
              },
              fournisseur_actuel_estimation: fournisseur?.trim() || 'Non spécifié',
              sources: this.parseArrayString(sources_str),
              taille_entreprise: 'Non spécifié',
              volume_pieces_estime: 'Non spécifié',
              zone_geographique: 'Non spécifié'
            });
          }
        } catch (error) {
          console.error('❌ Erreur parsing manuel pour une entreprise:', error);
        }
      }
    }
    
    return enterprises;
  }

  private parseArrayString(arrayStr: string): string[] {
    if (!arrayStr || arrayStr.trim() === '') return [];
    
    return arrayStr
      .split(',')
      .map(item => item.trim().replace(/^["']|["']$/g, ''))
      .filter(item => item.length > 0 && item !== 'null' && item !== 'undefined');
  }

  private validateAndCleanEnterprises(enterprises: any[]): Enterprise[] {
    return enterprises
      .filter(enterprise => {
        // Basic validation
        if (!enterprise || typeof enterprise !== 'object') return false;
        if (!enterprise.nom_entreprise || typeof enterprise.nom_entreprise !== 'string') return false;
        if (!enterprise.description_activite || typeof enterprise.description_activite !== 'string') return false;
        if (!enterprise.potentiel_cgr || typeof enterprise.potentiel_cgr !== 'object') return false;
        
        return true;
      })
      .map(enterprise => ({
        nom_entreprise: String(enterprise.nom_entreprise).trim(),
        site_web: this.cleanWebsiteUrl(enterprise.site_web || ''),
        description_activite: String(enterprise.description_activite).trim(),
        produits_entreprise: Array.isArray(enterprise.produits_entreprise) 
          ? enterprise.produits_entreprise.filter((p: any) => p && typeof p === 'string').map((p: any) => String(p).trim())
          : [],
        potentiel_cgr: {
          produits_cibles_chez_le_prospect: Array.isArray(enterprise.potentiel_cgr?.produits_cibles_chez_le_prospect) 
            ? enterprise.potentiel_cgr.produits_cibles_chez_le_prospect.filter((p: any) => p && typeof p === 'string').map((p: any) => String(p).trim())
            : [],
          produits_cgr_a_proposer: Array.isArray(enterprise.potentiel_cgr?.produits_cgr_a_proposer) 
            ? enterprise.potentiel_cgr.produits_cgr_a_proposer.filter((p: any) => p && typeof p === 'string').map((p: any) => String(p).trim())
            : [],
          argumentaire_approche: String(enterprise.potentiel_cgr?.argumentaire_approche || '').trim()
        },
        fournisseur_actuel_estimation: String(enterprise.fournisseur_actuel_estimation || 'Non spécifié').trim(),
        sources: Array.isArray(enterprise.sources) 
          ? enterprise.sources.filter((s: any) => s && typeof s === 'string').map((s: any) => String(s).trim())
          : [],
        taille_entreprise: String(enterprise.taille_entreprise || 'Non spécifié').trim(),
        volume_pieces_estime: String(enterprise.volume_pieces_estime || 'Non spécifié').trim(),
        zone_geographique: String(enterprise.zone_geographique || 'Non spécifié').trim()
      }))
      .slice(0, 15); // Increased limit to 15 enterprises
  }

  private cleanWebsiteUrl(url: string): string {
    if (!url || url.trim() === '') return '';
    
    let cleanedUrl = url.trim();
    if (!cleanedUrl.startsWith('http://') && !cleanedUrl.startsWith('https://')) {
      if (cleanedUrl.includes('.') && !cleanedUrl.includes(' ')) {
        cleanedUrl = `https://${cleanedUrl}`;
      } else {
        return '';
      }
    }
    
    try {
      new URL(cleanedUrl);
      return cleanedUrl;
    } catch (error) {
      return '';
    }
  }
}