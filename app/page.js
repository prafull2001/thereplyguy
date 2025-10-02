'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '../lib/supabaseClient'
import ReplyHistoryChart from './components/ReplyHistoryChart'
import FollowerGrowthChart from './components/FollowerGrowthChart'
import OnboardingFlow from './components/OnboardingFlow'
import MonthlyCalendar from './components/MonthlyCalendar'
import MobileScreenshotView from './components/MobileScreenshotView'

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
  const [debugInfo, setDebugInfo] = useState(null)
  const [screenshotMode, setScreenshotMode] = useState(false)

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        // First, try to get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.log('Session error:', sessionError)
        }

        if (isMounted) {
          const currentUser = session?.user ?? null
          setUser(currentUser)
          setLoading(false)
          
          if (currentUser) {
            console.log('Found existing session for user:', currentUser.id)
            await checkOnboardingStatusForUser(currentUser)
          } else {
            console.log('No existing session found')
            setCheckingOnboarding(false)
            setOnboardingCompleted(false)
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        if (isMounted) {
          setUser(null)
          setLoading(false)
          setCheckingOnboarding(false)
        }
      }
    }

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.log('Loading timeout reached')
        setLoading(false)
        setCheckingOnboarding(false)
      }
    }, 10000) // Increased to 10 seconds for better reliability

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      
      if (isMounted) {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        setLoading(false)
        
        if (currentUser && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
          console.log('User signed in, token refreshed, or initial session loaded, checking onboarding')
          await checkOnboardingStatusForUser(currentUser)
        } else if (!currentUser && event === 'SIGNED_OUT') {
          console.log('User explicitly signed out')
          setCheckingOnboarding(false)
          setOnboardingCompleted(false)
        }
        // Don't reset onboarding for INITIAL_SESSION with undefined user - just wait for the real session
      }
    })

    return () => {
      isMounted = false
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

      // Check localStorage cache first
      const cacheKey = `onboarding_${userObj.id}`
      const cachedStatus = localStorage.getItem(cacheKey)
      
      if (cachedStatus === 'completed') {
        console.log('Found cached onboarding completion, using cached status')
        setOnboardingCompleted(true)
        setCheckingOnboarding(false)
        // Still fetch fresh data in background
        fetchUserDataInBackground(userObj.id)
        return
      }

      // Get the current session to authenticate the API call
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.log('No session available for onboarding check')
        setOnboardingCompleted(false)
        setCheckingOnboarding(false)
        return
      }

      const response = await fetch('/api/onboarding-status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('Failed to check onboarding status:', response.status)
        setOnboardingCompleted(false)
        setCheckingOnboarding(false)
        return
      }

      const data = await response.json()
      console.log('Onboarding check result from API:', data)
      
      const completed = data.onboardingCompleted === true
      console.log('Setting onboarding completed to:', completed)
      setOnboardingCompleted(completed)
      
      // Cache the result
      if (completed) {
        localStorage.setItem(cacheKey, 'completed')
        console.log('Cached onboarding completion for user:', userObj.id)
      }
      
      // Set default values if onboarding is completed
      if (completed) {
        console.log('Loading user data from API:', {
          followerCount: data.currentFollowerCount,
          dailyGoal: data.dailyGoal
        })
        
        if (data.currentFollowerCount !== null) {
          setTodayFollowers(data.currentFollowerCount)
        }
        if (data.dailyGoal !== null) {
          setDailyGoal(data.dailyGoal)
        }
      }
      
    } catch (err) {
      console.error('Error checking onboarding:', err)
      setOnboardingCompleted(false)
    } finally {
      setCheckingOnboarding(false)
    }
  }

  const fetchUserDataInBackground = async (userId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/onboarding-status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.currentFollowerCount !== null) {
          setTodayFollowers(data.currentFollowerCount)
        }
        if (data.dailyGoal !== null) {
          setDailyGoal(data.dailyGoal)
        }
      }
    } catch (err) {
      console.error('Background fetch error:', err)
    }
  }

  const checkOnboardingStatus = async () => {
    await checkOnboardingStatusForUser(user)
  }

  // Debug function to check current session state
  const debugSession = async () => {
    try {
      console.log('=== MANUAL DEBUG SESSION ===')
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Current session:', {
        hasSession: !!session,
        userId: session?.user?.id,
        accessToken: session?.access_token?.substring(0, 20) + '...'
      })

      if (session) {
        const response = await fetch('/api/debug-session', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })
        
        const debugData = await response.json()
        console.log('Debug session response:', debugData)
        setDebugInfo(debugData)
      } else {
        console.log('No session found')
        setDebugInfo({ error: 'No session found' })
      }
    } catch (err) {
      console.error('Debug session error:', err)
      setDebugInfo({ error: err.message })
    }
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
        console.log('Update response:', data) // Debug logging
        setTodayReplies(data.repliesCount)
        setTodayFollowers(data.followerCount)
        setGoalMet(data.goalMet)
        console.log('Goal met status updated to:', data.goalMet) // Debug logging
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
              src="/replyguylogo.png" 
              alt="Reply Guy Tracker Logo" 
              width={120} 
              height={120}
              className="rounded-lg"
            />
          </div>
          <h1 className="text-5xl font-bold mb-4" style={{ color: 'var(--accent-primary)' }}>
            ReplyGuy
          </h1>
          <p className="text-xl mb-4" style={{ color: 'var(--text-secondary)' }}>
            Build mindful engagement habits on Twitter
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
          // Cache the completion immediately
          if (user?.id) {
            localStorage.setItem(`onboarding_${user.id}`, 'completed')
            console.log('Cached onboarding completion on complete')
          }
          checkOnboardingStatus() // Refresh the data
        }} 
      />
    )
  }

  // Show mobile screenshot view when in screenshot mode
  if (screenshotMode) {
    return (
      <div className="min-h-screen w-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-md mx-auto py-4">
          <div className="mb-4 text-center">
            <button
              onClick={() => setScreenshotMode(false)}
              className="text-sm px-4 py-2 rounded-lg border-2 border-purple-300 text-purple-600 hover:border-purple-400 transition-colors font-medium mb-2"
            >
              ← Back to Dashboard
            </button>
            <p className="text-xs text-gray-600">
              Screenshot this view to share your ReplyGuy journey!
            </p>
          </div>
          <MobileScreenshotView 
            todayReplies={todayReplies}
            dailyGoal={dailyGoal}
            todayFollowers={todayFollowers}
            goalMet={goalMet}
            historicalData={historicalData}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Image 
              src="/replyguylogo.png" 
              alt="Reply Guy Tracker Logo" 
              width={48} 
              height={48}
              className="rounded-lg"
            />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>
              ReplyGuy
            </h1>
          </div>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Time to be the ReplyGuy 😎
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setScreenshotMode(!screenshotMode)}
            className={`text-sm px-4 py-2 rounded-lg border-2 transition-colors font-medium ${
              screenshotMode 
                ? 'border-purple-400 bg-purple-50 text-purple-700 hover:border-purple-500' 
                : 'border-purple-300 text-purple-600 hover:border-purple-400'
            }`}
          >
            📱 {screenshotMode ? 'Exit' : 'Share'} Mode
          </button>
          {/* <button
            onClick={debugSession}
            className="text-sm px-4 py-2 rounded-lg border-2 border-blue-300 hover:border-blue-400 transition-colors text-blue-600"
          >
            Debug Session
          </button> */}
          <button
            onClick={handleSignOut}
            className="text-sm px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            Sign Out
          </button>
        </div>
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

      {/* Debug Info Display */}
      {debugInfo && (
        <div style={{ 
          background: '#EBF8FF', 
          border: '1px solid #BEE3F8', 
          color: '#2B6CB0',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '24px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <strong>Debug Session Info:</strong>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}

      {/* Today's Activity Section - Primary Focus */}
      <section>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Image 
              src="/replyguylogo.png" 
              alt="Reply Guy Logo" 
              width={24} 
              height={24}
              className="rounded"
            />
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Today's Activity
            </h2>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Track your real-time engagement • {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'short', 
              day: 'numeric' 
            })}
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">⚡</span>
            <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Today's Tally
            </h3>
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
      </section>

      {/* Quick Overview Row - Progress + Calendar */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Progress Overview Cards */}
        <div className="lg:col-span-2">
          <section>
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <Image 
                  src="/replyguylogo.png" 
                  alt="Reply Guy Logo" 
                  width={20} 
                  height={20}
                  className="rounded"
                />
                <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Progress Overview
                </h2>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Key metrics and achievements
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-4 text-center">
                <div className="text-2xl mb-1">📈</div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Days Tracked
                </h3>
                <p className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                  {historicalData.length}
                </p>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="text-2xl mb-1">✅</div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Goals Achieved
                </h3>
                <p className="text-2xl font-bold" style={{ color: 'var(--accent-secondary)' }}>
                  {historicalData.filter(log => log.goal_met).length}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Monthly Calendar */}
        <div>
          <section>
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <Image 
                  src="/replyguylogo.png" 
                  alt="Reply Guy Logo" 
                  width={20} 
                  height={20}
                  className="rounded"
                />
                <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Monthly Progress
                </h2>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Visualize your engagement patterns
              </p>
            </div>
            
            <MonthlyCalendar data={historicalData} />
          </section>
        </div>
      </div>

      {/* Analytics Section - Charts */}
      <section>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Image 
              src="/replyguylogo.png" 
              alt="Reply Guy Logo" 
              width={24} 
              height={24}
              className="rounded"
            />
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Analytics
            </h2>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Detailed insights and trends
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">💬</span>
              <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Reply History
              </h3>
            </div>
            <ReplyHistoryChart data={historicalData} />
          </div>
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">📈</span>
              <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Follower Growth
              </h3>
            </div>
            <FollowerGrowthChart data={historicalData} />
          </div>
        </div>
      </section>

      {/* Settings Section - Less Priority */}
      <section>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Image 
              src="/replyguylogo.png" 
              alt="Reply Guy Logo" 
              width={24} 
              height={24}
              className="rounded"
            />
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Settings
            </h2>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Customize your engagement goals and preferences
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🎯</span>
            <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Daily Reply Goal
            </h3>
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
      </section>
    </div>
  )
}