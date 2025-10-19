"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Search, Filter, Users, Clock, TrendingUp } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("trending")

  const projects = [
    {
      id: 1,
      title: "Medical Image Classification",
      description: "Classify medical imaging datasets for AI training",
      category: "Healthcare",
      difficulty: "Medium",
      reward: "50 ASI",
      annotators: 234,
      progress: 65,
      deadline: "5 days",
      image: "/medical-imaging-dataset.jpg",
    },
    {
      id: 2,
      title: "Autonomous Vehicle Perception",
      description: "Label objects and scenes for self-driving car training",
      category: "Autonomous",
      difficulty: "Hard",
      reward: "100 ASI",
      annotators: 456,
      progress: 42,
      deadline: "10 days",
      image: "/autonomous-vehicle-perception.jpg",
    },
    {
      id: 3,
      title: "Natural Language Processing",
      description: "Annotate text data for NLP model training",
      category: "NLP",
      difficulty: "Easy",
      reward: "25 ASI",
      annotators: 789,
      progress: 88,
      deadline: "2 days",
      image: "/natural-language-processing-text.jpg",
    },
    {
      id: 4,
      title: "E-commerce Product Tagging",
      description: "Tag and categorize product images for retail AI",
      category: "E-commerce",
      difficulty: "Easy",
      reward: "30 ASI",
      annotators: 345,
      progress: 71,
      deadline: "7 days",
      image: "/ecommerce-product-images.jpg",
    },
    {
      id: 5,
      title: "Climate Data Analysis",
      description: "Annotate satellite imagery for climate research",
      category: "Climate",
      difficulty: "Medium",
      reward: "75 ASI",
      annotators: 123,
      progress: 34,
      deadline: "15 days",
      image: "/satellite-climate-imagery.jpg",
    },
    {
      id: 6,
      title: "Facial Recognition Dataset",
      description: "Label facial features and expressions for AI training",
      category: "Computer Vision",
      difficulty: "Medium",
      reward: "60 ASI",
      annotators: 567,
      progress: 56,
      deadline: "8 days",
      image: "/facial-recognition-dataset.jpg",
    },
  ]

  const categories = ["all", "Healthcare", "Autonomous", "NLP", "E-commerce", "Climate", "Computer Vision"]

  const filteredProjects = projects
    .filter((project) => {
      const matchesSearch =
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "all" || project.category === selectedCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      if (sortBy === "trending") return b.annotators - a.annotators
      if (sortBy === "reward") return Number.parseInt(b.reward) - Number.parseInt(a.reward)
      if (sortBy === "deadline") return Number.parseInt(a.deadline) - Number.parseInt(b.deadline)
      return 0
    })

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header Section */}
      <section className="py-12 px-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-4 gradient-text">Annotation Projects</h1>
          <p className="text-foreground/70 mb-8">
            Browse and contribute to AI training datasets. Earn ASI tokens for every annotation.
          </p>

          {/* Search Bar */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" size={20} />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    selectedCategory === category
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white neon-glow"
                      : "bg-white/5 border border-white/10 text-foreground/70 hover:bg-white/10"
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Filter size={20} className="text-foreground/60" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground focus:outline-none focus:border-blue-500/50 transition-colors"
              >
                <option value="trending">Trending</option>
                <option value="reward">Highest Reward</option>
                <option value="deadline">Deadline</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {filteredProjects.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="group"
                >
                  <Link href={`/projects/${project.id}`}>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:border-white/20 h-full flex flex-col overflow-hidden cursor-pointer">
                      {/* Project Image */}
                      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                        <img
                          src={project.image || "/placeholder.svg"}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute top-3 right-3 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs font-semibold text-white">
                          {project.difficulty}
                        </div>
                      </div>

                      {/* Project Info */}
                      <div className="p-6 flex flex-col flex-grow">
                        <div className="mb-3">
                          <span className="text-xs font-semibold text-blue-400 uppercase">{project.category}</span>
                          <h3 className="text-lg font-bold mt-2 group-hover:text-blue-400 transition-colors">
                            {project.title}
                          </h3>
                        </div>

                        <p className="text-sm text-foreground/60 mb-4 flex-grow">{project.description}</p>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-foreground/60">Progress</span>
                            <span className="text-xs font-semibold text-blue-400">{project.progress}%</span>
                          </div>
                          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-white/10">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <TrendingUp size={14} className="text-teal-400" />
                            </div>
                            <p className="text-xs font-semibold text-foreground">{project.reward}</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Users size={14} className="text-blue-400" />
                            </div>
                            <p className="text-xs font-semibold text-foreground">{project.annotators}</p>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Clock size={14} className="text-purple-400" />
                            </div>
                            <p className="text-xs font-semibold text-foreground">{project.deadline}</p>
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
            <div className="text-center py-12">
              <p className="text-foreground/60 text-lg">No projects found matching your criteria.</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
