'use client'

import { useState } from 'react'
import Image from 'next/image'
import { supabase } from '../../lib/supabaseClient'
import logo from '../assets/replyguylogo.png'

export default function OnboardingFlow({ user, onComplete }) {
  const [step, setStep] = useState(1)
  const [dailyGoal, setDailyGoal] = useState('')
  const [currentFollowers, setCurrentFollowers] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleComplete = async () => {
    if (!dailyGoal || !currentFollowers || isNaN(dailyGoal) || isNaN(currentFollowers)) {
      setError('Please enter valid numbers for both fields')
      return
    }

    if (parseInt(dailyGoal) < 1 || parseInt(currentFollowers) < 0) {
      setError('Goal must be at least 1, followers must be 0 or more')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Get the current session to authenticate the request
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setError('Authentication required. Please sign in again.')
        return
      }

      // Use authenticated API call instead of direct Supabase client
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dailyGoal: parseInt(dailyGoal),
          currentFollowers: parseInt(currentFollowers)
        })
      })

      if (response.ok) {
        onComplete()
      } else {
        const errorData = await response.json()
        console.error('API error:', errorData)
        setError('Failed to save your profile. Please try again.')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <Image 
              src={logo} 
              alt="Reply Guy Tracker Logo" 
              width={80} 
              height={80}
              className="rounded-lg"
            />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--accent-primary)' }}>
            Welcome to Reply Guy Tracker!
          </h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Let's set up your mindful engagement journey
          </p>
        </div>

        <div className="glass-card p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  What's your daily reply goal?
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  This helps you build consistent engagement habits
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                  <span className="text-lg">🎯</span> Daily Reply Goal
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setDailyGoal(Math.max(1, parseInt(dailyGoal || 0) - 1).toString())}
                    className="counter-btn"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={dailyGoal}
                    onChange={(e) => setDailyGoal(e.target.value)}
                    placeholder="20"
                    className="input-field flex-1 text-center text-lg font-semibold"
                    min="1"
                  />
                  <button
                    type="button"
                    onClick={() => setDailyGoal((parseInt(dailyGoal || 0) + 1).toString())}
                    className="counter-btn"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                  Start with a manageable number - you can always adjust this later!
                </p>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!dailyGoal || parseInt(dailyGoal) < 1}
                className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  What's your current follower count?
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  We'll use this as your starting point to track growth
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                  <span className="text-lg">👥</span> Current Followers
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setCurrentFollowers(Math.max(0, parseInt(currentFollowers || 0) - 1).toString())}
                    className="counter-btn"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={currentFollowers}
                    onChange={(e) => setCurrentFollowers(e.target.value)}
                    placeholder="150"
                    className="input-field flex-1 text-center text-lg font-semibold"
                    min="0"
                  />
                  <button
                    type="button"
                    onClick={() => setCurrentFollowers((parseInt(currentFollowers || 0) + 1).toString())}
                    className="counter-btn"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                  Check your Twitter profile for your exact follower count
                </p>
              </div>

              {error && (
                <div style={{ 
                  background: '#FEF2F2', 
                  border: '1px solid #FECACA', 
                  color: '#DC2626',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-4 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={!currentFollowers || parseInt(currentFollowers) < 0 || isLoading}
                  className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Setting up...' : 'Complete Setup 🚀'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <div className="flex justify-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-violet-400' : 'bg-gray-300'}`}></div>
            <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-violet-400' : 'bg-gray-300'}`}></div>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Step {step} of 2
          </p>
        </div>
      </div>
    </div>
  )
}