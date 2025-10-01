'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function FollowerGrowthChart({ data }) {
  // Transform data for the chart
  const chartData = data.map(log => ({
    date: new Date(log.log_date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    followers: log.follower_count,
    fullDate: log.log_date
  }))

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const currentFollowers = payload[0].value
      const currentIndex = chartData.findIndex(item => item.date === label)
      const previousFollowers = currentIndex > 0 ? chartData[currentIndex - 1].followers : currentFollowers
      const growth = currentFollowers - previousFollowers
      
      return (
        <div className="glass-card p-3 shadow-lg">
          <p style={{ color: 'var(--text-primary)' }}>{`Date: ${label}`}</p>
          <p style={{ color: 'var(--accent-secondary)' }}>{`Followers: ${currentFollowers.toLocaleString()}`}</p>
          {currentIndex > 0 && (
            <p style={{ color: growth >= 0 ? 'var(--accent-secondary)' : '#DC2626' }}>
              {growth >= 0 ? '+' : ''}{growth} from previous
            </p>
          )}
        </div>
      )
    }
    return null
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
        <div className="text-center">
          <div className="text-4xl mb-3">📈</div>
          <p>No data yet. Start tracking to see your growth!</p>
        </div>
      </div>
    )
  }

  // Calculate min and max for better Y-axis scaling
  const followerCounts = chartData.map(item => item.followers)
  const minFollowers = Math.min(...followerCounts)
  const maxFollowers = Math.max(...followerCounts)
  const padding = (maxFollowers - minFollowers) * 0.1 || 10

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 127, 168, 0.1)" />
          <XAxis 
            dataKey="date" 
            stroke="var(--text-secondary)"
            fontSize={12}
          />
          <YAxis 
            stroke="var(--text-secondary)"
            fontSize={12}
            domain={[minFollowers - padding, maxFollowers + padding]}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="followers" 
            stroke="#A8C5B5" 
            strokeWidth={3}
            dot={{ fill: '#A8C5B5', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#A8C5B5' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}