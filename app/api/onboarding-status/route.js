import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Checking onboarding status via API for user:', user.id)

    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed, current_follower_count, daily_goal')
      .eq('id', user.id)
      .maybeSingle()

    console.log('API onboarding check result:', { data, error, hasData: !!data })

    if (error) {
      console.error('Profile query error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    
    // If no profile exists, user needs onboarding
    if (!data) {
      console.log('No profile found via API, onboarding required')
      return NextResponse.json({
        onboardingCompleted: false,
        currentFollowerCount: 0,
        dailyGoal: 50
      })
    }
    
    const completed = data.onboarding_completed === true
    console.log('Profile found via API, onboarding completed:', completed)
    
    return NextResponse.json({
      onboardingCompleted: completed,
      currentFollowerCount: data.current_follower_count || 0,
      dailyGoal: data.daily_goal || 50
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}