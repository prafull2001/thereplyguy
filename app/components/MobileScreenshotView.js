'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function MobileScreenshotView({ 
  todayReplies, 
  dailyGoal, 
  todayFollowers, 
  goalMet, 
  historicalData = [] 
}) {
  const [copied, setCopied] = useState(false)
  const now = new Date()
  const timeString = now.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
  const dateString = now.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  })

  const goalsAchieved = historicalData.filter(log => log.goal_met).length
  const totalDays = historicalData.length
  const successRate = totalDays > 0 ? Math.round((goalsAchieved / totalDays) * 100) : 0

  // Calculate this week's progress
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const thisWeekData = historicalData.filter(log => 
    new Date(log.log_date) >= oneWeekAgo
  )
  const thisWeekGoals = thisWeekData.filter(log => log.goal_met).length

  // Calculate previous followers (from yesterday or last available data)
  const previousFollowers = historicalData.length > 1 
    ? historicalData[historicalData.length - 2]?.follower_count || todayFollowers
    : todayFollowers

  // Generate copy text
  const generateCopyText = () => {
    return `🔥 Day ${totalDays} of growing my followers.
Today's Reply Goal: ${todayReplies}/${dailyGoal}
Followers: ${previousFollowers.toLocaleString()} → ${todayFollowers.toLocaleString()}
#ReplyGuy #TwitterEngagement #bethereplyguy`
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

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      {/* Main Screenshot Container */}
      <div className="bg-stone-50 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-white p-3 text-center border-b" style={{ borderColor: 'var(--accent-primary)' }}>
          <div className="flex items-center justify-center gap-3 mb-3">
            <Image 
              src="/replyguylogo.png" 
              alt="ReplyGuy Logo" 
              width={40} 
              height={40}
              className="rounded-lg"
            />
            <h1 className="text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>
              ReplyGuy
            </h1>
          </div>
          <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {dateString}
          </div>
          <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {timeString}
          </div>
          <div className="text-sm font-medium mt-2" style={{ color: 'var(--text-secondary)' }}>
            Time to be the ReplyGuy 😎
          </div>
        </div>

        {/* Main Stats */}
        <div className="p-3 space-y-3">
          {/* Today's Progress */}
          <div className="bg-white rounded-2xl p-3 border border-stone-200">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>📊 Today's Progress</h2>
              {goalMet && (
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium" style={{ background: 'var(--accent-secondary)', color: 'white' }}>
                  🎉 Goal Achieved!
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold mb-1" style={{ color: 'var(--accent-primary)' }}>
                  {todayReplies}
                </div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  💬 <span className="font-bold text-base" style={{ color: 'var(--accent-primary)' }}>Replies</span> Made
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  🎯 Goal: {dailyGoal}
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-1" style={{ color: 'var(--accent-secondary)' }}>
                  {todayFollowers.toLocaleString()}
                </div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  👥 Followers
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                <span>Daily Reply Goal Progress ({todayReplies}/{dailyGoal})</span>
                <span>{Math.min(Math.round((todayReplies / dailyGoal) * 100), 100)}%</span>
              </div>
              <div className="w-full rounded-full h-2" style={{ background: 'var(--bg-primary)' }}>
                <div 
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min((todayReplies / dailyGoal) * 100, 100)}%`,
                    background: 'var(--accent-primary)'
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Weekly & Overall Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-xl p-3 text-center border border-stone-200">
              <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-secondary)' }}>
                {thisWeekGoals}
              </div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                📅 This Week's Goals
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                out of {thisWeekData.length} days
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-3 text-center border border-stone-200">
              <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-tertiary)' }}>
                {successRate}%
              </div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                🏆 Success Rate
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {goalsAchieved}/{totalDays} days
              </div>
            </div>
          </div>

          {/* Follower Growth Chart */}
          <div className="bg-white rounded-xl p-3 border border-stone-200">
            <h3 className="text-base font-bold mb-2 text-center" style={{ color: 'var(--text-primary)' }}>📈 Follower Growth</h3>
            <div className="h-16 relative">
              <svg width="100%" height="100%" viewBox="0 0 280 64" className="overflow-visible">
                {(() => {
                  const chartData = historicalData.slice(-7)
                  if (chartData.length === 0) return null
                  
                  const maxFollowers = Math.max(...chartData.map(l => l.follower_count))
                  const minFollowers = Math.min(...chartData.map(l => l.follower_count))
                  const range = maxFollowers - minFollowers || 1
                  
                  const points = chartData.map((log, i) => {
                    const x = (i / (chartData.length - 1)) * 240 + 20
                    const y = 48 - ((log.follower_count - minFollowers) / range) * 32
                    return `${x},${y}`
                  }).join(' ')
                  
                  return (
                    <>
                      {/* Grid lines */}
                      <defs>
                        <pattern id="grid" width="40" height="10" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 10" fill="none" stroke="#f3f4f6" strokeWidth="0.5"/>
                        </pattern>
                      </defs>
                      <rect width="240" height="32" x="20" y="16" fill="url(#grid)" />
                      
                      {/* Y-axis labels */}
                      <text x="15" y="20" fontSize="8" fill="var(--text-secondary)" textAnchor="end">
                        {maxFollowers.toLocaleString()}
                      </text>
                      <text x="15" y="36" fontSize="8" fill="var(--text-secondary)" textAnchor="end">
                        {Math.round((maxFollowers + minFollowers) / 2).toLocaleString()}
                      </text>
                      <text x="15" y="52" fontSize="8" fill="var(--text-secondary)" textAnchor="end">
                        {minFollowers.toLocaleString()}
                      </text>
                      
                      {/* Line */}
                      <polyline
                        fill="none"
                        stroke="var(--accent-secondary)"
                        strokeWidth="2.5"
                        points={points}
                      />
                      {/* Points */}
                      {chartData.map((log, i) => {
                        const x = (i / (chartData.length - 1)) * 240 + 20
                        const y = 48 - ((log.follower_count - minFollowers) / range) * 32
                        return (
                          <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="3"
                            fill="var(--accent-secondary)"
                            stroke="white"
                            strokeWidth="1"
                          />
                        )
                      })}
                    </>
                  )
                })()}
              </svg>
              {/* Day labels - only show first, middle, and last */}
              <div className="flex justify-between absolute bottom-0 left-0 right-0 px-5">
                {historicalData.slice(-7).map((log, i, arr) => {
                  // Only show labels for first, middle, and last points to avoid clutter
                  const showLabel = i === 0 || i === Math.floor(arr.length / 2) || i === arr.length - 1
                  return (
                    <div key={i} className="text-xs flex-1 text-center" style={{ color: showLabel ? 'var(--text-secondary)' : 'transparent' }}>
                      {showLabel ? (() => {
                        // Parse date as local to avoid timezone issues
                        const [year, month, day] = log.log_date.split('-').map(Number)
                        const localDate = new Date(year, month - 1, day)
                        return localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      })() : ''}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="text-center mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {historicalData.length > 0 && (
                <>
                  {historicalData[historicalData.length - 1]?.follower_count?.toLocaleString() || 0} followers 
                  {historicalData.length > 6 && (
                    <span> (+{(historicalData[historicalData.length - 1]?.follower_count || 0) - (historicalData[historicalData.length - 7]?.follower_count || 0)} this week)</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer inside screenshot container */}
        <div className="text-center pb-3 space-y-2">
          <div className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
            #ReplyGuy #TwitterEngagement #bethereplyguy
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>𝕏 @prafull_truffle</span>
            <span>•</span>
            <span>🌐 prafullsharma.me</span>
            <span>•</span>
            <span>✉️ sharmaprafull76@gmail.com</span>
          </div>
        </div>
      </div>

      {/* Copy Text Feature - Completely separate from screenshot container */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-3 border border-purple-200 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            📝 Share Your Progress
          </h3>
          <button
            onClick={handleCopyText}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-all duration-200 ${
              copied 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200'
            }`}
          >
            {copied ? '✅ Copied!' : '📋 Copy'}
          </button>
        </div>
        <div className="bg-white rounded-lg p-2 border border-gray-200">
          <pre className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {generateCopyText()}
          </pre>
        </div>
      </div>
    </div>
  )
}