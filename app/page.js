'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '../lib/supabaseClient'
import ReplyHistoryChart from './components/ReplyHistoryChart'
import FollowerGrowthChart from './components/FollowerGrowthChart'
import OnboardingFlow from './components/OnboardingFlow'
import logo from './assets/replyguylogo.png'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dailyGoal, setDailyGoal] = useState(50)
  const [newGoal, setNewGoal] = useState('')
  const [historicalData, setHistoricalData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [todayReplies, setTodayReplies] = useState(0)
  const [todayFollowers, setTodayFollowers] = useState(0)
  const [goalMet, setGoalMet] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.log('Auth error:', error)
        }
        
        setUser(user)
        setLoading(false)
        
        if (user) {
          await checkOnboardingStatus()
        } else {
          setCheckingOnboarding(false)
        }
      } catch (error) {
        console.error('Failed to get user:', error)
        setUser(null)
        setLoading(false)
        setCheckingOnboarding(false)
      }
    }

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('Loading timeout reached')
      setLoading(false)
      setCheckingOnboarding(false)
    }, 5000)

    getUser().then(() => {
      clearTimeout(loadingTimeout)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      setUser(session?.user ?? null)
      setLoading(false)
      
      if (session?.user) {
        // Call checkOnboardingStatus directly with the user from session
        await checkOnboardingStatusForUser(session.user)
      } else {
        setCheckingOnboarding(false)
        setOnboardingCompleted(false)
      }
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(loadingTimeout)
    }
  }, [])

  useEffect(() => {
    if (user && onboardingCompleted) {
      fetchTodayData()
    }
  }, [user, onboardingCompleted])

  const checkOnboardingStatusForUser = async (userObj) => {
    try {
      if (!userObj?.id) {
        console.log('No user provided for onboarding check')
        setOnboardingCompleted(false)
        setCheckingOnboarding(false)
        return
      }

      console.log('Checking onboarding status for user:', userObj.id)

      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, current_follower_count, daily_goal')
        .eq('id', userObj.id)
        .single()

      console.log('Onboarding check result:', { data, error })

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking onboarding:', error)
        setOnboardingCompleted(false)
        setCheckingOnboarding(false)
        return
      }
      
      const completed = data?.onboarding_completed === true
      console.log('Setting onboarding completed to:', completed)
      setOnboardingCompleted(completed)
      
      // Set default values if onboarding is completed
      if (completed) {
        if (data?.current_follower_count) {
          setTodayFollowers(data.current_follower_count)
        }
        if (data?.daily_goal) {
          setDailyGoal(data.daily_goal)
        }
      }
      
    } catch (err) {
      console.error('Error checking onboarding:', err)
      setOnboardingCompleted(false)
    } finally {
      setCheckingOnboarding(false)
    }
  }

  const checkOnboardingStatus = async () => {
    await checkOnboardingStatusForUser(user)
  }

  const fetchTodayData = async () => {
    try {
      setIsLoading(true)
      
      // Get session to include in API calls
      const { data: { session } } = await supabase.auth.getSession()
      const headers = session ? { 
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      } : { 'Content-Type': 'application/json' }
      
      // Fetch today's tracking data
      const trackingResponse = await fetch('/api/tracking', { headers })
      if (trackingResponse.ok) {
        const trackingData = await trackingResponse.json()
        setTodayReplies(trackingData.repliesCount || 0)
        setTodayFollowers(trackingData.followerCount || 0)
        setDailyGoal(trackingData.dailyGoal || 50)
        setGoalMet(trackingData.goalMet || false)
      }

      // Fetch historical logs for charts
      const logsResponse = await fetch('/api/logs', { headers })
      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        setHistoricalData(logsData)
      }
    } catch (err) {
      setError('Failed to fetch data')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const updateCount = async (type, change) => {
    if (updating) return // Prevent multiple concurrent updates
    
    setUpdating(true)
    setError('')
    
    try {
      const newValue = type === 'replies' 
        ? Math.max(0, todayReplies + change)
        : Math.max(0, todayFollowers + change)
      
      const { data: { session } } = await supabase.auth.getSession()
      const headers = session ? { 
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      } : { 'Content-Type': 'application/json' }
      
      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: type,
          value: newValue
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setTodayReplies(data.repliesCount)
        setTodayFollowers(data.followerCount)
        setGoalMet(data.goalMet)
      } else {
        setError('Failed to update count')
      }
    } catch (err) {
      setError('Failed to update count')
      console.error(err)
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveGoal = async () => {
    if (!newGoal || isNaN(newGoal)) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ dailyGoal: parseInt(newGoal) })
      })
      
      if (response.ok) {
        setDailyGoal(parseInt(newGoal))
        setNewGoal('')
        setError('')
      } else {
        setError('Failed to save goal')
      }
    } catch (err) {
      setError('Failed to save goal')
      console.error(err)
    }
  }


  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/signin')
  }

  if (loading || checkingOnboarding) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2" style={{ borderColor: 'var(--accent-primary)' }}></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="mb-6 flex justify-center">
            <Image 
              src={logo} 
              alt="Reply Guy Tracker Logo" 
              width={120} 
              height={120}
              className="rounded-lg"
            />
          </div>
          <h1 className="text-5xl font-bold mb-4" style={{ color: 'var(--accent-primary)' }}>
            Reply Guy Tracker
          </h1>
          <p className="text-xl mb-4" style={{ color: 'var(--text-secondary)' }}>
            Build mindful engagement habits on Twitter
          </p>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Track your daily replies, monitor follower growth, and develop a healthier relationship with social media
          </p>
        </div>
        
        <div className="glass-card p-8 max-w-md mx-auto">
          <button
            onClick={() => router.push('/auth/signin')}
            className="btn-primary w-full text-lg font-medium"
          >
            Get Started 🚀
          </button>
          <p className="text-sm mt-4" style={{ color: 'var(--text-secondary)' }}>
            Join the mindful engagement movement
          </p>
        </div>
      </div>
    )
  }

  // Show onboarding flow for new users
  if (user && !onboardingCompleted) {
    return (
      <OnboardingFlow 
        user={user} 
        onComplete={() => {
          setOnboardingCompleted(true)
          checkOnboardingStatus() // Refresh the data
        }} 
      />
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Image 
              src={logo} 
              alt="Reply Guy Tracker Logo" 
              width={48} 
              height={48}
              className="rounded-lg"
            />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>
              Reply Guy Tracker
            </h1>
          </div>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Welcome back, {user.email.split('@')[0]}! 👋
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          Sign Out
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ 
          background: '#FEF2F2', 
          border: '1px solid #FECACA', 
          color: '#DC2626',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '24px'
        }}>
          {error}
        </div>
      )}

      {/* Goal Setting */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🎯</span>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Daily Reply Goal
          </h2>
        </div>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
          Current goal: <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>{dailyGoal}</span> replies per day
        </p>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              New Goal
            </label>
            <input
              type="number"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="Enter new goal"
              className="input-field w-full"
            />
          </div>
          <button
            onClick={handleSaveGoal}
            className="btn-secondary px-6 py-3 font-medium"
          >
            Update Goal
          </button>
        </div>
      </div>

      {/* Live Tracking */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">⚡</span>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Today's Progress
          </h2>
          <div className="flex-1"></div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              <span className="text-lg">💬</span> Replies Made Today
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => updateCount('replies', -1)}
                disabled={updating || todayReplies <= 0}
                className="counter-btn disabled:opacity-50 disabled:cursor-not-allowed"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <div className="text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                  {todayReplies}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Goal: {dailyGoal}
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateCount('replies', 1)}
                disabled={updating}
                className="counter-btn disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
            {goalMet && (
              <div className="text-center mt-3 p-2 rounded-lg" style={{ background: 'var(--accent-secondary)', color: 'white' }}>
                🎉 Goal achieved!
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              <span className="text-lg">👥</span> Current Followers
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => updateCount('followers', -1)}
                disabled={updating || todayFollowers <= 0}
                className="counter-btn disabled:opacity-50 disabled:cursor-not-allowed"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <div className="text-3xl font-bold" style={{ color: 'var(--accent-secondary)' }}>
                  {todayFollowers.toLocaleString()}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Followers
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateCount('followers', 1)}
                disabled={updating}
                className="counter-btn disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
          </div>
        </div>
        
        {updating && (
          <div className="text-center mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Updating...
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-6 text-center">
          <div className="text-3xl mb-2">📈</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Total Days Tracked
          </h3>
          <p className="text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>
            {historicalData.length}
          </p>
        </div>
        <div className="glass-card p-6 text-center">
          <div className="text-3xl mb-2">✅</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Goals Achieved
          </h3>
          <p className="text-3xl font-bold" style={{ color: 'var(--accent-secondary)' }}>
            {historicalData.filter(log => log.goal_met).length}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-8 mt-8">
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">📊</span>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Reply History
            </h2>
          </div>
          <ReplyHistoryChart data={historicalData} />
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">📈</span>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Follower Growth
            </h2>
          </div>
          <FollowerGrowthChart data={historicalData} />
        </div>
      </div>
    </div>
  )
}