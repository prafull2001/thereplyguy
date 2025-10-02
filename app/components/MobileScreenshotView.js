'use client'

import Image from 'next/image'

export default function MobileScreenshotView({ 
  todayReplies, 
  dailyGoal, 
  todayFollowers, 
  goalMet, 
  historicalData = [] 
}) {
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

  return (
    <div className="w-full max-w-sm mx-auto bg-stone-50 rounded-3xl overflow-hidden shadow-2xl" style={{ aspectRatio: '9/16' }}>
      {/* Header */}
      <div className="bg-white p-6 text-center border-b" style={{ borderColor: 'var(--accent-primary)' }}>
        <div className="flex items-center justify-center gap-3 mb-3">
          <Image 
            src="/replyguylogo.png" 
            alt="ReplyGuy Logo" 
            width={32} 
            height={32}
            className="rounded-lg"
          />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
            ReplyGuy
          </h1>
        </div>
        <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {dateString}
        </div>
        <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {timeString}
        </div>
      </div>

      {/* Main Stats */}
      <div className="p-6 space-y-6">
        {/* Today's Progress */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Today's Progress</h2>
            {goalMet && (
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium" style={{ background: 'var(--accent-secondary)', color: 'white' }}>
                🎉 Goal Achieved!
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-primary)' }}>
                {todayReplies}
              </div>
              <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Replies Made
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Goal: {dailyGoal}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-secondary)' }}>
                {todayFollowers.toLocaleString()}
              </div>
              <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Followers
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
              <span>Reply Goal Progress ({todayReplies}/{dailyGoal})</span>
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
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 text-center border border-stone-200">
            <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-secondary)' }}>
              {thisWeekGoals}
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              This Week's Goals
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              out of {thisWeekData.length} days
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 text-center border border-stone-200">
            <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-tertiary)' }}>
              {successRate}%
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Success Rate
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {goalsAchieved}/{totalDays} days
            </div>
          </div>
        </div>

        {/* Follower Growth Chart */}
        <div className="bg-white rounded-xl p-4 border border-stone-200">
          <h3 className="text-sm font-bold mb-3 text-center" style={{ color: 'var(--text-primary)' }}>Follower Growth</h3>
          <div className="h-16 flex items-end justify-between gap-1">
            {historicalData.slice(-7).map((log, i) => {
              const maxFollowers = Math.max(...historicalData.slice(-7).map(l => l.follower_count))
              const height = maxFollowers > 0 ? (log.follower_count / maxFollowers) * 100 : 0
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full rounded-t transition-all duration-300"
                    style={{ 
                      height: `${Math.max(height, 10)}%`,
                      background: 'var(--accent-secondary)'
                    }}
                  />
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(log.log_date).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="text-center mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            Last 7 days growth trend
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="bg-white rounded-xl p-4 border border-stone-200">
          <h3 className="text-sm font-bold mb-3 text-center" style={{ color: 'var(--text-primary)' }}>Daily Engagement Heat Map</h3>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 14 }, (_, i) => {
              const date = new Date()
              date.setDate(date.getDate() - (13 - i))
              const dateStr = date.toISOString().split('T')[0]
              const dayData = historicalData.find(log => log.log_date === dateStr)
              
              return (
                <div
                  key={i}
                  className="w-4 h-4 rounded-sm"
                  style={{
                    background: dayData?.goal_met 
                      ? '#22c55e' 
                      : dayData?.replies_made > 0 
                        ? '#a3e635' 
                        : '#e5e7eb'
                  }}
                  title={`${date.toLocaleDateString()}: ${dayData?.replies_made || 0} replies`}
                />
              )
            })}
          </div>
          <div className="flex justify-between items-center mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>2 weeks ago</span>
            <span>Today</span>
          </div>
          <div className="flex justify-center items-center gap-3 mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-green-500"></div>
              <span>Goal met</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-lime-400"></div>
              <span>Active</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-gray-300"></div>
              <span>No activity</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <div className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
            #ReplyGuy #TwitterEngagement
          </div>
        </div>
      </div>
    </div>
  )
}