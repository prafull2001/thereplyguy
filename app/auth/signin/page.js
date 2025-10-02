'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '../../../lib/supabaseClient'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Check if already signed in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/')
      }
    }
    checkUser()
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm`
          }
        })

        if (error) {
          setError(error.message)
        } else if (data.user && !data.user.email_confirmed_at) {
          setMessage('Check your email for a verification link! The link will redirect you back to complete setup.')
          setEmail('')
          setPassword('')
        } else {
          // User is confirmed and signed up
          router.push('/')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setError(error.message)
        } else {
          router.push('/')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mb-6">
            <div className="mb-4 flex justify-center">
              <Image 
                src="/replyguylogo.png" 
                alt="Reply Guy Tracker Logo" 
                width={80} 
                height={80}
                className="rounded-lg"
              />
            </div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--accent-primary)' }}>
              Reply Guy Tracker
            </h1>
          </div>
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
            {isSignUp ? 'Create your account' : 'Welcome back!'}
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            {isSignUp ? 'Start tracking your Twitter reply journey' : 'Sign in to continue your progress'}
          </p>
        </div>
        
        <div className="glass-card p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
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

            {message && (
              <div style={{ 
                background: '#F0FDF4', 
                border: '1px solid #BBF7D0', 
                color: '#16A34A',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px'
              }}>
                {message}
              </div>
            )}
            
            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input-field w-full"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="input-field w-full"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full text-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (isSignUp ? 'Creating Account...' : 'Signing In...') : (isSignUp ? 'Create Account' : 'Sign In')}
              </button>
            </div>
            
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError('')
                  setMessage('')
                }}
                className="text-sm font-medium transition-colors hover:opacity-70"
                style={{ color: 'var(--accent-primary)' }}
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}