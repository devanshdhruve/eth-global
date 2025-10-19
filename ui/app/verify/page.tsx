"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CheckCircle, AlertCircle, Clock, BarChart3, Filter } from "lucide-react"
import { motion } from "framer-motion"
import { useState } from "react"

export default function VerifyPage() {
  const [selectedStatus, setSelectedStatus] = useState("all")

  const verificationStats = [
    { label: "Total Submissions", value: "12,450", icon: BarChart3, color: "text-blue-400" },
    { label: "Verified", value: "11,890", icon: CheckCircle, color: "text-teal-400" },
    { label: "Pending Review", value: "450", icon: Clock, color: "text-purple-400" },
    { label: "Disputes", value: "110", icon: AlertCircle, color: "text-red-400" },
  ]

  const submissions = [
    {
      id: 1,
      project: "Medical Image Classification",
      annotator: "Alice Johnson",
      samples: 150,
      accuracy: 98.5,
      status: "verified",
      date: "Oct 15, 2025",
      consensus: 96,
    },
    {
      id: 2,
      project: "Autonomous Vehicle Perception",
      annotator: "Bob Smith",
      samples: 200,
      accuracy: 94.2,
      status: "verified",
      date: "Oct 14, 2025",
      consensus: 92,
    },
    {
      id: 3,
      project: "NLP Dataset",
      annotator: "Carol White",
      samples: 100,
      accuracy: 91.8,
      status: "pending",
      date: "Oct 13, 2025",
      consensus: 88,
    },
    {
      id: 4,
      project: "E-commerce Product Tagging",
      annotator: "David Brown",
      samples: 175,
      accuracy: 89.5,
      status: "disputed",
      date: "Oct 12, 2025",
      consensus: 85,
    },
    {
      id: 5,
      project: "Climate Data Analysis",
      annotator: "Emma Davis",
      samples: 120,
      accuracy: 97.3,
      status: "verified",
      date: "Oct 11, 2025",
      consensus: 95,
    },
  ]

  const filteredSubmissions = submissions.filter((sub) => selectedStatus === "all" || sub.status === selectedStatus)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-teal-500/20 text-teal-400 border-teal-500/30"
      case "pending":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      case "disputed":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-white/5 text-foreground/60"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 gradient-text">Data Verification</h1>
          <p className="text-foreground/60">Review and validate annotation submissions for quality assurance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {verificationStats.map((stat, i) => (
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
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-8 flex items-center gap-4">
          <Filter size={20} className="text-foreground/60" />
          <div className="flex flex-wrap gap-2">
            {["all", "verified", "pending", "disputed"].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedStatus === status
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white neon-glow"
                    : "bg-white/5 border border-white/10 text-foreground/70 hover:bg-white/10"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground/60">Project</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground/60">Annotator</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground/60">Samples</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground/60">Accuracy</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground/60">Consensus</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground/60">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground/60">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((sub, i) => (
                  <motion.tr
                    key={sub.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium">{sub.project}</td>
                    <td className="px-6 py-4 text-sm">{sub.annotator}</td>
                    <td className="px-6 py-4 text-sm">{sub.samples}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="text-blue-400 font-semibold">{sub.accuracy}%</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                            style={{ width: `${sub.consensus}%` }}
                          />
                        </div>
                        <span className="text-foreground/60">{sub.consensus}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(sub.status)}`}
                      >
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-500/30 transition-colors">
                        Review
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
