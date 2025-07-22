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
    return `Tu es un expert en intelligence économique spécialisé dans l'identification de prospects pour CGR International, fabricant français de composants mécaniques industriels.

MISSION CRITIQUE: Identifier des entreprises CLIENTES potentielles qui UTILISENT des composants mécaniques dans leurs produits manufacturés.

EXPERTISE CGR DISPONIBLE:
- Ressorts (fil, plat, torsion) - haute précision
- Pièces découpées de précision
- Formage de tubes
- Assemblages automatisés
- Mécatronique
- Injection plastique

RÈGLES ABSOLUES DE CIBLAGE:
✅ CHERCHER: Entreprises qui ACHÈTENT et UTILISENT des composants mécaniques
✅ FOCUS: Fabricants de produits finis intégrant des composants mécaniques
✅ CIBLE: Entreprises ayant des besoins en composants de précision

❌ EXCLURE ABSOLUMENT:
- Fabricants de ressorts (concurrents directs)
- Grossistes/distributeurs de composants mécaniques
- Entreprises de négoce en composants
- Entreprises nommées "CGR" ou similaires
- Sous-traitants mécaniques généralistes

CONTRAINTES STRICTES:
- Utiliser UNIQUEMENT les produits CGR spécifiés par l'utilisateur
- Respecter la taille d'entreprise demandée
- Cibler la zone géographique spécifiée
- Adapter au volume de pièces requis
- tu dois bien expliquer comment chaque entreprise répond aux critères et pourquoi elle est un prospect potentiel dans argumentaire approche
- l'expliquation doit etre detaillee et pertinente
RÉPONSE JSON OBLIGATOIRE avec exactement cette structure:
{
  "enterprises": [
    {
      "nom_entreprise": "...",
      "site_web": "...",
      "description_activite": "...",
      "produits_entreprise": ["...", "..."],
      "potentiel_cgr": {
        "produits_cibles_chez_le_prospect": ["...", "..."],
        "produits_cgr_a_proposer": ["Uniquement les produits spécifiés"],
        "argumentaire_approche": "..."
      },
      "fournisseur_actuel_estimation": "...",
      "sources": ["...", "..."],
      "taille_entreprise": "Taille spécifiée par l'utilisateur",
      "volume_pieces_estime": "Volume compatible avec les spécifications",
      "zone_geographique": "Zone géographique de l'entreprise"
    }
  ]
}

VALIDATION FINALE:
- Chaque entreprise doit utiliser au moins un des produits CGR spécifiés
- La taille doit correspondre exactement à celle demandée
- Le volume doit être compatible avec les spécifications
- Les sources doivent être récentes et fiables`;
  }

  private buildEnterpriseSearchPrompt(data: EnterpriseSearchData): string {
    const excludeClients = [
      'Forvia', 'Valeo', 'Schneider Electric', 'Dassault Aviation', 'Thales', 'Safran',
      ...(data.clientsExclure ? data.clientsExclure.split('\n').filter(Boolean) : [])
    ];

    const secteurPrincipal = data.secteursActivite[0] || 'Industriel';
    const zoneGeo = data.zoneGeographique.length > 0 ? data.zoneGeographique.join(', ') : 'France et Europe';
    const tailleEntreprise = data.tailleEntreprise || 'Toutes tailles';
    const volumePieces = data.volumePieces && data.volumePieces.length > 0 ? data.volumePieces[0] : 50000;
    const produitsCGRSpecifiques = data.produitsCGR.length > 0 ? data.produitsCGR : ['Ressorts fil'];
    const motsCles = data.motsCles || 'composants mécaniques, précision, qualité';
    const usinesCGR = data.usinesCGR || ['Saint-Yorre', 'PMPC', 'Igé'];

    return `RECHERCHE CIBLÉE: ${data.nombreResultats} entreprises CLIENTES potentielles pour CGR International

**CONTRAINTES STRICTES À RESPECTER:**

**Secteur d'activité OBLIGATOIRE:** ${secteurPrincipal}
- Focus exclusif sur ce secteur
- Entreprises qui fabriquent des produits dans ce secteur

**Zone géographique ciblée:** ${zoneGeo}
- Priorité aux entreprises dans ces zones
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

**STRATÉGIE DE RECHERCHE SECTORIELLE:**
${this.getSectorSpecificSearchStrategy(secteurPrincipal, produitsCGRSpecifiques)}

**CRITÈRES DE QUALIFICATION:**
1. **Activité principale:** Fabrication de produits finis dans le secteur "${secteurPrincipal}"
2. **Besoins identifiés:** Utilisation de "${produitsCGRSpecifiques.join(', ')}" dans leurs produits
3. **Taille confirmée:** Correspond exactement à "${tailleEntreprise}"
4. **Volume compatible:** Besoins annuels autour de ${volumePieces.toLocaleString()} pièces
5. **Localisation:** Basée dans "${zoneGeo}"

**INFORMATIONS REQUISES PAR ENTREPRISE:**
- Nom officiel et site web
- Description précise de l'activité
- Produits fabriqués nécessitant des composants mécaniques
- Potentiel d'utilisation des produits CGR spécifiés
- Estimation du fournisseur actuel
- Sources d'information fiables

**VALIDATION FINALE:**
- Chaque entreprise doit être un CLIENT potentiel, pas un concurrent
- Les produits CGR proposés doivent être limités à: ${produitsCGRSpecifiques.join(', ')}
- La taille et le volume doivent correspondre exactement
- Les sources doivent être récentes et vérifiables

Retourne uniquement le JSON demandé, sans texte supplémentaire.`;
  }

  private getTailleEntrepriseGuidance(taille: string): string {
    switch (taille) {
      case 'PME':
        return `- Cibler des PME (50-250 salariés)
- Entreprises avec besoins spécifiques et flexibilité
- Volumes moyens mais réguliers
- Capacité de décision rapide`;
      
      case 'ETI':
        return `- Cibler des ETI (250-5000 salariés)
- Entreprises avec volumes moyens à importants
- Processus de décision structuré
- Besoins en qualité et régularité`;
      
      case 'Grande entreprise':
        return `- Cibler des grandes entreprises (5000+ salariés)
- Volumes importants et contrats long terme
- Exigences qualité très élevées
- Processus de qualification rigoureux`;
      
      default:
        return `- Toutes tailles d'entreprises
- Adapter l'approche selon la taille`;
    }
  }

  private getSectorSpecificSearchStrategy(secteur: string, produitsCGR: string[]): string {
    const produitsStr = produitsCGR.join(', ');
    
    switch (secteur.toLowerCase()) {
      case 'médical':
        return `SECTEUR MÉDICAL - Rechercher des fabricants de:
• Dispositifs médicaux intégrant des ${produitsStr}
• Équipements hospitaliers avec mécanismes précis
• Instruments chirurgicaux nécessitant des composants ressort
• Appareils de diagnostic avec systèmes mécaniques
• Prothèses et orthèses avec mécanismes de précision
• Matériel de rééducation avec composants mécaniques`;
        
      case 'aéronautique':
        return `SECTEUR AÉRONAUTIQUE - Rechercher des fabricants de:
• Composants d'aéronefs nécessitant des ${produitsStr}
• Équipements de cabine avec mécanismes précis
• Systèmes de navigation intégrant des composants mécaniques
• Équipements de sécurité aéronautique
• Outillage aéronautique spécialisé
• Composants satellites et drones`;
        
      case 'automobile':
        return `SECTEUR AUTOMOBILE - Rechercher des fabricants de:
• Systèmes de sécurité automobile intégrant des ${produitsStr}
• Composants d'habitacle avec mécanismes précis
• Équipements électriques automobile
• Accessoires et équipements de confort
• Systèmes de freinage et suspension (hors grands constructeurs)
• Outillage automobile spécialisé`;
        
      case 'énergie':
        return `SECTEUR ÉNERGIE - Rechercher des fabricants de:
• Équipements éoliens nécessitant des ${produitsStr}
• Systèmes solaires avec composants mécaniques
• Équipements de stockage d'énergie
• Installations de production d'énergie
• Systèmes de distribution énergétique
• Équipements de mesure et contrôle énergétique`;
        
      case 'défense':
        return `SECTEUR DÉFENSE - Rechercher des fabricants de:
• Équipements militaires intégrant des ${produitsStr}
• Systèmes d'armes avec mécanismes précis
• Véhicules blindés et composants
• Équipements de communication militaire
• Systèmes de protection et sécurité
• Matériel d'entraînement militaire`;
        
      default:
        return `SECTEUR INDUSTRIEL - Rechercher des fabricants de:
• Machines spéciales nécessitant des ${produitsStr}
• Équipements automatisés avec mécanismes précis
• Systèmes de manutention et transport
• Outillage industriel spécialisé
• Équipements de mesure et contrôle
• Machines de production spécifiques`;
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