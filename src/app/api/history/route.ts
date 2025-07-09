import { NextRequest, NextResponse } from 'next/server';
import { getSearchHistory, initDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Initialiser la DB si nécessaire
    await initDatabase();
    
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    const history = await getSearchHistory(limit);
    
    return NextResponse.json({ history });
  } catch (error) {
    console.error('Erreur API historique:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'historique' },
      { status: 500 }
    );
  }
}