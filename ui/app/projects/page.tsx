"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Search, Filter, Users, Clock, TrendingUp, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

interface Project {
  projectId: string
  taskCount: number
  reward: number
  tasks: Array<{
    taskId: number
    ipfsHash: string
  }>
  timestamp: string
  status: string
  event: string
}

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("trending")
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch projects from HCS
  useEffect(() => {
    fetchProjects()
    // Poll for new projects every 30 seconds
    const interval = setInterval(fetchProjects, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/projects") // or /api/projects
      
      if (!response.ok) {
        throw new Error("Failed to fetch projects")
      }

      const data = await response.json()
      
      if (data.success && data.projects) {
        setProjects(data.projects)
        console.log(`✅ Loaded ${data.projects.length} open projects`)
      } else {
        throw new Error(data.error || "No projects found")
      }
    } catch (err: any) {
      console.error("Error fetching projects:", err)
      setError(err.message || "Failed to load projects")
    } finally {
      setLoading(false)
    }
  }

  const categories = ["all", "Healthcare", "Autonomous", "NLP", "E-commerce", "Climate", "Computer Vision"]

  // Helper to determine category from projectId or default
  const getCategoryFromProject = (project: Project): string => {
    // You can implement logic to extract category from projectId or metadata
    // For now, return a default
    return "General"
  }

  const filteredProjects = projects
    .filter((project) => {
      const matchesSearch = project.projectId.toLowerCase().includes(searchQuery.toLowerCase())
      const category = getCategoryFromProject(project)
      const matchesCategory = selectedCategory === "all" || category === selectedCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      if (sortBy === "reward") return b.reward - a.reward
      if (sortBy === "tasks") return b.taskCount - a.taskCount
      if (sortBy === "newest") return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      return 0
    })

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header Section */}
      <section className="py-12 px-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold gradient-text">Available Projects</h1>
            <button
              onClick={fetchProjects}
              disabled={loading}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-300 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <TrendingUp size={16} />
                  Refresh
                </>
              )}
            </button>
          </div>
          
          <p className="text-foreground/70 mb-8">
            Browse live projects from Hedera Consensus Service. Earn HBAR tokens for every annotation.
          </p>

          {/* Search Bar */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" size={20} />
            <input
              type="text"
              placeholder="Search projects by ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-foreground/60" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground focus:outline-none focus:border-blue-500/50 transition-colors"
              >
                <option value="newest">Newest First</option>
                <option value="reward">Highest Reward</option>
                <option value="tasks">Most Tasks</option>
              </select>
            </div>

            <div className="text-sm text-foreground/60">
              {projects.length} active {projects.length === 1 ? "project" : "projects"}
            </div>
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {loading && projects.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 size={48} className="animate-spin mx-auto mb-4 text-blue-400" />
                <p className="text-foreground/60">Loading projects from Hedera...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center bg-red-500/10 border border-red-500/20 rounded-lg p-8 max-w-md">
                <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
                <p className="text-red-400 font-semibold mb-2">Failed to load projects</p>
                <p className="text-foreground/60 text-sm mb-4">{error}</p>
                <button
                  onClick={fetchProjects}
                  className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : filteredProjects.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project, i) => (
                <motion.div
                  key={project.projectId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="group"
                >
                  <Link href={`/projects/${project.projectId}`}>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:border-white/20 h-full flex flex-col overflow-hidden cursor-pointer">
                      {/* Project Header */}
                      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
                        <div className="text-6xl">📊</div>
                        <div className="absolute top-3 right-3 px-3 py-1 bg-green-500/20 backdrop-blur-sm rounded-full text-xs font-semibold text-green-400 border border-green-500/30">
                          Open
                        </div>
                      </div>

                      {/* Project Info */}
                      <div className="p-6 flex flex-col flex-grow">
                        <div className="mb-3">
                          <span className="text-xs font-semibold text-blue-400 uppercase">
                            {getCategoryFromProject(project)}
                          </span>
                          <h3 className="text-lg font-bold mt-2 group-hover:text-blue-400 transition-colors">
                            {project.projectId}
                          </h3>
                        </div>

                        <p className="text-sm text-foreground/60 mb-4 flex-grow">
                          Annotation project with {project.taskCount} tasks
                        </p>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-white/10">
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <TrendingUp size={14} className="text-teal-400" />
                              <span className="text-xs text-foreground/60">Reward</span>
                            </div>
                            <p className="text-sm font-semibold text-foreground">{project.reward} HBAR</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <Users size={14} className="text-blue-400" />
                              <span className="text-xs text-foreground/60">Tasks</span>
                            </div>
                            <p className="text-sm font-semibold text-foreground">{project.taskCount}</p>
                          </div>
                        </div>

                        {/* IPFS Info */}
                        <div className="mb-4 text-xs">
                          <p className="text-foreground/60 mb-1">Task Data on IPFS:</p>
                          <div className="bg-white/5 rounded px-2 py-1 font-mono text-blue-400 truncate">
                            {project.tasks?.[0]?.ipfsHash || "N/A"}
                          </div>
                        </div>

                        {/* CTA Button */}
                        <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 neon-glow">
                          Start Annotating
                        </button>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="bg-white/5 border border-white/10 rounded-lg p-12 max-w-md mx-auto">
                <p className="text-foreground/60 text-lg mb-2">No projects available</p>
                <p className="text-foreground/40 text-sm">Check back later or create a new project</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
