import { NextRequest, NextResponse } from 'next/server';

/**
 * Apollo.io Webhook Endpoint
 *
 * This endpoint receives phone number data from Apollo.io after enrichment requests.
 * Apollo sends the data asynchronously after processing reveal_phone_number requests.
 */

// In-memory storage for phone numbers (temporary solution)
// In production, you should use a database or cache like Redis
const phoneNumberCache = new Map<string, {
  phone?: string;
  timestamp: number;
  person: any;
}>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('📞 Apollo webhook received:', {
      timestamp: new Date().toISOString(),
      hasData: !!body
    });

    // Apollo webhook sends enriched person data
    if (body.person) {
      const person = body.person;

      // Create a unique key for this person
      const key = `${person.first_name}_${person.last_name}_${person.organization?.name || 'unknown'}`.toLowerCase();

      // Extract phone number
      let phone: string | undefined;
      if (person.phone_numbers && person.phone_numbers.length > 0) {
        const primaryPhone = person.phone_numbers.find((p: any) => p.type === 'mobile')
          || person.phone_numbers.find((p: any) => p.type === 'work')
          || person.phone_numbers[0];
        phone = primaryPhone.sanitized_number || primaryPhone.raw_number;
      }

      // Store in cache
      phoneNumberCache.set(key, {
        phone,
        timestamp: Date.now(),
        person: {
          first_name: person.first_name,
          last_name: person.last_name,
          email: person.email,
          phone,
          organization: person.organization?.name
        }
      });

      console.log('✅ Phone number cached:', {
        key,
        has_phone: !!phone,
        phone: phone ? phone.substring(0, 5) + '...' : 'none'
      });

      // Clean up old entries (older than 1 hour)
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      for (const [k, v] of phoneNumberCache.entries()) {
        if (v.timestamp < oneHourAgo) {
          phoneNumberCache.delete(k);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error: any) {
    console.error('❌ Error processing Apollo webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve cached phone numbers
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const firstName = searchParams.get('first_name');
  const lastName = searchParams.get('last_name');
  const organization = searchParams.get('organization');

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: 'first_name and last_name are required' },
      { status: 400 }
    );
  }

  const key = `${firstName}_${lastName}_${organization || 'unknown'}`.toLowerCase();
  const cached = phoneNumberCache.get(key);

  if (cached) {
    return NextResponse.json({
      found: true,
      phone: cached.phone,
      person: cached.person,
      cached_at: new Date(cached.timestamp).toISOString()
    });
  }

  return NextResponse.json({
    found: false,
    message: 'Phone number not yet received from Apollo webhook'
  });
}
