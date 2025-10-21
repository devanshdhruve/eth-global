"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { motion } from "framer-motion"
import { CheckCircle, XCircle, AlertCircle, ChevronRight } from "lucide-react"
import { useState } from "react"

export default function ReviewQueue() {
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")

  const reviews = [
    {
      id: 1,
      project: "Medical Imaging Dataset",
      annotator: "John Doe",
      samples: 45,
      accuracy: 96,
      status: "pending",
      timestamp: "2 hours ago",
    },
    {
      id: 2,
      project: "Autonomous Vehicle Perception",
      annotator: "Jane Smith",
      samples: 32,
      accuracy: 99,
      status: "pending",
      timestamp: "3 hours ago",
    },
    {
      id: 3,
      project: "NLP Text Classification",
      annotator: "Mike Johnson",
      samples: 28,
      accuracy: 94,
      status: "pending",
      timestamp: "5 hours ago",
    },
    {
      id: 4,
      project: "E-commerce Product Images",
      annotator: "Sarah Williams",
      samples: 56,
      accuracy: 97,
      status: "pending",
      timestamp: "7 hours ago",
    },
  ]

  const filteredReviews = reviews.filter((r) => filter === "all" || r.status === filter)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 gradient-text">Review Queue</h1>
          <p className="text-foreground/70">Review and validate annotations from annotators</p>
        </motion.div>

        {/* Filters */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          {["all", "pending", "approved", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all duration-300 ${
                filter === f
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white neon-glow"
                  : "bg-white/5 border border-white/10 hover:bg-white/10"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {filteredReviews.map((review, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="glass p-6 hover:bg-white/10 transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{review.project}</h3>
                  <div className="flex items-center gap-4 text-sm text-foreground/60">
                    <span>Annotator: {review.annotator}</span>
                    <span>Samples: {review.samples}</span>
                    <span>{review.timestamp}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-foreground/60 mb-1">Accuracy</p>
                    <p className="text-2xl font-bold text-blue-400">{review.accuracy}%</p>
                  </div>

                  <div className="flex gap-2">
                    <button className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all duration-300">
                      <CheckCircle size={20} />
                    </button>
                    <button className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all duration-300">
                      <XCircle size={20} />
                    </button>
                    <button className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-all duration-300">
                      <AlertCircle size={20} />
                    </button>
                  </div>

                  <ChevronRight className="w-5 h-5 text-foreground/40 group-hover:text-blue-400 transition-colors" />
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
