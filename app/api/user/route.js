import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Mark this route as dynamic to prevent static rendering
export const dynamic = 'force-dynamic'

async function getAuthenticatedSupabase(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { supabase: null, user: null }
  
  const token = authHeader.replace('Bearer ', '')
  
  // Create a Supabase client with the user's session token
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
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

    const { data, error } = await supabase
      .from('profiles')
      .select('daily_goal, current_follower_count, onboarding_completed')
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ 
      dailyGoal: data?.daily_goal || 50,
      currentFollowerCount: data?.current_follower_count || 0,
      onboardingCompleted: data?.onboarding_completed || false
    })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase(request)
    
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { dailyGoal } = await request.json()

    if (!dailyGoal || isNaN(dailyGoal) || dailyGoal < 1) {
      return NextResponse.json({ error: 'Invalid daily goal' }, { status: 400 })
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id, 
        daily_goal: dailyGoal 
      })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}