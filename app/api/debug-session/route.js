import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Mark this route as dynamic to prevent static rendering
export const dynamic = 'force-dynamic'

async function getAuthenticatedSupabase(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { supabase: null, user: null }
  
  const token = authHeader.replace('Bearer ', '')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  return { supabase, user: error ? null : user }
}

export async function GET(request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase(request)
    
    console.log('=== DEBUG SESSION ===')
    console.log('User from token:', user?.id)
    
    if (!user || !supabase) {
      return NextResponse.json({ 
        success: false,
        error: 'No user found',
        hasAuthHeader: !!request.headers.get('authorization'),
        authHeaderLength: request.headers.get('authorization')?.length
      })
    }

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    console.log('Profile query result:', { profile, profileError })

    // Check if any logs exist for this user
    const { data: logs, error: logsError } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', user.id)
      .limit(5)

    console.log('Logs query result:', { logs, logsError })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      profile: profile,
      profileExists: !!profile,
      onboardingCompleted: profile?.onboarding_completed || false,
      logsCount: logs?.length || 0,
      logs: logs
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ 
      success: false,
      error: error.message 
    })
  }
}