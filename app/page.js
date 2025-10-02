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
import ConfettiEffect from './components/ConfettiEffect'

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
  const [confettiTrigger, setConfettiTrigger] = useState(0)
  const [previousFollowers, setPreviousFollowers] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth...')
        
        // Check if there are any localStorage conflicts
        const localStorageKeys = Object.keys(localStorage).filter(key => key.startsWith('sb-'))
        console.log('📦 Found localStorage keys:', localStorageKeys)
        
        // First, try to get the current session with timeout
        console.log('🔍 Attempting to get session...')
        
        let session = null;
        let sessionError = null;
        
        try {
          // Add timeout to prevent hanging
          const sessionPromise = supabase.auth.getSession()
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session check timeout')), 1500)
          )
          
          const result = await Promise.race([sessionPromise, timeoutPromise])
          session = result.data?.session
          sessionError = result.error
          
          console.log('🔑 Session check result:', {
            hasSession: !!session,
            userId: session?.user?.id,
            error: sessionError?.message
          })
        } catch (timeoutError) {
          console.log('⏰ Session check timed out:', timeoutError.message)
          console.log('🔧 Attempting manual session parsing from localStorage...')
          
          // Try to manually parse the session from localStorage as fallback
          try {
            const storedToken = localStorage.getItem('sb-uwqgvarjyscdnwifzwkj-auth-token')
            if (storedToken) {
              const tokenData = JSON.parse(storedToken)
              console.log('🔍 Found stored token data:', {
                hasAccessToken: !!tokenData.access_token,
                hasUser: !!tokenData.user,
                expiresAt: tokenData.expires_at
              })
              
              // Check if token is still valid
              const now = Math.floor(Date.now() / 1000)
              if (tokenData.expires_at && tokenData.expires_at > now) {
                console.log('✅ Token is still valid, using manual session')
                session = {
                  access_token: tokenData.access_token,
                  refresh_token: tokenData.refresh_token,
                  expires_in: tokenData.expires_in,
                  expires_at: tokenData.expires_at,
                  token_type: tokenData.token_type || 'bearer',
                  user: tokenData.user
                }
                sessionError = null // Clear the timeout error
              } else {
                console.log('❌ Token expired')
              }
            }
          } catch (parseError) {
            console.log('❌ Failed to parse stored token:', parseError)
          }
          
          if (!session) {
            sessionError = timeoutError
          }
        }
        
        if (sessionError) {
          console.log('❌ Session error:', sessionError)
        }

        if (isMounted) {
          const currentUser = session?.user ?? null
          setUser(currentUser)
          setLoading(false)
          
          if (currentUser) {
            console.log('✅ Found existing session for user:', currentUser.id)
            // Clear the timeout since we have a user
            clearTimeout(loadingTimeout)
            console.log('🚫 Timeout cleared - user found')
            await checkOnboardingStatusForUser(currentUser)
          } else {
            console.log('❌ No existing session found - redirecting to sign in')
            setCheckingOnboarding(false)
            setOnboardingCompleted(false)
            // If no session and we've waited long enough, redirect to sign in
            if (!currentUser) {
              console.log('🔄 Redirecting to sign in page...')
              router.push('/auth/signin')
            }
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
        console.log('⏰ Loading timeout reached - redirecting to sign in')
        setLoading(false)
        setCheckingOnboarding(false)
        router.push('/auth/signin')
      }
    }, 8000) // Increased to 8 seconds to allow for onboarding API call

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
          // Clear timeout since we have a user
          clearTimeout(loadingTimeout)
          console.log('🚫 Timeout cleared - auth state change')
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
      console.log('🔄 checkOnboardingStatusForUser called with:', userObj?.id)
      
      if (!userObj?.id) {
        console.log('❌ No user provided for onboarding check')
        setOnboardingCompleted(false)
        setCheckingOnboarding(false)
        return
      }

      console.log('📝 Checking onboarding status for user:', userObj.id)

      // Check localStorage cache first
      console.log('📦 Checking localStorage cache...')
      const cacheKey = `onboarding_${userObj.id}`
      const cachedStatus = localStorage.getItem(cacheKey)
      console.log('📦 Cached status:', cachedStatus)
      
      if (cachedStatus === 'completed') {
        console.log('✅ Found cached onboarding completion, using cached status')
        setOnboardingCompleted(true)
        setCheckingOnboarding(false)
        // Still fetch fresh data in background
        console.log('🔄 Fetching user data in background...')
        fetchUserDataInBackground(userObj.id)
        return
      }

      // Get the current session to authenticate the API call (with same fallback as main auth)
      console.log('🔍 Getting session for API authentication...')
      let session = null
      
      try {
        // Try normal session check with timeout
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout in onboarding')), 1500)
        )
        
        const result = await Promise.race([sessionPromise, timeoutPromise])
        session = result.data?.session
        console.log('✅ Session obtained normally for onboarding check:', !!session)
      } catch (timeoutError) {
        console.log('⏰ Onboarding session check timed out, using manual fallback')
        
        // Use the manually parsed session from localStorage (same as main auth)
        const storedToken = localStorage.getItem('sb-uwqgvarjyscdnwifzwkj-auth-token')
        if (storedToken) {
          try {
            const tokenData = JSON.parse(storedToken)
            const now = Math.floor(Date.now() / 1000)
            if (tokenData.expires_at && tokenData.expires_at > now) {
              console.log('✅ Using manual session for onboarding check')
              session = {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_in: tokenData.expires_in,
                expires_at: tokenData.expires_at,
                token_type: tokenData.token_type || 'bearer',
                user: tokenData.user
              }
            }
          } catch (parseError) {
            console.log('❌ Failed to parse stored token for onboarding:', parseError)
          }
        }
      }
      
      if (!session) {
        console.log('No session available for onboarding check')
        setOnboardingCompleted(false)
        setCheckingOnboarding(false)
        return
      }

      console.log('🔍 Making onboarding status API call...')
      
      // Add timeout to the onboarding API call
      const fetchPromise = fetch('/api/onboarding-status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Onboarding API timeout')), 5000)
      )
      
      const response = await Promise.race([fetchPromise, timeoutPromise])
      console.log('✅ Onboarding API call completed')

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
      console.log('🔄 fetchTodayData called')
      setIsLoading(true)
      
      // Get session to include in API calls (with same timeout handling)
      let session = null
      try {
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout in fetchTodayData')), 1500)
        )
        const result = await Promise.race([sessionPromise, timeoutPromise])
        session = result.data?.session
        console.log('✅ Session for fetchTodayData:', !!session)
      } catch (timeoutError) {
        console.log('⏰ fetchTodayData session timed out, using manual fallback')
        const storedToken = localStorage.getItem('sb-uwqgvarjyscdnwifzwkj-auth-token')
        if (storedToken) {
          try {
            const tokenData = JSON.parse(storedToken)
            const now = Math.floor(Date.now() / 1000)
            if (tokenData.expires_at && tokenData.expires_at > now) {
              session = {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_in: tokenData.expires_in,
                expires_at: tokenData.expires_at,
                token_type: tokenData.token_type || 'bearer',
                user: tokenData.user
              }
              console.log('✅ Manual session for fetchTodayData')
            }
          } catch (parseError) {
            console.log('❌ Failed to parse token for fetchTodayData:', parseError)
          }
        }
      }
      
      const headers = session ? { 
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      } : { 'Content-Type': 'application/json' }
      
      // Fetch today's tracking data
      console.log('🔍 Fetching tracking data...')
      const trackingResponse = await fetch('/api/tracking', { headers })
      if (trackingResponse.ok) {
        const trackingData = await trackingResponse.json()
        console.log('✅ Tracking data received:', trackingData)
        setTodayReplies(trackingData.repliesCount || 0)
        setTodayFollowers(trackingData.followerCount || 0)
        setPreviousFollowers(trackingData.followerCount || 0) // Initialize previous followers
        setDailyGoal(trackingData.dailyGoal || 50)
        setGoalMet(trackingData.goalMet || false)
      } else {
        console.error('❌ Failed to fetch tracking data:', trackingResponse.status)
      }

      // Fetch historical logs for charts
      console.log('🔍 Fetching historical logs...')
      const logsResponse = await fetch('/api/logs', { headers })
      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        console.log('✅ Historical data received:', logsData.length, 'records')
        setHistoricalData(logsData)
      } else {
        console.error('❌ Failed to fetch logs:', logsResponse.status)
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
      
      console.log(`🔄 Updating ${type} to:`, newValue)
      
      // Use the same session timeout handling as other functions
      let session = null
      try {
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout in updateCount')), 1500)
        )
        const result = await Promise.race([sessionPromise, timeoutPromise])
        session = result.data?.session
        console.log('✅ Session for updateCount:', !!session)
      } catch (timeoutError) {
        console.log('⏰ updateCount session timed out, using manual fallback')
        const storedToken = localStorage.getItem('sb-uwqgvarjyscdnwifzwkj-auth-token')
        if (storedToken) {
          try {
            const tokenData = JSON.parse(storedToken)
            const now = Math.floor(Date.now() / 1000)
            if (tokenData.expires_at && tokenData.expires_at > now) {
              session = {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_in: tokenData.expires_in,
                expires_at: tokenData.expires_at,
                token_type: tokenData.token_type || 'bearer',
                user: tokenData.user
              }
              console.log('✅ Manual session for updateCount')
            }
          } catch (parseError) {
            console.log('❌ Failed to parse token for updateCount:', parseError)
          }
        }
      }
      
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
        
        // Check for follower increase and trigger confetti
        if (type === 'followers' && data.followerCount > previousFollowers && previousFollowers > 0) {
          setConfettiTrigger(prev => prev + 1)
        }
        
        // Update previous followers for next comparison
        if (type === 'followers') {
          setPreviousFollowers(data.followerCount)
        }
        
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
      console.log('🔄 Saving goal:', newGoal)
      
      // Use the same session timeout handling
      let session = null
      try {
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout in handleSaveGoal')), 1500)
        )
        const result = await Promise.race([sessionPromise, timeoutPromise])
        session = result.data?.session
        console.log('✅ Session for handleSaveGoal:', !!session)
      } catch (timeoutError) {
        console.log('⏰ handleSaveGoal session timed out, using manual fallback')
        const storedToken = localStorage.getItem('sb-uwqgvarjyscdnwifzwkj-auth-token')
        if (storedToken) {
          try {
            const tokenData = JSON.parse(storedToken)
            const now = Math.floor(Date.now() / 1000)
            if (tokenData.expires_at && tokenData.expires_at > now) {
              session = {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_in: tokenData.expires_in,
                expires_at: tokenData.expires_at,
                token_type: tokenData.token_type || 'bearer',
                user: tokenData.user
              }
              console.log('✅ Manual session for handleSaveGoal')
            }
          } catch (parseError) {
            console.log('❌ Failed to parse token for handleSaveGoal:', parseError)
          }
        }
      }
      
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
        // Refresh the data to ensure everything is in sync
        await fetchTodayData()
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

  // Debug function to clear localStorage if there are conflicts
  const clearLocalSession = () => {
    console.log('🗑️ Clearing local session data...')
    const keys = Object.keys(localStorage).filter(key => key.startsWith('sb-'))
    keys.forEach(key => {
      console.log('🗑️ Removing:', key)
      localStorage.removeItem(key)
    })
    console.log('✅ Local session cleared, refreshing...')
    window.location.reload()
  }

  // Generate copy text for sharing
  const generateCopyText = () => {
    const previousFollowers = historicalData.length > 1 
      ? historicalData[historicalData.length - 2]?.follower_count || todayFollowers
      : todayFollowers
    
    return `Day ${historicalData.length} of building in public.
Today's Reply Goal: ${todayReplies}/${dailyGoal}
Followers: ${previousFollowers.toLocaleString()} → ${todayFollowers.toLocaleString()}
#bethereplyguy`
  }

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generateCopyText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
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
    <>
      <ConfettiEffect trigger={confettiTrigger} />
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 sm:mb-8">
        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
            <Image 
              src="/replyguylogo.png" 
              alt="Reply Guy Tracker Logo" 
              width={48} 
              height={48}
              className="rounded-lg"
            />
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>
              ReplyGuy
            </h1>
          </div>
          <p className="text-base sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            Time to be the ReplyGuy 😎
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopyText}
            className={`text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg border-2 transition-colors font-medium whitespace-nowrap ${
              copied 
                ? 'border-green-400 bg-green-50 text-green-700' 
                : 'border-blue-300 text-blue-600 hover:border-blue-400'
            }`}
          >
            {copied ? '✅ Copied!' : '📋 Copy Update'}
          </button>
          <button
            onClick={() => setScreenshotMode(!screenshotMode)}
            className={`text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg border-2 transition-colors font-medium whitespace-nowrap ${
              screenshotMode 
                ? 'border-purple-400 bg-purple-50 text-purple-700 hover:border-purple-500' 
                : 'border-purple-300 text-purple-600 hover:border-purple-400'
            }`}
          >
            📱 {screenshotMode ? 'Exit' : 'Share'} Mode
          </button>
          <button
            onClick={debugSession}
            className="text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg border-2 border-blue-300 hover:border-blue-400 transition-colors text-blue-600 whitespace-nowrap"
          >
            Debug Session
          </button>
          <button
            onClick={clearLocalSession}
            className="text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg border-2 border-red-300 hover:border-red-400 transition-colors text-red-600 whitespace-nowrap"
          >
            Clear Local Session
          </button>
          <button
            onClick={handleSignOut}
            className="text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors whitespace-nowrap"
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              <span className="text-lg">💬</span> Replies Made Today
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => updateCount('replies', -1)}
                disabled={updating || todayReplies <= 0 || isLoading}
                className="counter-btn disabled:opacity-50 disabled:cursor-not-allowed"
              >
                −
              </button>
              <div className="flex-1 text-center">
                {isLoading ? (
                  <>
                    <div className="animate-pulse bg-gray-300 rounded h-8 w-16 mx-auto mb-2"></div>
                    <div className="animate-pulse bg-gray-300 rounded h-4 w-20 mx-auto"></div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                      {todayReplies}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Goal: {dailyGoal}
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => updateCount('replies', 1)}
                disabled={updating || isLoading}
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
                disabled={updating || todayFollowers <= 0 || isLoading}
                className="counter-btn disabled:opacity-50 disabled:cursor-not-allowed"
              >
                −
              </button>
              <div className="flex-1 text-center">
                {isLoading ? (
                  <>
                    <div className="animate-pulse bg-gray-300 rounded h-8 w-20 mx-auto mb-2"></div>
                    <div className="animate-pulse bg-gray-300 rounded h-4 w-16 mx-auto"></div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold" style={{ color: 'var(--accent-secondary)' }}>
                      {todayFollowers.toLocaleString()}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Followers
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => updateCount('followers', 1)}
                disabled={updating || isLoading}
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Progress Overview
                </h2>
              </div>
              <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                Key metrics and achievements
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="glass-card p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl mb-1">📈</div>
                <h3 className="text-xs sm:text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Days Tracked
                </h3>
                {isLoading ? (
                  <div className="animate-pulse bg-gray-300 rounded h-6 sm:h-8 w-8 sm:w-12 mx-auto"></div>
                ) : (
                  <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                    {historicalData.length}
                  </p>
                )}
              </div>
              <div className="glass-card p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl mb-1">✅</div>
                <h3 className="text-xs sm:text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Goals Achieved
                </h3>
                {isLoading ? (
                  <div className="animate-pulse bg-gray-300 rounded h-6 sm:h-8 w-8 sm:w-12 mx-auto"></div>
                ) : (
                  <p className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--accent-secondary)' }}>
                    {historicalData.filter(log => log.goal_met).length}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Monthly Calendar */}
        <div className="flex justify-center lg:block">
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
                <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Monthly Progress
                </h2>
              </div>
              <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                Visualize your engagement patterns
              </p>
            </div>
            
            {isLoading ? (
              <div className="glass-card p-4 max-w-md">
                <div className="animate-pulse">
                  <div className="bg-gray-300 rounded h-6 w-32 mb-3"></div>
                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {Array(7).fill(0).map((_, i) => (
                      <div key={i} className="bg-gray-300 rounded h-4 w-4"></div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 mb-3">
                    {Array(35).fill(0).map((_, i) => (
                      <div key={i} className="bg-gray-300 rounded h-3 w-3"></div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <MonthlyCalendar data={historicalData} />
            )}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <span className="text-xl sm:text-2xl">💬</span>
              <h3 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Reply History
              </h3>
            </div>
            {isLoading ? (
              <div className="animate-pulse bg-gray-300 rounded h-40 w-full"></div>
            ) : (
              <ReplyHistoryChart data={historicalData} />
            )}
          </div>
          <div className="glass-card p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <span className="text-xl sm:text-2xl">📈</span>
              <h3 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                Follower Growth
              </h3>
            </div>
            {isLoading ? (
              <div className="animate-pulse bg-gray-300 rounded h-40 w-full"></div>
            ) : (
              <FollowerGrowthChart data={historicalData} />
            )}
          </div>
        </div>
      </section>

      {/* Settings Section - Less Priority */}
      <section>
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Image 
              src="/replyguylogo.png" 
              alt="Reply Guy Logo" 
              width={24} 
              height={24}
              className="rounded"
            />
            <h2 className="text-xl sm:text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Settings
            </h2>
          </div>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
            Customize your engagement goals and preferences
          </p>
        </div>

        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <span className="text-xl sm:text-2xl">🎯</span>
            <h3 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Daily Reply Goal
            </h3>
          </div>
          <p className="mb-4 sm:mb-6 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Current goal: <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>{dailyGoal}</span> replies per day
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
            <div className="flex-1">
              <label className="block text-xs sm:text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                New Goal
              </label>
              <input
                type="number"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="Enter new goal"
                className="input-field w-full text-sm sm:text-base"
              />
            </div>
            <button
              onClick={handleSaveGoal}
              className="btn-secondary px-4 sm:px-6 py-2 sm:py-3 font-medium text-sm sm:text-base w-full sm:w-auto"
            >
              Update Goal
            </button>
          </div>
        </div>
      </section>
      </div>
    </>
  )
}