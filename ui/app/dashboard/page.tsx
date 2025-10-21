"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { TrendingUp, Award, Zap, Target } from "lucide-react"
import { motion } from "framer-motion"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export default function DashboardPage() {
  const earningsData = [
    { date: "Oct 1", earnings: 150 },
    { date: "Oct 5", earnings: 320 },
    { date: "Oct 10", earnings: 480 },
    { date: "Oct 15", earnings: 650 },
    { date: "Oct 20", earnings: 890 },
    { date: "Oct 25", earnings: 1200 },
  ]

  const projectData = [
    { name: "Medical", completed: 45, pending: 12 },
    { name: "Autonomous", completed: 38, pending: 8 },
    { name: "NLP", completed: 52, pending: 5 },
    { name: "E-commerce", completed: 41, pending: 10 },
    { name: "Climate", completed: 28, pending: 15 },
  ]

  const quickStats = [
    { label: "Total Earnings", value: "12,450 ASI", icon: TrendingUp, color: "text-teal-400" },
    { label: "Reputation Score", value: "8,750", icon: Award, color: "text-blue-400" },
    { label: "Active Projects", value: "5", icon: Zap, color: "text-purple-400" },
    { label: "Completion Rate", value: "98.5%", icon: Target, color: "text-green-400" },
  ]

  const recentActivity = [
    { action: "Completed Medical Imaging batch", time: "2 hours ago", icon: "✓" },
    { action: "Earned accuracy bonus", time: "5 hours ago", icon: "⭐" },
    { action: "Reached Gold reputation level", time: "1 day ago", icon: "🏆" },
    { action: "Started NLP annotation project", time: "2 days ago", icon: "📝" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 gradient-text">Your Dashboard</h1>
          <p className="text-foreground/60">Track your progress, earnings, and performance metrics</p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {quickStats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-foreground/60 text-sm mb-2">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Earnings Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8"
          >
            <h2 className="text-xl font-bold mb-6">Earnings Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={earningsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="earnings"
                  stroke="url(#colorGradient)"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", r: 5 }}
                />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" />
                    <stop offset="95%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Projects Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8"
          >
            <h2 className="text-xl font-bold mb-6">Project Progress</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="completed" stackId="a" fill="#14b8a6" />
                <Bar dataKey="pending" stackId="a" fill="#a855f7" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8"
          >
            <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center gap-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg">
                    {activity.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-foreground/60">{activity.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Goals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8"
          >
            <h2 className="text-xl font-bold mb-6">Monthly Goals</h2>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold">Annotations</span>
                  <span className="text-sm text-blue-400">750/1000</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-[75%] bg-gradient-to-r from-blue-500 to-purple-500" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold">Accuracy</span>
                  <span className="text-sm text-teal-400">96.8/98%</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-[98%] bg-gradient-to-r from-teal-500 to-blue-500" />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold">Earnings</span>
                  <span className="text-sm text-purple-400">$6,225/$8,000</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-[77.8%] bg-gradient-to-r from-purple-500 to-pink-500" />
                </div>
              </div>

              <button className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all neon-glow">
                View Detailed Goals
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
