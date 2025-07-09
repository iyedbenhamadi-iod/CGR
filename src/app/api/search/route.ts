import { NextRequest, NextResponse } from 'next/server';
import { PerplexityClient } from '@/lib/perplexity';
import { ContactSearchClient } from '@/lib/ContactSearch';
import { getCachedResult, setCachedResult, generateCacheKey } from '@/lib/cache';

interface FinalProspect {
  company: string;
  sector: string;
  size: string;
  address: string;
  website: string;
  contacts: Array<{
    name: string;
    position: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    verified: boolean;
  }>;
  score: number;
  reason: string;
  sources: string[];
}

// Fonction pour normaliser les noms d'entreprises
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,\-_]/g, '')
    .replace(/\b(ag|gmbh|ltd|inc|sa|sas|sarl|co|corp|corporation|group|groupe)\b/g, '')
    .trim();
}

// Fonction pour trouver la correspondance d'entreprise
function findCompanyMatch(targetCompany: string, contactResults: any[]): any {
  const normalizedTarget = normalizeCompanyName(targetCompany);
  
  // Recherche exacte d'abord
  let match = contactResults.find(c => 
    normalizeCompanyName(c.company) === normalizedTarget
  );
  
  if (!match) {
    // Recherche par similarité
    match = contactResults.find(c => {
      const normalizedCompany = normalizeCompanyName(c.company);
      return normalizedTarget.includes(normalizedCompany) || 
             normalizedCompany.includes(normalizedTarget);
    });
  }
  
  return match;
}

export async function POST(request: NextRequest) {
  try {
    const { product, location, referenceUrls, language = 'fr' } = await request.json();
    
    if (!product || !location) {
      return NextResponse.json(
        { error: 'Produit et localisation requis' },
        { status: 400 }
      );
    }
    
    console.log('🔍 Recherche demandée:', { product, location });
    
    // Vérifier cache
    const cacheKey = generateCacheKey(product, location, referenceUrls);
    const cachedResult = await getCachedResult(cacheKey);
    if (cachedResult) {
      console.log('⚡ Résultat en cache trouvé');
      return NextResponse.json({ ...cachedResult, cached: true });
    }
    
    // Étape 1: Recherche entreprises avec Perplexity
    console.log('🆕 Recherche entreprises...');
    const perplexity = new PerplexityClient();
    const query = perplexity.buildSearchQuery(product, location, referenceUrls);
    const result = await perplexity.searchProspects(query);
    const prospectData = perplexity.parseProspectsResponse(result);
    
    if (!prospectData.success || prospectData.prospects.length === 0) {
      return NextResponse.json({ error: 'Aucune entreprise trouvée' }, { status: 404 });
    }
    
    console.log(`✅ ${prospectData.prospects.length} entreprises trouvées`);
    console.log('📋 Entreprises:', prospectData.prospects.map(p => p.company));
    
    // Étape 2: Recherche contacts avec Apollo
    console.log('🔍 Recherche contacts...');
    const contactSearch = new ContactSearchClient();
    const companies = prospectData.prospects.map(p => p.company);
    const contactResults = await contactSearch.searchMultipleCompanies(companies);
    
    // Logs détaillés des résultats de contacts
    console.log('📞 Résultats contacts:');
    contactResults.forEach(result => {
      console.log(`  - ${result.company}: ${result.contacts.length} contacts trouvés`);
      if (result.contacts.length > 0) {
        result.contacts.forEach(contact => {
          console.log(`    * ${contact.name} (${contact.position}) - Email: ${contact.email || 'N/A'}`);
        });
      }
    });
    
    // Étape 3: Fusion des données avec correspondance améliorée
    const finalProspects: FinalProspect[] = prospectData.prospects.map(prospect => {
      // Recherche de correspondance améliorée
      const contactData = findCompanyMatch(prospect.company, contactResults);
      
      console.log(`🔗 Fusion pour ${prospect.company}:`);
      console.log(`  - Correspondance trouvée: ${contactData ? 'OUI' : 'NON'}`);
      if (contactData) {
        console.log(`  - Entreprise correspondante: ${contactData.company}`);
        console.log(`  - Nombre de contacts: ${contactData.contacts.length}`);
      }
      
      // Créer le contact par défaut seulement si aucun contact valide trouvé
      const defaultContact = {
        name: 'À identifier',
        position: 'À identifier',
        verified: false
      };
      
      const contacts = contactData?.contacts && contactData.contacts.length > 0 
        ? contactData.contacts 
        : [defaultContact];
      
      return {
        company: prospect.company,
        sector: prospect.sector,
        size: prospect.size,
        address: prospect.address,
        website: prospect.website,
        contacts: contacts,
        score: prospect.score,
        reason: prospect.reason,
        sources: prospect.sources
      };
    });
    
    // Statistiques détaillées
    const totalContacts = finalProspects.reduce((acc, p) => acc + p.contacts.length, 0);
    const verifiedContacts = finalProspects.reduce((acc, p) => 
      acc + p.contacts.filter(c => c.verified).length, 0
    );
    const companiesWithContacts = finalProspects.filter(p => 
      p.contacts.length > 0 && p.contacts[0].name !== 'À identifier'
    ).length;
    
    console.log('📊 Statistiques finales:');
    console.log(`  - Entreprises avec contacts: ${companiesWithContacts}/${finalProspects.length}`);
    console.log(`  - Total contacts: ${totalContacts}`);
    console.log(`  - Contacts vérifiés: ${verifiedContacts}`);
    
    const response = {
      prospects: finalProspects,
      totalFound: finalProspects.length,
      cached: false,
      sources: finalProspects.flatMap(p => p.sources).filter(Boolean),
      debug: {
        companiesFound: prospectData.prospects.length,
        contactsSearched: contactResults.length,
        companiesWithContacts: companiesWithContacts,
        totalContacts: totalContacts,
        verifiedContacts: verifiedContacts,
        contactMatchingDetails: finalProspects.map(p => ({
          company: p.company,
          contactsFound: p.contacts.length,
          hasRealContacts: p.contacts[0].name !== 'À identifier'
        }))
      }
    };
    
    // Sauvegarder en cache
    if (finalProspects.length > 0) {
      await setCachedResult(cacheKey, response, 2592000);
      console.log('💾 Résultats sauvegardés en cache');
    }
    
    console.log('✅ Recherche terminée:', finalProspects.length, 'prospects avec contacts');
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('❌ Erreur API:', error);
    
    return NextResponse.json(
      {
        error: 'Erreur lors de la recherche',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}