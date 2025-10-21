"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { motion } from "framer-motion"
import { BarChart3, Users, Clock, DollarSign } from "lucide-react"

export default function ProjectDetails({ params }: { params: { id: string } }) {
  const project = {
    id: params.id,
    name: "Medical Imaging Dataset",
    status: "in-progress",
    progress: 65,
    annotators: 45,
    budget: 5000,
    spent: 3250,
    samples: 2847,
    completed: 1850,
    deadline: "2025-12-31",
    description: "Annotation of medical imaging datasets for AI training",
  }

  const stats = [
    { label: "Samples Completed", value: `${project.completed}/${project.samples}`, icon: BarChart3 },
    { label: "Active Annotators", value: project.annotators, icon: Users },
    { label: "Days Remaining", value: "45", icon: Clock },
    { label: "Budget Remaining", value: `${project.budget - project.spent} ASI`, icon: DollarSign },
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
          <h1 className="text-4xl font-bold mb-2 gradient-text">{project.name}</h1>
          <p className="text-foreground/70">{project.description}</p>
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
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className="w-8 h-8 text-blue-400" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Progress Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="glass p-8"
        >
          <h2 className="text-2xl font-bold mb-6">Project Progress</h2>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-foreground/60">Overall Completion</span>
                <span className="text-lg font-bold">{project.progress}%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-4">Budget Allocation</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground/60">Spent</span>
                    <span className="font-semibold">{project.spent} ASI</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground/60">Remaining</span>
                    <span className="font-semibold text-green-400">{project.budget - project.spent} ASI</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                      style={{ width: `${(project.spent / project.budget) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground/60">Deadline</span>
                    <span className="font-semibold">{project.deadline}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground/60">Days Remaining</span>
                    <span className="font-semibold text-blue-400">45 days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
