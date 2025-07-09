import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/cache';

export async function DELETE(request: NextRequest) {
  try {
    const { cacheKey } = await request.json();
    
    if (!cacheKey) {
      return NextResponse.json(
        { error: 'Clé de cache requise' },
        { status: 400 }
      );
    }

    const redis = await getRedisClient();
    await redis.del(cacheKey);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression cache:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du cache' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const redis = await getRedisClient();
    const keys = await redis.keys('prospect:*');
    
    return NextResponse.json({ 
      totalCachedSearches: keys.length,
      cacheKeys: keys 
    });
  } catch (error) {
    console.error('Erreur stats cache:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    );
  }
}