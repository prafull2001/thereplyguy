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

    // Get logs from the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('log_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('log_date', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json(data || [])
    
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

    const { repliesCount, followerCount } = await request.json()

    if (repliesCount === undefined || followerCount === undefined || 
        isNaN(repliesCount) || isNaN(followerCount)) {
      return NextResponse.json({ error: 'Invalid replies count or follower count' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Check if already logged today
    const { data: existingLog } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .single()

    if (existingLog) {
      return NextResponse.json({ error: 'Already logged today' }, { status: 400 })
    }

    // Get user's daily goal
    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_goal')
      .eq('id', user.id)
      .single()

    const dailyGoal = profile?.daily_goal || 50
    const goalMet = repliesCount >= dailyGoal

    // Save log to database
    const { error: insertError } = await supabase
      .from('logs')
      .insert({
        user_id: user.id,
        log_date: today,
        replies_made: repliesCount,
        follower_count: followerCount,
        daily_goal: dailyGoal,
        goal_met: goalMet
      })

    if (insertError) {
      console.error('Supabase insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save log' }, { status: 500 })
    }

    // Update current follower count in profile for future sessions
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        current_follower_count: followerCount
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to update follower count:', updateError)
      // Don't fail the request for this
    }

    return NextResponse.json({ 
      success: true,
      replies_made: repliesCount,
      follower_count: followerCount,
      goal_met: goalMet
    })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      error: 'Failed to log progress. Please try again later.' 
    }, { status: 500 })
  }
}