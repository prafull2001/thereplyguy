'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState(null)
  const [loading, setLoading] = useState(false)

  const runDebug = async () => {
    setLoading(true)
    try {
      console.log('=== MANUAL DEBUG FROM DEBUG PAGE ===')
      
      // Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('Session check:', { session: !!session, error: sessionError, userId: session?.user?.id })

      if (!session) {
        setDebugInfo({ error: 'No session found', sessionError })
        setLoading(false)
        return
      }

      // Try the onboarding-status API
      console.log('Calling /api/onboarding-status...')
      const onboardingResponse = await fetch('/api/onboarding-status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Onboarding API response status:', onboardingResponse.status)
      
      if (!onboardingResponse.ok) {
        const errorText = await onboardingResponse.text()
        console.log('Onboarding API error:', errorText)
        setDebugInfo({ 
          error: 'Onboarding API failed', 
          status: onboardingResponse.status,
          errorText 
        })
        setLoading(false)
        return
      }

      const onboardingData = await onboardingResponse.json()
      console.log('Onboarding API success:', onboardingData)

      // Try the debug-session API
      console.log('Calling /api/debug-session...')
      const debugResponse = await fetch('/api/debug-session', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Debug API response status:', debugResponse.status)
      
      const debugData = debugResponse.ok 
        ? await debugResponse.json() 
        : { error: 'Debug API failed', status: debugResponse.status }

      setDebugInfo({
        session: {
          hasSession: !!session,
          userId: session.user?.id,
          tokenLength: session.access_token?.length
        },
        onboarding: onboardingData,
        debug: debugData
      })

    } catch (error) {
      console.error('Debug error:', error)
      setDebugInfo({ error: error.message, stack: error.stack })
    }
    setLoading(false)
  }

  useEffect(() => {
    runDebug()
  }, [])

  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--bg-primary, #FDFCF9)' }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Debug Session</h1>
        
        <button
          onClick={runDebug}
          disabled={loading}
          className="mb-6 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Running Debug...' : 'Run Debug Again'}
        </button>

        {debugInfo && (
          <div style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}>
            <h2 className="text-lg font-semibold mb-4">Debug Results:</h2>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}