"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { motion } from "framer-motion"
import { TrendingUp, BarChart3, PieChart, Activity } from "lucide-react"

export default function ReviewerAnalytics() {
  const metrics = [
    { label: "Total Reviews", value: "2,847", change: "+12%", icon: Activity },
    { label: "Avg Accuracy", value: "98.5%", change: "+2.3%", icon: TrendingUp },
    { label: "Review Time", value: "4.2 min", change: "-0.8 min", icon: BarChart3 },
    { label: "Approval Rate", value: "94.2%", change: "+3.1%", icon: PieChart },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold mb-2 gradient-text">Analytics & Performance</h1>
          <p className="text-foreground/70">Track your review team's performance metrics</p>
        </motion.div>

        {/* Metrics Grid */}
        <div className="grid md:grid-cols-4 gap-6">
          {metrics.map((metric, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="glass p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-foreground/60 text-sm mb-1">{metric.label}</p>
                  <p className="text-3xl font-bold">{metric.value}</p>
                </div>
                <metric.icon className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-sm text-green-400">{metric.change}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="glass p-8 mt-12"
        >
          <h2 className="text-2xl font-bold mb-6">Performance Trends</h2>
          <div className="h-64 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
            <p className="text-foreground/60">Chart visualization would appear here</p>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
