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
  volumePieces: number[];
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
      console.log('🔍 Recherche d\'entreprises avec Perplexity...');
      console.log('📊 Paramètres de recherche:', {
        secteur: searchData.secteursActivite[0],
        zone: searchData.zoneGeographique.join(', '),
        taille: searchData.tailleEntreprise,
        produits: searchData.produitsCGR.join(', '),
        volume: searchData.volumePieces[0]?.toLocaleString()
      });
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'sonar',
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4000,
          temperature: 0.2
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 600000
        }
      );
      
      console.log('✅ Réponse Perplexity reçue');
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

MISSION CRITIQUE: Identifier UNIQUEMENT des entreprises FABRICANTES qui possèdent des USINES DE PRODUCTION et qui conçoivent/fabriquent des produits finis intégrant des composants mécaniques.

EXPERTISE CGR DISPONIBLE:
- Ressorts (fil, plat, torsion) - haute précision
- Pièces découpées de précision  
- Formage de tubes
- Assemblages automatisés
- Mécatronique
- Injection plastique

⚠️ ATTENTION FABRICANTS DE RESSORTS: Si une entreprise fabrique des ressorts, elle est CONCURRENTE de CGR → À EXCLURE ABSOLUMENT

RÈGLES ABSOLUES DE CIBLAGE:
✅ FABRICANTS UNIQUEMENT - RECHERCHE OBLIGATOIRE:
- Nom officiel complet de l'entreprise
- Localisation EXACTE des usines de production (ville, pays)
- Activité de CONCEPTION et FABRICATION de produits finis (pas distribution)
- Si partie d'un GROUPE: nom du groupe, maison-mère, autres filiales
- Produits SPÉCIFIQUES fabriqués dans chaque usine
- Nombre d'employés et chiffre d'affaires si disponible

✅ INFORMATIONS OBLIGATOIRES À RECHERCHER ET VÉRIFIER:
1. **NOM ET STRUCTURE**: Raison sociale complète, appartenance à un groupe
2. **LOCALISATION USINES**: Adresses exactes des sites de production  
3. **ACTIVITÉ RÉELLE**: Fabrication vs distribution vs installation
4. **PRODUITS FABRIQUÉS**: Liste précise des produits manufacturés
5. **CAPACITÉS**: Volumes de production, effectifs, technologies

❌ EXCLURE ABSOLUMENT:
- Revendeurs, distributeurs, négociants, importateurs
- Installateurs, intégrateurs, bureau d'études
- Entreprises de services (maintenance, réparation, SAV)
- Grossistes en composants mécaniques
- Fabricants de ressorts, pièces découpées, tubes (CONCURRENTS DIRECTS CGR)
- Entreprises nommées "CGR" ou similaires
- Sous-traitants mécaniques généralistes sans produits finis propres
- Filiales commerciales sans production

EXEMPLES D'EXCLUSIONS TYPIQUES:
❌ Tracelec (installateur d'instruments, pas fabricant)
❌ Güntner (distributeur/fournisseur, pas fabricant d'origine)
❌ Sociétés de négoce industriel
❌ Distributeurs d'équipements industriels
❌ Bureaux d'études sans production
❌ Filiales commerciales de groupes (chercher la filiale de production)

PROCESSUS DE VALIDATION OBLIGATOIRE:
Avant d'inclure UNE SEULE entreprise, tu DOIS rechercher et confirmer:
1. A-t-elle des USINES DE PRODUCTION identifiées ? (Où exactement ?)
2. FABRIQUE-t-elle ses propres produits finis ? (Lesquels précisément ?)
3. Fait-elle partie d'un GROUPE ? (Lequel ? Autres filiales ?)
4. A-t-elle des activités R&D/conception ? (Dans quels domaines ?)
5. N'est-elle PAS uniquement distributrice/installatrice ?

CONTRAINTES STRICTES:
- Utiliser UNIQUEMENT les produits CGR spécifiés par l'utilisateur
- Respecter la taille d'entreprise demandée
- Cibler la zone géographique spécifiée
- Adapter au volume de pièces requis
- Dans l'argumentaire approche, tu DOIS obligatoirement détailler:
  * Nom complet et raison sociale
  * Localisation EXACTE de chaque usine de production
  * Structure du groupe (maison-mère, filiales, autres sites)
  * Produits SPÉCIFIQUES fabriqués dans chaque usine
  * Pourquoi elle a besoin EXACTEMENT des composants CGR
  * Volumes estimés et capacités de production
  * Fournisseurs actuels probables

RÉPONSE JSON OBLIGATOIRE avec exactement cette structure:
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
        "argumentaire_approche": "OBLIGATOIRE ET DÉTAILLÉ: 1) Nom complet et raison sociale 2) Usines: [Ville, Pays] pour chaque site de production 3) Groupe: appartenance, maison-mère, autres filiales 4) Produits fabriqués: liste exacte par usine 5) Besoins composants: volume, spécifications 6) Capacité production et R&D 7) Fournisseurs actuels estimés - MINIMUM 200 mots"
      },
      "fournisseur_actuel_estimation": "Fournisseurs probables basés sur recherche",
      "sources": ["Source 1 avec URL", "Source 2 avec URL"],
      "taille_entreprise": "Taille exacte spécifiée par l'utilisateur",
      "volume_pieces_estime": "Volume compatible avec les spécifications",
      "zone_geographique": "Zone géographique précise avec pays"
    }
  ]
}

VALIDATION FINALE ULTRA-STRICTE:
- Chaque entreprise doit avoir des USINES DE PRODUCTION identifiées avec localisation
- Doit concevoir et fabriquer des produits finis (JAMAIS de distribution/revente)
- L'argumentaire doit contenir: usines exactes, groupe, produits fabriqués, besoins
- AUCUN concurrent direct CGR (ressorts, découpe, formage tubes)
- Taille et volume correspondant exactement
- Sources récentes et fiables avec URLs
- Si tu n'es pas sûr à 100% qu'une entreprise FABRIQUE → NE PAS L'INCLURE

RECHERCHE APPROFONDIE OBLIGATOIRE:
Pour chaque entreprise potentielle, tu DOIS rechercher:
- "nom entreprise" + "usine" + "production" + "fabrication"
- "nom entreprise" + "manufacturing" + "plant" + "factory" 
- "nom entreprise" + "groupe" + "filiale" + "maison mère"
- Vérifier sur site officiel la section "Qui sommes-nous" / "Nos sites"
- Rechercher dans annuaires industriels et bases de données entreprises`;
  }

  private buildEnterpriseSearchPrompt(data: EnterpriseSearchData): string {
    const excludeClients = [
      'Forvia', 'Valeo', 'Schneider Electric', 'Dassault Aviation', 'Thales', 'Safran',
      ...(data.clientsExclure ? data.clientsExclure.split('\n').filter(Boolean) : [])
    ];

    const secteurPrincipal = data.secteursActivite[0] || data.secteurActiviteLibre || 'Industriel';
    const zoneGeo = data.zoneGeographique.length > 0 
      ? data.zoneGeographique.join(', ') + (data.zoneGeographiqueLibre ? `, ${data.zoneGeographiqueLibre}` : '')
      : data.zoneGeographiqueLibre || 'France et Europe';
    const tailleEntreprise = data.tailleEntreprise || 'Toutes tailles';
    const volumePieces = data.volumePieces && data.volumePieces.length > 0 ? data.volumePieces[0] : 50000;
    const produitsCGRSpecifiques = data.produitsCGR.length > 0 ? data.produitsCGR : ['Ressorts fil'];
    const motsCles = data.motsCles || 'composants mécaniques, précision, qualité';
    const usinesCGR = data.usinesCGR || ['Saint-Yorre', 'PMPC', 'Igé'];

    return `RECHERCHE CIBLÉE: ${data.nombreResultats} entreprises FABRICANTES pour CGR International

**CONTRAINTES STRICTES À RESPECTER:**

**Secteur d'activité OBLIGATOIRE:** ${secteurPrincipal}
- Focus exclusif sur les FABRICANTS de ce secteur
- Entreprises qui conçoivent ET fabriquent des produits dans ce secteur
- Avec usines de production identifiées

**Zone géographique ciblée:** ${zoneGeo}
- Priorité aux entreprises avec usines dans ces zones
- Proximité avec les usines CGR: ${usinesCGR.join(', ')}

**Taille d'entreprise EXACTE:** ${tailleEntreprise}
${this.getTailleEntrepriseGuidance(tailleEntreprise)}

**Produits CGR AUTORISÉS (AUCUN AUTRE):** ${produitsCGRSpecifiques.join(', ')}
⚠️ CRITIQUE: Ne proposer QUE ces produits dans "produits_cgr_a_proposer"

**Volume de pièces cible:** ${volumePieces.toLocaleString()} pièces/an
- Entreprises ayant des besoins compatibles avec ce volume
- Capacité de production adaptée

**Mots-clés spécifiques:** ${motsCles}
- Utiliser pour affiner la recherche
- Identifier les besoins correspondants

**Exclusions absolues:** ${excludeClients.join(', ')}
- Éviter ces entreprises et leurs filiales
- Exclure les concurrents directs

**FOCUS FABRICANTS - RECHERCHE OBLIGATOIRE DÉTAILLÉE:**

Pour chaque secteur, tu DOIS rechercher et confirmer:

1. **IDENTIFICATION PRÉCISE:**
   - Raison sociale complète et officielle
   - Siège social et adresses des usines de production
   - Appartenance à un groupe industriel (maison-mère, filiales)

2. **VÉRIFICATION ACTIVITÉ FABRICATION:**
   - Sites de production avec localisation exacte (ville, pays)
   - Capacités de production et effectifs par site
   - Technologies de fabrication utilisées
   - Certification qualité (ISO, etc.)

3. **ANALYSE PRODUITS MANUFACTURÉS:**
   - Gamme de produits fabriqués (pas distribués)
   - Intégration de composants mécaniques confirmée
   - Marchés cibles et applications
   - Volume de production annuel

4. **STRUCTURE ORGANISATIONNELLE:**
   - Si groupe: identifier toutes les filiales et leurs activités
   - Répartition géographique des activités
   - Distinction fabrication vs commercial vs service

5. **BESOINS EN COMPOSANTS MÉCANIQUES:**
   - Utilisation confirmée des produits CGR spécifiés
   - Volume annuel estimé compatible
   - Spécifications techniques probables
   - Fournisseurs actuels identifiés

**STRATÉGIE DE RECHERCHE SECTORIELLE FABRICANTS:**
${this.getSectorSpecificSearchStrategy(secteurPrincipal, produitsCGRSpecifiques)}

**VALIDATION ANTI-REVENDEUR RENFORCÉE:**
Avant d'inclure une entreprise, tu DOIS rechercher et confirmer:
- Possède-t-elle des USINES DE PRODUCTION ? (Adresses exactes)
- FABRIQUE-t-elle ses propres produits ? (Liste précise)
- A-t-elle des activités de R&D/conception ? (Preuves)
- N'est-elle PAS uniquement distributrice/installatrice ?
- Si groupe: quelle filiale fabrique quoi et où ?
- Volumes de production et capacités industrielles
- Effectifs de production vs commercial

⚠️ RECHERCHES OBLIGATOIRES PAR ENTREPRISE:
1. Site officiel section "Nos usines" / "Production" / "Qui sommes-nous"
2. Recherche "[nom entreprise] usine production fabrication"
3. Recherche "[nom entreprise] manufacturing plant factory"
4. Vérification registre du commerce et bases de données industrielles
5. Identification structure groupe et filiales

❌ SIGNES D'ALERTE À ÉVITER:
- Mots-clés: "distributeur", "revendeur", "négociant", "importateur"
- Activités: "installation", "maintenance", "service après-vente"
- Description: "nous proposons", "nous commercialisons", "nous distribuons"
- Pas d'usine identifiée ou seulement bureaux commerciaux

**INFORMATIONS REQUISES PAR ENTREPRISE:**
- Nom officiel et site web
- Description précise de l'activité de fabrication
- Localisation des usines de production
- Produits fabriqués nécessitant des composants mécaniques
- Structure groupe (maison-mère, filiales)
- Potentiel d'utilisation des produits CGR spécifiés
- Estimation du fournisseur actuel
- Sources d'information fiables et récentes

**VALIDATION FINALE:**
- Chaque entreprise doit être un FABRICANT avec usines, pas un revendeur
- L'argumentaire doit détailler: usine, groupe, produits, conception
- Les produits CGR proposés limités à: ${produitsCGRSpecifiques.join(', ')}
- Taille et volume correspondant exactement
- Sources récentes et vérifiables

Retourne uniquement le JSON demandé, sans texte supplémentaire.`;
  }

  private getTailleEntrepriseGuidance(taille: string): string {
    switch (taille) {
      case 'PME':
        return `- Cibler des PME FABRICANTES (50-250 salariés)
- Avec usines de production propres
- Entreprises avec besoins spécifiques et flexibilité
- Volumes moyens mais réguliers
- Capacité de décision rapide`;
      
      case 'ETI':
        return `- Cibler des ETI FABRICANTES (250-5000 salariés)
- Avec plusieurs sites de production possibles
- Entreprises avec volumes moyens à importants
- Processus de décision structuré
- Besoins en qualité et régularité`;
      
      case 'Grande entreprise':
        return `- Cibler des grandes entreprises FABRICANTES (5000+ salariés)
- Avec multiples usines de production
- Volumes importants et contrats long terme
- Exigences qualité très élevées
- Processus de qualification rigoureux`;
      
      default:
        return `- Toutes tailles d'entreprises FABRICANTES
- Adapter l'approche selon la taille`;
    }
  }

  private getSectorSpecificSearchStrategy(secteur: string, produitsCGR: string[]): string {
    const produitsStr = produitsCGR.join(', ');
    
    switch (secteur.toLowerCase()) {
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
        return `SECTEUR INDUSTRIEL - Rechercher des FABRICANTS avec usines de:
• Machines spéciales fabriquées (avec sites production) nécessitant des ${produitsStr}
• Équipements automatisés avec usines identifiées et mécanismes précis
• Systèmes de manutention et transport conçus et fabriqués
• Outillage industriel spécialisé avec activités de fabrication
• Équipements de mesure et contrôle avec usines propres
• Machines de production spécifiques avec sites de fabrication

ÉVITER: Distributeurs machines industrielles, intégrateurs, bureau d'études`;
    }
  }

  private parseEnterpriseResponse(response: any): { enterprises: Enterprise[], total: number, success: boolean, error?: string } {
    try {
      const content = response.choices[0]?.message?.content || '';
      console.log('📄 Contenu reçu (premiers 500 chars):', content.substring(0, 500) + '...');
      
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
      while ((match = pattern.exec(content)) !== null && enterprises.length < 10) {
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
      .slice(0, 10); // Limit to max 10 enterprises
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