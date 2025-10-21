"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { motion } from "framer-motion"

export default function TeamManagement() {
  const team = [
    {
      id: 1,
      name: "Alice Johnson",
      role: "Senior Reviewer",
      reviews: 1250,
      accuracy: 99.2,
      status: "active",
    },
    {
      id: 2,
      name: "Bob Smith",
      role: "Reviewer",
      reviews: 856,
      accuracy: 98.5,
      status: "active",
    },
    {
      id: 3,
      name: "Carol Davis",
      role: "Reviewer",
      reviews: 642,
      accuracy: 97.8,
      status: "active",
    },
    {
      id: 4,
      name: "David Wilson",
      role: "Junior Reviewer",
      reviews: 234,
      accuracy: 96.1,
      status: "active",
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
          <h1 className="text-4xl font-bold mb-2 gradient-text">Team Management</h1>
          <p className="text-foreground/70">Manage and monitor your review team</p>
        </motion.div>

        {/* Team Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {team.map((member, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="glass p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{member.name}</h3>
                  <p className="text-sm text-foreground/60">{member.role}</p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    member.status === "active" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-foreground/60 mb-1">Reviews Completed</p>
                  <p className="text-2xl font-bold text-blue-400">{member.reviews}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-foreground/60 mb-1">Accuracy Rate</p>
                  <p className="text-2xl font-bold text-green-400">{member.accuracy}%</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
