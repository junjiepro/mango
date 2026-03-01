/**
 * Language Preference API
 * T170: PUT /api/profile/language - Update user language preference
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidLocale } from '@/i18n/config';

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { locale } = body;

    if (!locale || !isValidLocale(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    // Update user_profiles.preferences.language
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('user_id', user.id)
      .single();

    const currentPreferences = (profile?.preferences as Record<string, unknown>) || {};
    const updatedPreferences = { ...currentPreferences, language: locale };

    await supabase
      .from('user_profiles')
      .update({ preferences: updatedPreferences })
      .eq('user_id', user.id);

    // Set cookie in response
    const response = NextResponse.json({ success: true });
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'lax',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
