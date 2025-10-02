'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ReplyHistoryChart({ data }) {
  // Transform data for the chart
  const chartData = data.map(log => {
    // Parse the date string as local date to avoid timezone issues
    const [year, month, day] = log.log_date.split('-').map(Number)
    const localDate = new Date(year, month - 1, day)
    
    return {
      date: localDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      replies: log.replies_made,
      goal: log.daily_goal,
      goalMet: log.goal_met
    }
  })

  // Custom tooltip to show if goal was met
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="glass-card p-3 shadow-lg">
          <p style={{ color: 'var(--text-primary)' }}>{`Date: ${label}`}</p>
          <p style={{ color: 'var(--accent-primary)' }}>{`Replies: ${payload[0].value}`}</p>
          <p style={{ color: 'var(--text-secondary)' }}>{`Goal: ${payload[1].value}`}</p>
          <p style={{ color: data.goalMet ? 'var(--accent-secondary)' : '#DC2626' }}>
            {data.goalMet ? '✅ Goal Met' : '❌ Goal Not Met'}
          </p>
        </div>
      )
    }
    return null
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
        <div className="text-center">
          <div className="text-4xl mb-3">📊</div>
          <p>No data yet. Log your first progress to see the magic!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 127, 168, 0.1)" />
          <XAxis 
            dataKey="date" 
            stroke="var(--text-secondary)"
            fontSize={12}
          />
          <YAxis 
            stroke="var(--text-secondary)"
            fontSize={12}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="replies" 
            fill="#8B7FA8" 
            name="Replies Made"
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="goal" 
            fill="#A8C5B5" 
            name="Daily Goal"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}