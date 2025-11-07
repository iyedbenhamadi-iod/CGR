import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * On-Demand Contact Reveal Endpoint
 *
 * Reveals phone number and email for a specific contact.
 * Priority: Phone > LinkedIn > Email
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, linkedinUrl, organization } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'firstName and lastName are required' },
        { status: 400 }
      );
    }

    console.log(`🔓 Revealing contact: ${firstName} ${lastName}`);

    const apolloApiKey = process.env.APOLLO_API_KEY;
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/apollo-webhook`;

    if (!apolloApiKey) {
      return NextResponse.json(
        { error: 'Apollo API key not configured' },
        { status: 500 }
      );
    }

    // Call Apollo enrichment API
    const payload: any = {
      first_name: firstName,
      last_name: lastName,
      reveal_personal_emails: true,
      reveal_phone_number: true,
      webhook_url: webhookUrl
    };

    if (linkedinUrl) payload.linkedin_url = linkedinUrl;
    if (organization) payload.organization_name = organization;

    const response = await axios.post(
      'https://api.apollo.io/api/v1/people/match',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apolloApiKey
        },
        timeout: 30000
      }
    );

    const person = response.data.person;

    if (!person) {
      return NextResponse.json({
        success: false,
        message: 'Contact not found in Apollo database'
      });
    }

    // Extract email (available immediately)
    let email: string | undefined = person.email;

    // Extract phone from immediate response (if available)
    let phone: string | undefined;
    let phoneStatus: string;

    // Check if Apollo has ANY phone data at all
    if (!person.phone_numbers || person.phone_numbers.length === 0) {
      // No phone numbers array = Apollo doesn't have this data
      phoneStatus = 'not_available';
      console.log(`⚠️ No phone data in Apollo database for ${firstName} ${lastName}`);
    } else {
      // Has phone_numbers array - check for immediate phone
      const primaryPhone = person.phone_numbers.find((p: any) => p.type === 'mobile')
        || person.phone_numbers.find((p: any) => p.type === 'work')
        || person.phone_numbers[0];

      phone = primaryPhone.sanitized_number || primaryPhone.raw_number;

      // If we got a phone immediately, it's available
      // If phone_numbers exists but no phone extracted, webhook might deliver more
      phoneStatus = phone ? 'available' : 'pending_webhook';
    }

    console.log(`✅ Contact revealed: ${firstName} ${lastName}`, {
      has_email: !!email,
      has_phone: !!phone,
      phone_status: phoneStatus,
      phone_numbers_count: person.phone_numbers?.length || 0
    });

    return NextResponse.json({
      success: true,
      email: email || null,
      phone: phone || null,
      phoneStatus,
      linkedin_url: person.linkedin_url || null,
      message: phoneStatus === 'not_available'
        ? 'Phone number not available in Apollo database'
        : phoneStatus === 'pending_webhook'
        ? 'Phone number will be available in 2-5 minutes. Please check back.'
        : 'Contact information revealed'
    });

  } catch (error: any) {
    console.error('❌ Error revealing contact:', error);

    if (error.response?.status === 400) {
      return NextResponse.json({
        success: false,
        error: error.response.data.error || 'Invalid request to Apollo API'
      }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reveal contact information',
        details: error.message
      },
      { status: 500 }
    );
  }
}
