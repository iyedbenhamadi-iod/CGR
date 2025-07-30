import axios from 'axios';

interface CompetitorAnalysis {
  synthese_entreprise: string;
  synthese?: string; // Add this for backward compatibility
  produits_services: string[];
  marches_cibles: string[];
  entreprises_clientes: string[];
  forces_apparentes: string[];
  faiblesses_potentielles: string[];
  strategie_communication: string;
  sources: string[];
}

interface CompetitorAnalysisResult {
  analysis: CompetitorAnalysis | null;
  success: boolean;
  error?: string;
}

export class CompetitorAnalysisClient {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY!;
    if (!this.apiKey) {
      throw new Error('PERPLEXITY_API_KEY manquante');
    }
  }

  async analyzeCompetitor(competitorName: string): Promise<CompetitorAnalysisResult> {
    const prompt = this.buildCompetitorAnalysisPrompt(competitorName);
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'sonar',
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4000,
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return this.parseCompetitorResponse(response.data);
    } catch (error: any) {
      console.error('❌ Erreur Perplexity API:', error.response?.status);
      throw error;
    }
  }

  private getSystemPrompt(): string {
    return `Expert analyste concurrentiel pour l'industrie mécanique et des composants industriels.

MISSION: Analyser en profondeur un concurrent de CGR International (fabricant de ressorts et composants mécaniques) ET identifier ses clients actuels.

SOURCES À CONSULTER:
- Site web officiel
- Rapports annuels/financiers
- Actualités récentes
- Communiqués de presse
- Profils LinkedIn dirigeants
- Catalogues produits
- Références clients mentionnées
- Études de cas publiées
- Partenariats annoncés

ANALYSE OBLIGATOIRE:
- Positionnement concurrentiel
- Forces/faiblesses vs CGR
- Stratégie commerciale
- **CLIENTS IDENTIFIÉS** (priorité absolue)
- Opportunités de différenciation

**IMPORTANT**: Les clients du concurrent sont des prospects potentiels pour CGR International. 
Rechercher activement:
- Clients mentionnés sur le site web
- Logos clients affichés
- Témoignages et études de cas
- Communiqués de partenariats
- Références dans la presse
- Secteurs clients principaux

RÉPONSE JSON OBLIGATOIRE:
{
  "analysis": {
    "synthese_entreprise": "Analyse détaillée 200+ mots",
    "produits_services": ["...", "..."],
    "marches_cibles": ["...", "..."],
    "entreprises_clientes": ["Nom Client 1", "Nom Client 2", "..."],
    "forces_apparentes": ["...", "..."],
    "faiblesses_potentielles": ["...", "..."],
    "strategie_communication": "Analyse positionnement 150+ mots",
    "sources": ["url1", "url2", "..."]
  }
}`;
  }

  private buildCompetitorAnalysisPrompt(competitorName: string): string {
    return `Analyse concurrentielle approfondie de "${competitorName}", concurrent de CGR International, avec IDENTIFICATION PRIORITAIRE de ses clients.

**Contexte CGR International:**
- Fabricant français de ressorts industriels et composants mécaniques
- Spécialités: ressorts fil/plat, pièces découpées, formage tubes, assemblages
- Marchés: automobile, aéronautique, médical, industrie
- Positionnement: qualité, précision, innovation, co-développement

**Analyse requise pour ${competitorName}:**

1. **Profil entreprise**: Historique, taille, implantations, effectifs, CA

2. **Offre produits**: Gammes, spécialités, innovations récentes

3. **Positionnement marché**: Segments, clients types, géographie

4. **🎯 CLIENTS IDENTIFIÉS (PRIORITÉ ABSOLUE):**
   - Rechercher sur le site web: pages références, témoignages, logos clients
   - Communiqués de presse mentionnant des contrats/partenariats
   - Études de cas publiées avec noms de clients
   - Secteurs clients principaux (automobile, aéronautique, etc.)
   - Partenaires industriels mentionnés
   - **Objectif**: Identifier nommément les entreprises clientes du concurrent

5. **Stratégie commerciale**: Arguments de vente, différenciation

6. **Forces concurrentielles**: Atouts vs CGR

7. **Vulnérabilités**: Faiblesses exploitables par CGR

8. **Communication**: Messages clés, stratégie digitale

**MÉTHODOLOGIE DE RECHERCHE CLIENTS:**
- Consulter la page "Références" ou "Clients" du site web
- Examiner les témoignages et études de cas
- Analyser les communiqués de presse récents
- Identifier les logos clients affichés
- Rechercher les mentions dans les actualités sectorielles

OBJECTIF PRINCIPAL: Les clients identifiés du concurrent sont des prospects directs pour CGR International.

Sources à consulter obligatoirement: site web complet, actualités 2024, rapports si disponibles, pages références clients.`;
  }

  private parseCompetitorResponse(response: any): CompetitorAnalysisResult {
    try {
      const content = response.choices[0]?.message?.content || '';
      
      const jsonMatch = content.match(/\{[\s\S]*"analysis"[\s\S]*\{[\s\S]*?\}[\s\S]*?\}/);
      if (!jsonMatch) {
        return { analysis: null, success: false, error: 'Format JSON non trouvé' };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed || !parsed.analysis) {
        return { analysis: null, success: false, error: 'Structure invalide' };
      }

      const analysis = parsed.analysis;
      const cleanedAnalysis: CompetitorAnalysis = {
        synthese_entreprise: String(analysis.synthese_entreprise || '').trim(),
        synthese: String(analysis.synthese || analysis.synthese_entreprise || '').trim(), // Add backward compatibility
        produits_services: Array.isArray(analysis.produits_services) ? analysis.produits_services : [],
        marches_cibles: Array.isArray(analysis.marches_cibles) ? analysis.marches_cibles : [],
        entreprises_clientes: Array.isArray(analysis.entreprises_clientes) ? 
          analysis.entreprises_clientes.filter((client: any) => client && String(client).trim()) : [],
        forces_apparentes: Array.isArray(analysis.forces_apparentes) ? analysis.forces_apparentes : [],
        faiblesses_potentielles: Array.isArray(analysis.faiblesses_potentielles) ? analysis.faiblesses_potentielles : [],
        strategie_communication: String(analysis.strategie_communication || '').trim(),
        sources: Array.isArray(analysis.sources) ? analysis.sources.filter(Boolean) : []
      };

      // Log pour debug - vérifier si les clients ont été trouvés
      const competitorName = 'Unknown'; // We don't have access to competitorName in this scope
      console.log(`🎯 Clients identifiés:`, cleanedAnalysis.entreprises_clientes);

      return {
        analysis: cleanedAnalysis,
        success: true
      };
    } catch (error: any) {
      return { analysis: null, success: false, error: `Erreur parsing: ${error.message}` };
    }
  }
}