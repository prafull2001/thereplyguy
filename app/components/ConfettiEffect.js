'use client'

import { useEffect, useState } from 'react'

export default function ConfettiEffect({ trigger, duration = 2000 }) {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (trigger) {
      setIsActive(true)
      const timer = setTimeout(() => {
        setIsActive(false)
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [trigger, duration])

  if (!isActive) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-bounce"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
            fontSize: `${12 + Math.random() * 8}px`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        >
          {['🎉', '🎊', '✨', '🌟', '💫', '⭐'][Math.floor(Math.random() * 6)]}
        </div>
      ))}
    </div>
  )
}