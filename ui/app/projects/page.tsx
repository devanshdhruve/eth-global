// /app/projects/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Search, Filter, Users, Clock, TrendingUp, Loader2, AlertCircle, Folder, FolderCheck } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

// MODIFIED: Project interface remains the same
interface Project {
  projectId: string
  taskCount: number
  reward: number
  instruction: string
  tasks: Array<{
    taskId: number
    ipfsHash: string
  }>
  timestamp: string
  status: string
  event: string
}

// NEW: State to hold both available and user's projects
interface ProjectLists {
  available: Project[]
  myProjects: Project[]
}

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  // MODIFIED: State to hold the new structure
  const [projects, setProjects] = useState<ProjectLists>({ available: [], myProjects: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // NEW: State for the toggle view
  const [view, setView] = useState<"available" | "myProjects">("available")

  useEffect(() => {
    fetchProjects()
    const interval = setInterval(fetchProjects, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      // MODIFIED: This API endpoint will now return the structured object
      const response = await fetch("/api/projects")
      
      if (!response.ok) {
        throw new Error("Failed to fetch projects")
      }

      const data = await response.json()
      
      // MODIFIED: Check for the new data structure
      if (data.success && data.projects) {
        setProjects(data.projects)
        console.log(`✅ Loaded ${data.projects.available.length} available and ${data.projects.myProjects.length} user projects`)
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

  const getCategoryFromProject = (project: Project): string => {
    return "General" // Placeholder logic
  }

  // MODIFIED: Filter the currently viewed list of projects
  const projectsToDisplay = view === 'available' ? projects.available : projects.myProjects;

  const filteredProjects = projectsToDisplay
    .filter((project) => 
      project.projectId.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "reward") return b.reward - a.reward
      if (sortBy === "tasks") return b.taskCount - a.taskCount
      if (sortBy === "newest") return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      return 0
    })

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="py-12 px-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            {/* MODIFIED: Title changes based on view */}
            <h1 className="text-4xl font-bold gradient-text">
              {view === 'available' ? 'Available Projects' : 'Your Projects'}
            </h1>
            <button
              onClick={fetchProjects}
              disabled={loading}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-300 flex items-center gap-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Loading...</>
              ) : (
                <><TrendingUp size={16} /> Refresh</>
              )}
            </button>
          </div>
          
          <p className="text-foreground/70 mb-8">
            {view === 'available' 
              ? 'Browse live projects. Pass a screening to add them to "Your Projects".'
              : 'These are projects where you have passed the screening.'}
          </p>

          {/* NEW: Toggle Buttons */}
          <div className="flex items-center gap-2 mb-8">
            <button
              onClick={() => setView('available')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                view === 'available' ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <Folder size={16} /> Available
            </button>
            <button
              onClick={() => setView('myProjects')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                view === 'myProjects' ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <FolderCheck size={16} /> Your Projects
            </button>
          </div>

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
              {filteredProjects.length} active {filteredProjects.length === 1 ? "project" : "projects"}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {loading && projects.available.length === 0 && projects.myProjects.length === 0 ? (
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
                    <button onClick={fetchProjects} className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all">
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
                  {/* MODIFIED: The Link now points to the screening page.
                    We pass `projectId` and `instruction` as URL query parameters.
                    `encodeURIComponent` is crucial to ensure the instruction text is safely passed in the URL.
                  */}
                  <Link href={`/projects/screening?projectId=${project.projectId}&instruction=${encodeURIComponent(project.instruction)}`}>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:border-white/20 h-full flex flex-col overflow-hidden cursor-pointer">
                      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center">
                          <div className="text-6xl">📊</div>
                          <div className="absolute top-3 right-3 px-3 py-1 bg-green-500/20 backdrop-blur-sm rounded-full text-xs font-semibold text-green-400 border border-green-500/30">
                              Open
                          </div>
                      </div>
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
                          {/* MODIFIED: The button text makes more sense now */}
                          <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 neon-glow">
                            {view === 'available' ? 'Start Screening' : 'Start Annotating'}
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
                    <p className="text-foreground/60 text-lg mb-2">No projects found in this category</p>
                    <p className="text-foreground/40 text-sm">
                      {view === 'available' ? 'Check back later or switch to "Your Projects".' : 'Pass a screening in "Available Projects" to see them here.'}
                    </p>
                </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  )
}