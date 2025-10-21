"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { motion } from "framer-motion"
import { CheckCircle, AlertCircle, TrendingUp, Users, Award, Clock } from "lucide-react"
import Link from "next/link"

export default function ReviewerDashboard() {
  const stats = [
    { label: "Annotations Reviewed", value: "2,847", icon: CheckCircle, color: "text-blue-400" },
    { label: "Accuracy Rate", value: "98.5%", icon: TrendingUp, color: "text-green-400" },
    { label: "Pending Reviews", value: "156", icon: AlertCircle, color: "text-yellow-400" },
    { label: "Team Members", value: "12", icon: Users, color: "text-purple-400" },
  ]

  const recentReviews = [
    {
      id: 1,
      project: "Medical Imaging Dataset",
      annotator: "John Doe",
      status: "pending",
      accuracy: 96,
      timestamp: "2 hours ago",
    },
    {
      id: 2,
      project: "Autonomous Vehicle Perception",
      annotator: "Jane Smith",
      status: "approved",
      accuracy: 99,
      timestamp: "4 hours ago",
    },
    {
      id: 3,
      project: "NLP Text Classification",
      annotator: "Mike Johnson",
      status: "rejected",
      accuracy: 82,
      timestamp: "6 hours ago",
    },
    {
      id: 4,
      project: "E-commerce Product Images",
      annotator: "Sarah Williams",
      status: "pending",
      accuracy: 94,
      timestamp: "8 hours ago",
    },
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
          <h1 className="text-4xl font-bold mb-2 gradient-text">Reviewer Dashboard</h1>
          <p className="text-foreground/70">Manage quality assurance and review annotations</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="glass p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-foreground/60 text-sm mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Recent Reviews */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="glass p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Recent Reviews</h2>
            <Link href="/reviewer/queue" className="text-blue-400 hover:text-blue-300 text-sm font-semibold">
              View All
            </Link>
          </div>

          <div className="space-y-4">
            {recentReviews.map((review, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{review.project}</h3>
                    <p className="text-sm text-foreground/60">
                      Annotator: {review.annotator} • {review.timestamp}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-foreground/60">Accuracy</p>
                      <p className="text-lg font-bold text-blue-400">{review.accuracy}%</p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        review.status === "approved"
                          ? "bg-green-500/20 text-green-400"
                          : review.status === "rejected"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Link
              href="/reviewer/queue"
              className="glass p-8 text-center hover:bg-white/10 transition-all duration-300 block group"
            >
              <Clock className="w-12 h-12 mx-auto mb-4 text-blue-400 group-hover:text-purple-400 transition-colors" />
              <h3 className="font-semibold mb-2">Review Queue</h3>
              <p className="text-sm text-foreground/60">156 pending reviews</p>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <Link
              href="/reviewer/team"
              className="glass p-8 text-center hover:bg-white/10 transition-all duration-300 block group"
            >
              <Users className="w-12 h-12 mx-auto mb-4 text-purple-400 group-hover:text-blue-400 transition-colors" />
              <h3 className="font-semibold mb-2">Team Management</h3>
              <p className="text-sm text-foreground/60">Manage 12 reviewers</p>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <Link
              href="/reviewer/analytics"
              className="glass p-8 text-center hover:bg-white/10 transition-all duration-300 block group"
            >
              <Award className="w-12 h-12 mx-auto mb-4 text-teal-400 group-hover:text-blue-400 transition-colors" />
              <h3 className="font-semibold mb-2">Analytics</h3>
              <p className="text-sm text-foreground/60">View performance metrics</p>
            </Link>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
