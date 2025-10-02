'use client'

import { useState, useMemo } from 'react'

export default function MonthlyCalendar({ data = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const { monthDays, monthName, year, prevMonth, nextMonth } = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    // Create array of days
    const days = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayData = data.find(log => log.log_date === dateStr)
      
      days.push({
        day,
        date: dateStr,
        goalMet: dayData?.goal_met || false,
        repliesMade: dayData?.replies_made || 0,
        hasData: !!dayData
      })
    }
    
    return {
      monthDays: days,
      monthName: firstDay.toLocaleDateString('en-US', { month: 'long' }),
      year: year,
      prevMonth: () => setCurrentDate(new Date(year, month - 1, 1)),
      nextMonth: () => setCurrentDate(new Date(year, month + 1, 1))
    }
  }, [currentDate, data])
  
  const today = new Date().toISOString().split('T')[0]
  
  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📅</span>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Monthly Progress
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-lg border border-gray-300 hover:border-gray-400 flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            ←
          </button>
          <div className="text-lg font-medium min-w-[120px] text-center" style={{ color: 'var(--text-primary)' }}>
            {monthName} {year}
          </div>
          <button
            onClick={nextMonth}
            className="w-8 h-8 rounded-lg border border-gray-300 hover:border-gray-400 flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            →
          </button>
        </div>
      </div>
      
      {/* Calendar Description */}
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        Track your daily engagement goals • Green = Goal achieved • Light = Activity • Gray = No data
      </p>
      
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-medium py-2" style={{ color: 'var(--text-secondary)' }}>
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((dayData, index) => (
          <div key={index} className="aspect-square relative">
            {dayData && (
              <div
                className={`
                  w-full h-full rounded-lg flex items-center justify-center text-sm font-medium transition-all
                  ${dayData.date === today ? 'ring-2 ring-offset-1' : ''}
                  ${dayData.goalMet ? 'text-white' : dayData.hasData ? 'text-gray-700' : 'text-gray-400'}
                  hover:scale-105 cursor-pointer
                `}
                style={{
                  background: dayData.goalMet 
                    ? 'var(--accent-secondary)' 
                    : dayData.hasData 
                      ? 'rgba(168, 197, 181, 0.2)' 
                      : 'rgba(104, 112, 123, 0.1)',
                  ringColor: dayData.date === today ? 'var(--accent-primary)' : 'transparent'
                }}
                title={dayData.hasData ? `${dayData.repliesMade} replies ${dayData.goalMet ? '(Goal met!)' : ''}` : 'No activity'}
              >
                {dayData.day}
                {dayData.hasData && (
                  <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-current opacity-60"></div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ background: 'var(--accent-secondary)' }}></div>
          <span>Goal achieved</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ background: 'rgba(168, 197, 181, 0.2)' }}></div>
          <span>Activity</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ background: 'rgba(104, 112, 123, 0.1)' }}></div>
          <span>No data</span>
        </div>
      </div>
    </div>
  )
}