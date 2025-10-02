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
    <div className="glass-card p-4 max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Monthly Progress
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="w-6 h-6 rounded border border-gray-300 hover:border-gray-400 flex items-center justify-center transition-colors text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            ←
          </button>
          <div className="text-xs font-medium min-w-[80px] text-center" style={{ color: 'var(--text-primary)' }}>
            {monthName} {year}
          </div>
          <button
            onClick={nextMonth}
            className="w-6 h-6 rounded border border-gray-300 hover:border-gray-400 flex items-center justify-center transition-colors text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            →
          </button>
        </div>
      </div>
      
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
          <div key={day} className="text-center text-xs font-medium py-1" style={{ color: 'var(--text-secondary)' }}>
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 mb-3">
        {monthDays.map((dayData, index) => (
          <div key={index} className="w-3 h-3 relative">
            {dayData && (
              <div
                className={`
                  w-full h-full rounded-sm flex items-center justify-center transition-all
                  ${dayData.date === today ? 'ring-1 ring-offset-0' : ''}
                  hover:scale-110 cursor-pointer
                `}
                style={{
                  background: dayData.goalMet 
                    ? '#22c55e' 
                    : dayData.hasData 
                      ? '#a3e635' 
                      : '#e5e7eb',
                  ringColor: dayData.date === today ? 'var(--accent-primary)' : 'transparent'
                }}
                title={dayData.hasData ? `${dayData.repliesMade} replies ${dayData.goalMet ? '(Goal met!)' : ''}` : 'No activity'}
              >
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm" style={{ background: '#22c55e' }}></div>
          <span>Goal</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm" style={{ background: '#a3e635' }}></div>
          <span>Active</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm" style={{ background: '#e5e7eb' }}></div>
          <span>None</span>
        </div>
      </div>
    </div>
  )
}