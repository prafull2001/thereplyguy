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
    <div className="w-full max-w-sm mx-auto bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl overflow-hidden shadow-2xl" style={{ aspectRatio: '9/16' }}>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm p-6 text-center border-b border-purple-100">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Image 
            src="/replyguylogo.png" 
            alt="ReplyGuy Logo" 
            width={32} 
            height={32}
            className="rounded-lg"
          />
          <h1 className="text-2xl font-bold text-purple-900">
            ReplyGuy
          </h1>
        </div>
        <div className="text-xs text-purple-600 font-medium">
          {dateString}
        </div>
        <div className="text-lg font-semibold text-purple-800">
          {timeString}
        </div>
      </div>

      {/* Main Stats */}
      <div className="p-6 space-y-6">
        {/* Today's Progress */}
        <div className="bg-white/70 rounded-2xl p-5 backdrop-blur-sm border border-white/50">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Today's Progress</h2>
            {goalMet && (
              <div className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                🎉 Goal Achieved!
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {todayReplies}
              </div>
              <div className="text-xs text-gray-600 font-medium">
                Replies Made
              </div>
              <div className="text-xs text-gray-500">
                Goal: {dailyGoal}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {todayFollowers.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 font-medium">
                Followers
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>{Math.min(Math.round((todayReplies / dailyGoal) * 100), 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((todayReplies / dailyGoal) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Weekly & Overall Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/70 rounded-xl p-4 text-center backdrop-blur-sm border border-white/50">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {thisWeekGoals}
            </div>
            <div className="text-xs text-gray-600 font-medium">
              This Week's Goals
            </div>
            <div className="text-xs text-gray-500">
              out of {thisWeekData.length} days
            </div>
          </div>
          
          <div className="bg-white/70 rounded-xl p-4 text-center backdrop-blur-sm border border-white/50">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {successRate}%
            </div>
            <div className="text-xs text-gray-600 font-medium">
              Success Rate
            </div>
            <div className="text-xs text-gray-500">
              {goalsAchieved}/{totalDays} days
            </div>
          </div>
        </div>

        {/* Mini Calendar Heatmap */}
        <div className="bg-white/70 rounded-xl p-4 backdrop-blur-sm border border-white/50">
          <h3 className="text-sm font-bold text-gray-800 mb-3 text-center">Recent Activity</h3>
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
          <div className="flex justify-center mt-2 text-xs text-gray-500">
            Last 2 weeks
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-2">
            Building mindful engagement habits
          </div>
          <div className="text-xs font-medium text-purple-600">
            #ReplyGuy #TwitterEngagement
          </div>
        </div>
      </div>
    </div>
  )
}