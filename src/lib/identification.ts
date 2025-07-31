import axios from 'axios';

interface CompetitorIdentification {
  nom_entreprise: string;
  presence_geographique: string[];
  marches_cibles: string[];
  taille_entreprise: string;
  ca_estime?: string;
  effectifs_estime?: string;
  specialites_produits: string[];
  type_production: string[]; // petite série, moyenne série, grande série
  publications_recentes: PublicationRecente[];
  actualites_recentes: ActualiteRecente[];
  forces_concurrentielles: string[];
  positionnement_marche: string;
  site_web?: string;
  contact_info?: ContactInfo;
  sources: string[];
}

interface PublicationRecente {
  titre: string;
  date: string;
  source: string;
  lien?: string;
  type: 'communique' | 'article' | 'rapport' | 'innovation';
}

interface ActualiteRecente {
  titre: string;
  date: string;
  source: string;
  lien?: string;
  type: 'croissance' | 'partenariat' | 'innovation' | 'acquisition' | 'recrutement';
  impact_strategique: string;
}

interface ContactInfo {
  adresse?: string;
  telephone?: string;
  email?: string;
  dirigeants?: string[];
}

interface CompetitorSearchRequest {
  region_geographique: string[];
  produits: string[];
  type_serie: string[];
  secteurs_cibles?: string[];
  taille_min?: string;
  nombre_resultats?: number;
}

interface CompetitorIdentificationResult {
  competitors: CompetitorIdentification[];
  total_found: number;
  search_criteria: CompetitorSearchRequest;
  sources: string[];
  success: boolean;
  error?: string;
}

export class CompetitorIdentificationClient {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY!;
    if (!this.apiKey) {
      throw new Error('PERPLEXITY_API_KEY manquante');
    }
  }

  async identifyCompetitors(searchRequest: CompetitorSearchRequest): Promise<CompetitorIdentificationResult> {
    const prompt = this.buildCompetitorIdentificationPrompt(searchRequest);
    
    try {
      console.log('🔍 Envoi de la requête à Perplexity API...');
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'sonar',
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          max_tokens: 6000,
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Réponse reçue de Perplexity API');
      return this.parseCompetitorIdentificationResponse(response.data, searchRequest);
    } catch (error: any) {
      console.error('❌ Erreur Perplexity API - Identification Concurrents:', error.response?.status);
      return {
        competitors: [],
        total_found: 0,
        search_criteria: searchRequest,
        sources: [],
        success: false,
        error: error.message
      };
    }
  }

  // Enhanced system prompt for better JSON generation
private getSystemPrompt(): string {
  return `Expert en analyse concurrentielle industrielle spécialisé dans l'identification de fabricants de composants mécaniques.

MISSION: Identifier et analyser les concurrents de CGR International selon des critères géographiques et produits spécifiques.

**CONTEXTE CGR INTERNATIONAL:**
- Fabricant français leader en ressorts industriels et composants mécaniques
- Spécialités: ressorts fil, ressorts feuillard, pièces découpées, formage tubes, assemblages
- Secteurs: automobile, aéronautique, médical, ferroviaire, industrie générale
- Production: petites, moyennes et grandes séries
- Positionnement: innovation, qualité, co-développement, précision technique

**CRITÈRES DE RECHERCHE:**
- Entreprises fabricant des produits similaires dans les régions spécifiées
- Capacités de production adaptées aux types de séries demandées
- Présence active sur les marchés cibles
- Taille et CA significatifs dans le secteur

**INFORMATIONS À COLLECTER:**
1. **Identification**: Nom, implantations, présence géographique
2. **Profil économique**: Taille, CA estimé, effectifs, croissance
3. **Offre produits**: Spécialités, types de production, innovations
4. **Marchés**: Secteurs clients, positionnement concurrentiel
5. **Actualités**: Publications récentes, développements stratégiques
6. **Contact**: Site web, coordonnées principales

**SOURCES PRIORITAIRES:**
- Sites web officiels des entreprises
- Bases de données industrielles (Kompass, Europages)
- Rapports sectoriels récents (2023-2024)
- Actualités professionnelles spécialisées
- Annuaires industriels régionaux
- Communiqués de presse d'entreprises
- Articles trade magazines (Industrie & Technologies, etc.)

**FORMAT RÉPONSE JSON STRICT:**
IMPORTANT: Répondre UNIQUEMENT avec un JSON valide, sans texte avant ou après.
ATTENTION: Éviter les caractères spéciaux non échappés dans les chaînes JSON.
Pour les caractères français (é, è, à, ç, etc.), les utiliser normalement mais s'assurer qu'ils sont dans des chaînes bien fermées.

Structure JSON requise:

{
  "analysis": {
    "competitors": [
      {
        "nom_entreprise": "Nom exact de l entreprise",
        "presence_geographique": ["Region 1", "Region 2"],
        "marches_cibles": ["Secteur 1", "Secteur 2"],
        "taille_entreprise": "PME ou ETI ou Grande entreprise",
        "ca_estime": "XX M euros (annee)",
        "effectifs_estime": "XX personnes",
        "specialites_produits": ["Produit 1", "Produit 2"],
        "type_production": ["petite serie", "moyenne serie", "grande serie"],
        "publications_recentes": [
          {
            "titre": "Titre publication",
            "date": "2024-01",
            "source": "Source",
            "lien": "URL si disponible",
            "type": "communique"
          }
        ],
        "actualites_recentes": [
          {
            "titre": "Titre actualite",
            "date": "2024-01",
            "source": "Source", 
            "lien": "URL si disponible",
            "type": "croissance",
            "impact_strategique": "Description impact"
          }
        ],
        "forces_concurrentielles": ["Force 1", "Force 2"],
        "positionnement_marche": "Description positionnement",
        "site_web": "URL site web",
        "contact_info": {
          "adresse": "Adresse principale",
          "telephone": "Telephone",
          "email": "Email contact",
          "dirigeants": ["Nom dirigeant 1"]
        },
        "sources": ["source1.com", "source2.com"]
      }
    ],
    "sources_globales": ["source1.com", "source2.com"]
  }
}

**RÈGLES STRICTES JSON:**
1. UNIQUEMENT du JSON valide - pas de texte explicatif
2. Toujours utiliser des guillemets doubles pour les clés et valeurs string
3. Pas de virgules après le dernier élément d'un objet ou tableau
4. Échapper les guillemets internes avec \\"
5. Pour les caractères français: les laisser tels quels dans les strings
6. Minimum 3-5 concurrents pertinents
7. Vérifier que tous les objets et tableaux sont bien fermés
8. Pas de commentaires dans le JSON

**EXEMPLE SÉCURISÉ:**
{
  "analysis": {
    "competitors": [
      {
        "nom_entreprise": "Ressorts Dubois",
        "presence_geographique": ["Auvergne-Rhone-Alpes", "Occitanie"],
        "marches_cibles": ["Automobile", "Aeronautique"],
        "taille_entreprise": "PME",
        "ca_estime": "15 M euros (2023)",
        "specialites_produits": ["Ressorts fil", "Ressorts feuillard"],
        "sources": ["www.ressorts-dubois.fr"]
      }
    ],
    "sources_globales": ["kompass.com", "europages.fr"]
  }
}

ATTENTION CRITIQUE: 
- Ne jamais couper une chaîne JSON au milieu
- Toujours fermer tous les crochets et accolades
- Vérifier la syntaxe JSON avant de répondre
- En cas de doute sur un caractère, l'omettre plutôt que de casser le JSON`;
}
  private buildCompetitorIdentificationPrompt(searchRequest: CompetitorSearchRequest): string {
    const regions = searchRequest.region_geographique.join(', ');
    const produits = searchRequest.produits.join(', ');
    const typesProduction = searchRequest.type_serie.join(', ');
    const secteurs = searchRequest.secteurs_cibles?.join(', ') || 'tous secteurs industriels';

    return `Identification approfondie des concurrents de CGR International selon les critères suivants:

**CRITÈRES DE RECHERCHE:**
🌍 **Régions géographiques:** ${regions}
🔧 **Produits recherchés:** ${produits}
📊 **Types de production:** ${typesProduction}
🎯 **Secteurs cibles:** ${secteurs}
📈 **Nombre souhaité:** ${searchRequest.nombre_resultats || 'optimal (5-8 entreprises)'}

**MÉTHODOLOGIE DE RECHERCHE:**

1. **Identification géographique**
   - Entreprises établies dans les régions spécifiées
   - Présence locale vs internationale
   - Réseaux de distribution régionaux

2. **Analyse produits et capacités**
   - Fabricants de: ${produits}
   - Capacités de production: ${typesProduction}
   - Technologies et équipements utilisés
   - Certifications qualité (ISO, aéronautique, médical)

3. **Profil concurrentiel**
   - Taille et chiffre d'affaires estimé
   - Position sur le marché régional/national
   - Spécialisations techniques distinctives
   - Clients références dans les secteurs: ${secteurs}

4. **Veille stratégique récente (2023-2024)**
   - Investissements et expansions
   - Innovations produits/procédés
   - Partenariats et acquisitions
   - Recrutements stratégiques
   - Certifications obtenues

**SOURCES À CONSULTER PRIORITAIREMENT:**
- Sites web officiels des fabricants
- Annuaires industriels (Kompass, Europages, Pages Jaunes Pro)
- Bases Sirene et registres d'entreprises
- Presse spécialisée (Industrie & Technologies, L'Usine Nouvelle)
- Communiqués de presse sectoriels
- LinkedIn entreprises et dirigeants
- Salons professionnels récents (participation, exposants)

**FOCUS RÉGIONAL:** ${regions}
Rechercher particulièrement les leaders régionaux et spécialistes locaux des produits: ${produits}

IMPORTANT: Répondre UNIQUEMENT avec le JSON requis, sans aucun texte d'introduction ou de conclusion.`;
  }

  private parseCompetitorIdentificationResponse(response: any, searchRequest: CompetitorSearchRequest): CompetitorIdentificationResult {
    try {
      const content = response.choices[0]?.message?.content || '';
      console.log('📝 Contenu de la réponse reçu, longueur:', content.length);
      
      // Enhanced JSON extraction with multiple strategies
      let jsonData = null;
      
      // Strategy 1: Look for JSON object starting with {"analysis"
      let jsonMatch = content.match(/\{\s*"analysis"[\s\S]*?\}\s*$/);
      
      if (!jsonMatch) {
        // Strategy 2: Look for any JSON object containing "analysis"
        jsonMatch = content.match(/\{[\s\S]*?"analysis"[\s\S]*?\}/);
      }
      
      if (!jsonMatch) {
        // Strategy 3: Extract everything between first { and last }
        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonMatch = [content.substring(firstBrace, lastBrace + 1)];
        }
      }
      
      if (!jsonMatch) {
        console.log('❌ Aucun JSON trouvé dans la réponse');
        console.log('🔍 Extrait de la réponse:', content.substring(0, 500));
        return this.createFallbackResult(searchRequest, 'Format JSON non trouvé');
      }

      let jsonString = jsonMatch[0];
      console.log('🔍 JSON extrait, longueur:', jsonString.length);
      
      // Clean up common JSON issues
      jsonString = this.cleanJsonString(jsonString);
      
      try {
        jsonData = JSON.parse(jsonString);
      } catch (parseError: unknown) {
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
        console.log('❌ Erreur parsing JSON initial:', errorMessage);
        console.log('🔧 Tentative de réparation du JSON...');
        
        // Try to fix common JSON issues
        const fixedJson = this.attemptJsonRepair(jsonString);
        if (fixedJson) {
          try {
            jsonData = JSON.parse(fixedJson);
            console.log('✅ JSON réparé avec succès');
          } catch (secondParseError: unknown) {
            const secondErrorMessage = secondParseError instanceof Error ? secondParseError.message : 'Unknown parsing error';
            console.log('❌ Échec de la réparation JSON:', secondErrorMessage);
            return this.createFallbackResult(searchRequest, `Erreur parsing JSON: ${errorMessage}`);
          }
        } else {
          return this.createFallbackResult(searchRequest, `Erreur parsing JSON: ${errorMessage}`);
        }
      }
      
      if (!jsonData || !jsonData.analysis || !Array.isArray(jsonData.analysis.competitors)) {
        console.log('❌ Structure JSON invalide');
        return this.createFallbackResult(searchRequest, 'Structure JSON invalide');
      }

      const cleanedCompetitors: CompetitorIdentification[] = jsonData.analysis.competitors.map((competitor: any) => ({
        nom_entreprise: String(competitor.nom_entreprise || '').trim(),
        presence_geographique: Array.isArray(competitor.presence_geographique) ? competitor.presence_geographique : [],
        marches_cibles: Array.isArray(competitor.marches_cibles) ? competitor.marches_cibles : [],
        taille_entreprise: String(competitor.taille_entreprise || '').trim(),
        ca_estime: competitor.ca_estime ? String(competitor.ca_estime).trim() : undefined,
        effectifs_estime: competitor.effectifs_estime ? String(competitor.effectifs_estime).trim() : undefined,
        specialites_produits: Array.isArray(competitor.specialites_produits) ? competitor.specialites_produits : [],
        type_production: Array.isArray(competitor.type_production) ? competitor.type_production : [],
        publications_recentes: Array.isArray(competitor.publications_recentes) ? 
          competitor.publications_recentes.map((pub: any) => ({
            titre: String(pub.titre || ''),
            date: String(pub.date || ''),
            source: String(pub.source || ''),
            lien: pub.lien ? String(pub.lien) : undefined,
            type: pub.type || 'article'
          })) : [],
        actualites_recentes: Array.isArray(competitor.actualites_recentes) ? 
          competitor.actualites_recentes.map((actu: any) => ({
            titre: String(actu.titre || ''),
            date: String(actu.date || ''),
            source: String(actu.source || ''),
            lien: actu.lien ? String(actu.lien) : undefined,
            type: actu.type || 'croissance',
            impact_strategique: String(actu.impact_strategique || '')
          })) : [],
        forces_concurrentielles: Array.isArray(competitor.forces_concurrentielles) ? competitor.forces_concurrentielles : [],
        positionnement_marche: String(competitor.positionnement_marche || '').trim(),
        site_web: competitor.site_web ? String(competitor.site_web).trim() : undefined,
        contact_info: competitor.contact_info ? {
          adresse: competitor.contact_info.adresse ? String(competitor.contact_info.adresse) : undefined,
          telephone: competitor.contact_info.telephone ? String(competitor.contact_info.telephone) : undefined,
          email: competitor.contact_info.email ? String(competitor.contact_info.email) : undefined,
          dirigeants: Array.isArray(competitor.contact_info.dirigeants) ? competitor.contact_info.dirigeants : undefined
        } : undefined,
        sources: Array.isArray(competitor.sources) ? competitor.sources.filter(Boolean) : []
      })).filter((comp: CompetitorIdentification) => comp.nom_entreprise); // Filter out empty competitors

      console.log(`🎯 Concurrents identifiés: ${cleanedCompetitors.length}`);
      cleanedCompetitors.forEach((comp, index) => {
        console.log(`${index + 1}. ${comp.nom_entreprise} - ${comp.presence_geographique.join(', ')} - ${comp.specialites_produits.join(', ')}`);
      });

      return {
        competitors: cleanedCompetitors,
        total_found: cleanedCompetitors.length,
        search_criteria: searchRequest,
        sources: jsonData.analysis.sources_globales || [],
        success: true
      };
    } catch (error: any) {
      console.error('❌ Erreur parsing réponse identification concurrents:', error);
      return this.createFallbackResult(searchRequest, `Erreur parsing: ${error.message}`);
    }
  }

  private cleanJsonString(jsonString: string): string {
  // Remove markdown code blocks if present
  jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Remove any text before the first {
  const firstBrace = jsonString.indexOf('{');
  if (firstBrace > 0) {
    jsonString = jsonString.substring(firstBrace);
  }
  
  // Remove any text after the last }
  const lastBrace = jsonString.lastIndexOf('}');
  if (lastBrace !== -1 && lastBrace < jsonString.length - 1) {
    jsonString = jsonString.substring(0, lastBrace + 1);
  }
  
  return jsonString.trim();
}

  private attemptJsonRepair(jsonString: string): string | null {
  try {
    console.log('🔧 Tentative de réparation JSON avancée...');
    let repaired = jsonString;
    
    // Strategy 1: Fix common French character encoding issues
    repaired = repaired.replace(/([^\\])"([^"]*?)([àáâäèéêëìíîïòóôöùúûüÿñç])([^"]*?)"/g, (match, prefix, before, char, after) => {
      // If the character is in the middle of what seems to be a value, escape the quotes properly
      return `${prefix}"${before}${char}${after}"`;
    });
    
    // Strategy 2: Fix unescaped quotes in French text (more aggressive)
    // Look for patterns like: "proche Occ"itanie" and fix them
    repaired = repaired.replace(/"([^"]*?)"([a-zA-ZàáâäèéêëìíîïòóôöùúûüÿñçÀÁÂÄÈÉÊËÌÍÎÏÒÓÔÖÙÚÛÜŸÑÇ]+[^",:\]}]*)/g, '"$1$2');
    
    // Strategy 3: Fix broken string literals with French regions
    repaired = repaired.replace(/"([^"]*?)"\s*([a-zA-ZàáâäèéêëìíîïòóôöùúûüÿñçÀÁÂÄÈÉÊËÌÍÎÏÒÓÔÖÙÚÛÜŸÑÇ\s-]+)"/g, '"$1 $2"');
    
    // Strategy 4: Fix trailing commas in arrays and objects
    repaired = repaired.replace(/,(\s*[\]}])/g, '$1');
    
    // Strategy 5: Fix missing quotes around property names
    repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    // Strategy 6: Fix incomplete JSON by adding missing closing braces/brackets
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;
    
    // Add missing closing braces
    for (let i = closeBraces; i < openBraces; i++) {
      repaired += '}';
    }
    
    // Add missing closing brackets
    for (let i = closeBrackets; i < openBrackets; i++) {
      repaired += ']';
    }
    
    console.log('🔧 JSON après réparation (100 premiers caractères):', repaired.substring(0, 100));
    return repaired;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown repair error';
    console.log('❌ Erreur lors de la réparation JSON:', errorMessage);
    return null;
  }
}

  private createFallbackResult(searchRequest: CompetitorSearchRequest, error: string): CompetitorIdentificationResult {
    return {
      competitors: [],
      total_found: 0,
      search_criteria: searchRequest,
      sources: [],
      success: false,
      error: error
    };
  }
}