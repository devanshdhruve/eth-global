"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { motion } from "framer-motion"
import { BarChart3, Users, DollarSign, Plus, TrendingUp } from "lucide-react"
import Link from "next/link"

export default function ClientDashboard() {
  const stats = [
    { label: "Active Projects", value: "8", icon: BarChart3, color: "text-blue-400" },
    { label: "Total Annotators", value: "342", icon: Users, color: "text-purple-400" },
    { label: "Spent (ASI)", value: "12,450", icon: DollarSign, color: "text-green-400" },
    { label: "Completion Rate", value: "94.2%", icon: TrendingUp, color: "text-teal-400" },
  ]

  const projects = [
    {
      id: 1,
      name: "Medical Imaging Dataset",
      status: "in-progress",
      progress: 65,
      annotators: 45,
      budget: 5000,
      spent: 3250,
    },
    {
      id: 2,
      name: "Autonomous Vehicle Perception",
      status: "completed",
      progress: 100,
      annotators: 32,
      budget: 4000,
      spent: 4000,
    },
    {
      id: 3,
      name: "NLP Text Classification",
      status: "in-progress",
      progress: 42,
      annotators: 28,
      budget: 3000,
      spent: 1260,
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
          className="flex items-center justify-between mb-12"
        >
          <div>
            <h1 className="text-4xl font-bold mb-2 gradient-text">Client Dashboard</h1>
            <p className="text-foreground/70">Manage your annotation projects and datasets</p>
          </div>
          <Link
            href="/client/create-project"
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 flex items-center gap-2 neon-glow"
          >
            <Plus size={20} /> New Project
          </Link>
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

        {/* Projects Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="glass p-8"
        >
          <h2 className="text-2xl font-bold mb-6">Your Projects</h2>

          <div className="space-y-4">
            {projects.map((project, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{project.name}</h3>
                    <p className="text-sm text-foreground/60">
                      {project.annotators} annotators • Budget: {project.budget} ASI
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      project.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {project.status === "completed" ? "Completed" : "In Progress"}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-foreground/60">Progress</span>
                    <span className="text-sm font-semibold">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/60">
                    Spent: {project.spent} / {project.budget} ASI
                  </span>
                  <Link
                    href={`/client/project/${project.id}`}
                    className="text-blue-400 hover:text-blue-300 text-sm font-semibold"
                  >
                    View Details
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
