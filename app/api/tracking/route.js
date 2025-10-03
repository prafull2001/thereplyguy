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

// Get today's tracking data
export async function GET(request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase(request)
    
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the date from query params (sent from client with user's timezone)
    const url = new URL(request.url)
    const clientDate = url.searchParams.get('date')
    
    // Use client date if provided, otherwise fall back to server date
    const today = clientDate || new Date().toLocaleDateString('en-CA') // en-CA format gives YYYY-MM-DD

    // Get today's log entry
    const { data: todayLog, error: logError } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .single()

    // Get user's profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('daily_goal, current_follower_count')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const dailyGoal = profile?.daily_goal || 50
    const currentFollowers = profile?.current_follower_count || 0

    // If no log for today exists, create one
    if (logError?.code === 'PGRST116') {
      const { data: newLog, error: createError } = await supabase
        .from('logs')
        .insert({
          user_id: user.id,
          log_date: today,
          replies_made: 0,
          follower_count: currentFollowers,
          daily_goal: dailyGoal,
          goal_met: false
        })
        .select()
        .single()

      if (createError) {
        console.error('Create log error:', createError)
        return NextResponse.json({ error: 'Failed to create daily log' }, { status: 500 })
      }

      return NextResponse.json({
        repliesCount: 0,
        followerCount: currentFollowers,
        dailyGoal: dailyGoal,
        goalMet: false
      })
    }

    if (logError) {
      console.error('Log error:', logError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      repliesCount: todayLog.replies_made,
      followerCount: todayLog.follower_count,
      dailyGoal: dailyGoal, // Use current goal from profiles, not old goal from logs
      goalMet: todayLog.replies_made >= dailyGoal // Recalculate based on current goal
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update today's tracking data
export async function POST(request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase(request)
    
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, value, date } = await request.json() // type: 'replies' or 'followers', value: new count, date: client date
    
    if (!type || value === undefined || isNaN(value) || value < 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    // Use client date if provided, otherwise fall back to server date
    const today = date || new Date().toLocaleDateString('en-CA') // en-CA format gives YYYY-MM-DD

    // Get current log for today
    const { data: currentLog, error: fetchError } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .single()

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch current data' }, { status: 500 })
    }

    // Prepare update data
    let updateData = {}
    if (type === 'replies') {
      updateData.replies_made = value
      // Always recalculate goal_met when replies are updated
      updateData.goal_met = value >= currentLog.daily_goal
    } else if (type === 'followers') {
      updateData.follower_count = value
      
      // Also update the profile's current follower count
      await supabase
        .from('profiles')
        .update({ current_follower_count: value })
        .eq('id', user.id)
    }

    // Ensure we always have the latest goal_met status for replies
    if (type === 'replies') {
      updateData.goal_met = value >= currentLog.daily_goal
      console.log(`Goal calculation: ${value} >= ${currentLog.daily_goal} = ${updateData.goal_met}`) // Debug logging
    }

    console.log('Update data:', updateData) // Debug logging

    // Update the log
    const { data: updatedLog, error: updateError } = await supabase
      .from('logs')
      .update(updateData)
      .eq('user_id', user.id)
      .eq('log_date', today)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update data' }, { status: 500 })
    }

    console.log('Updated log:', updatedLog) // Debug logging

    return NextResponse.json({
      success: true,
      repliesCount: updatedLog.replies_made,
      followerCount: updatedLog.follower_count,
      dailyGoal: updatedLog.daily_goal,
      goalMet: updatedLog.goal_met
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}