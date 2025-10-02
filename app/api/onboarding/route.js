import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Mark this route as dynamic to prevent static rendering
export const dynamic = 'force-dynamic'

async function getAuthenticatedSupabase(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    console.log('No authorization header found')
    return { supabase: null, user: null }
  }
  
  const token = authHeader.replace('Bearer ', '')
  console.log('Token received:', token.substring(0, 20) + '...')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error) {
    console.error('Auth error:', error)
    return { supabase: null, user: null }
  }
  
  console.log('User authenticated:', user?.id)
  return { supabase, user }
}

export async function POST(request) {
  try {
    console.log('Onboarding API called')
    const { supabase, user } = await getAuthenticatedSupabase(request)
    
    if (!user || !supabase) {
      console.log('Authentication failed - user:', !!user, 'supabase:', !!supabase)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { dailyGoal, currentFollowers } = await request.json()
    console.log('Received data:', { dailyGoal, currentFollowers })
    
    if (!dailyGoal || currentFollowers === undefined || isNaN(dailyGoal) || isNaN(currentFollowers)) {
      console.log('Invalid data validation failed')
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    if (dailyGoal < 1 || currentFollowers < 0) {
      console.log('Range validation failed')
      return NextResponse.json({ error: 'Goal must be at least 1, followers must be 0 or more' }, { status: 400 })
    }

    console.log('Attempting to upsert profile for user:', user.id)
    
    // Create or update the user's profile
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        daily_goal: dailyGoal,
        current_follower_count: currentFollowers,
        onboarding_completed: true
      })
      .select()

    if (error) {
      console.error('Profile upsert error:', error)
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
    }

    console.log('Profile upserted successfully:', data)
    return NextResponse.json({ 
      success: true,
      profile: data
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}