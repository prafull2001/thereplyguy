'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '../../../lib/supabaseClient'

function ConfirmEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('confirming')
  const [message, setMessage] = useState('Confirming your email...')

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const token_hash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        const access_token = searchParams.get('access_token')
        const refresh_token = searchParams.get('refresh_token')
        
        // Log all possible parameters
        console.log('All URL params:', Object.fromEntries(searchParams.entries()))
        console.log('Confirmation params:', { token_hash: !!token_hash, type, access_token: !!access_token, refresh_token: !!refresh_token })

        // Try different confirmation methods based on what we receive
        if (token_hash && type) {
          // New style confirmation with token_hash
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type
          })

          if (error) {
            console.error('Token hash confirmation error:', error)
            setStatus('error')
            setMessage('Email confirmation failed. Please try signing up again.')
          } else {
            console.log('Email confirmed successfully:', data)
            setStatus('success')
            setMessage('Email confirmed successfully! Redirecting...')
            
            setTimeout(() => {
              router.push('/')
            }, 2000)
          }
        } else if (access_token && refresh_token) {
          // Older style confirmation with access/refresh tokens
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          })

          if (error) {
            console.error('Session confirmation error:', error)
            setStatus('error')
            setMessage('Email confirmation failed. Please try signing up again.')
          } else {
            console.log('Session set successfully:', data)
            setStatus('success')
            setMessage('Email confirmed successfully! Redirecting...')
            
            setTimeout(() => {
              router.push('/')
            }, 2000)
          }
        } else {
          // Try to handle it as a general callback
          const { data, error } = await supabase.auth.getSession()
          
          if (data.session) {
            console.log('Found existing session:', data.session)
            setStatus('success')
            setMessage('Email confirmed successfully! Redirecting...')
            
            setTimeout(() => {
              router.push('/')
            }, 2000)
          } else {
            console.log('No valid confirmation parameters found')
            setStatus('error')
            setMessage('Invalid confirmation link. Please try signing up again.')
          }
        }
      } catch (err) {
        console.error('Confirmation error:', err)
        setStatus('error')
        setMessage('An error occurred during confirmation.')
      }
    }

    confirmEmail()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="mb-4 flex justify-center">
            <Image 
              src="/replyguylogo.png" 
              alt="Reply Guy Tracker Logo" 
              width={80} 
              height={80}
              className="rounded-lg"
            />
          </div>
          <div className="text-6xl mb-4">
            {status === 'confirming' && '⏳'}
            {status === 'success' && '✅'}
            {status === 'error' && '❌'}
          </div>
          <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--accent-primary)' }}>
            {status === 'confirming' && 'Confirming Email'}
            {status === 'success' && 'Email Confirmed!'}
            {status === 'error' && 'Confirmation Failed'}
          </h1>
        </div>
        
        <div className="glass-card p-8">
          <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
            {message}
          </p>
          
          {status === 'error' && (
            <button
              onClick={() => router.push('/auth/signin')}
              className="btn-primary w-full"
            >
              Back to Sign In
            </button>
          )}
          
          {status === 'success' && (
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              You will be redirected automatically...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ConfirmEmail() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    }>
      <ConfirmEmailContent />
    </Suspense>
  )
}