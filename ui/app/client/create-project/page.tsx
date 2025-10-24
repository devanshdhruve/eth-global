"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { Upload, ArrowRight, CheckCircle2 } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

interface Task {
  id: number
  raw: any
  ipfsHash: string
  status: "pending" | "uploading" | "uploaded" | "failed"
}

export default function CreateProject() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    projectName: "",
    description: "",
    category: "",
    budget: "",
    annotators: "",
    deadline: "",
    reward: "", // Added reward field
  })
  const [tasks, setTasks] = useState<Task[]>([])
  const [uploading, setUploading] = useState(false)
  const [filesUploaded, setFilesUploaded] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [projectCreated, setProjectCreated] = useState(false)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handlePrev = () => {
    if (step > 1) setStep(step - 1)
  }

  // -----------------------------
  // Step 3: File Upload Handler
  // -----------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setTasks([])
    setFilesUploaded(false)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append("file", file)
      formDataToSend.append(
        "projectId",
        formData.projectName || `project-${Date.now()}`
      )
      // Send reward with the file upload
      formDataToSend.append("reward", formData.reward || "0")

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formDataToSend,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `Upload failed: ${res.statusText}`)
      }

      const data = await res.json()

      // Map backend tasks to frontend state
      const mappedTasks: Task[] = data.tasks.map((t: any, i: number) => ({
        id: i + 1,
        raw: t.raw || t.data,
        ipfsHash: t.ipfsHash || t.cid,
        status: (t.ipfsHash || t.cid) ? "uploaded" : "failed",
      }))

      setTasks(mappedTasks)
      setFilesUploaded(true)
      
      // If the backend already created the project, mark it as created
      if (data.success && data.project) {
        setProjectCreated(true)
      }
    } catch (err: any) {
      console.error("Upload failed", err)
      alert("Upload failed: " + err.message)
    } finally {
      setUploading(false)
    }
  }

  // -----------------------------
  // Create Project Handler
  // -----------------------------
  const handleCreateProject = async () => {
    if (!filesUploaded || tasks.length === 0) {
      alert("Please upload files first")
      return
    }

    setCreatingProject(true)

    try {
      // If your backend already creates the project during upload,
      // you might not need this. Otherwise, send a separate request:
      const res = await fetch("/api/create-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: formData.projectName || `project-${Date.now()}`,
          projectName: formData.projectName,
          description: formData.description,
          category: formData.category,
          budget: parseFloat(formData.budget) || 0,
          annotators: parseInt(formData.annotators) || 0,
          deadline: formData.deadline,
          reward: parseFloat(formData.reward) || 0,
          tasks: tasks.map(t => ({
            taskId: t.id,
            ipfsHash: t.ipfsHash,
          })),
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to create project")
      }

      const data = await res.json()
      console.log("Project created:", data)

      setProjectCreated(true)
      alert("Project created successfully!")
      
      // Optionally redirect to project page
      // window.location.href = `/projects/${data.project.projectId}`
    } catch (err: any) {
      console.error("Failed to create project", err)
      alert("Failed to create project: " + err.message)
    } finally {
      setCreatingProject(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold mb-2 gradient-text">Create New Project</h1>
          <p className="text-foreground/70">Set up your annotation project in 3 steps</p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  s <= step
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                    : "bg-white/10 text-foreground/60"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 transition-all duration-300 ${
                    s < step ? "bg-gradient-to-r from-blue-500 to-purple-500" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass p-8"
        >
          {/* Step 1: Project Details */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Project Details</h2>
              <div>
                <label className="block text-sm font-medium mb-2">Project Name</label>
                <input
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleInputChange}
                  placeholder="e.g., Medical Imaging Dataset"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder-foreground/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your annotation project..."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder-foreground/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                >
                  <option value="">Select a category</option>
                  <option value="image">Image Annotation</option>
                  <option value="text">Text Annotation</option>
                  <option value="audio">Audio Annotation</option>
                  <option value="video">Video Annotation</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Budget & Resources */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Budget & Resources</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Budget (ASI Tokens)</label>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleInputChange}
                    placeholder="e.g., 5000"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder-foreground/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Reward per Task (HBAR)</label>
                  <input
                    type="number"
                    name="reward"
                    value={formData.reward}
                    onChange={handleInputChange}
                    placeholder="e.g., 100"
                    step="0.01"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder-foreground/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Number of Annotators</label>
                  <input
                    type="number"
                    name="annotators"
                    value={formData.annotators}
                    onChange={handleInputChange}
                    placeholder="e.g., 50"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground placeholder-foreground/40 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Deadline</label>
                  <input
                    type="date"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Upload Dataset */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Upload Dataset</h2>

              <div className="relative border-2 border-dashed border-white/20 rounded-lg p-12 text-center hover:border-blue-500/50 transition-all duration-300 cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                <h3 className="text-lg font-semibold mb-2">Upload your dataset</h3>
                <p className="text-foreground/60 mb-4">Drag and drop your files or click to browse</p>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={uploading || filesUploaded}
                />
                <button
                  className="px-6 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading || filesUploaded}
                >
                  {uploading ? "Uploading..." : filesUploaded ? "Files Uploaded ✓" : "Choose Files"}
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-sm text-foreground/60">
                  Supported formats: CSV, JSON • Max file size: 500MB
                </p>
              </div>

              {/* Display uploaded tasks */}
              {tasks.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold">Uploaded Tasks</h4>
                    <span className="text-sm text-green-400 flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      {tasks.length} tasks uploaded
                    </span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <ul className="space-y-2">
                      {tasks.map((t) => (
                        <li key={t.id} className="text-sm text-foreground/80 flex items-center justify-between">
                          <span>Task {t.id}</span>
                          <span className="text-xs font-mono text-blue-400">{t.ipfsHash.substring(0, 12)}...</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Project Summary before creation */}
              {filesUploaded && !projectCreated && (
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6 mt-6">
                  <h4 className="text-lg font-semibold mb-4">Project Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-foreground/60">Project Name:</span>
                      <p className="font-semibold">{formData.projectName}</p>
                    </div>
                    <div>
                      <span className="text-foreground/60">Category:</span>
                      <p className="font-semibold">{formData.category}</p>
                    </div>
                    <div>
                      <span className="text-foreground/60">Total Tasks:</span>
                      <p className="font-semibold">{tasks.length}</p>
                    </div>
                    <div>
                      <span className="text-foreground/60">Reward:</span>
                      <p className="font-semibold">{formData.reward} HBAR</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success message */}
              {projectCreated && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 mt-6 text-center">
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-400" />
                  <h4 className="text-xl font-semibold mb-2">Project Created Successfully!</h4>
                  <p className="text-foreground/60">Your project has been submitted to the Hedera network</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-8 border-t border-white/10">
            <button
              onClick={handlePrev}
              disabled={step === 1}
              className="px-6 py-2 border border-white/20 rounded-lg font-semibold hover:bg-white/5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="text-sm text-foreground/60">Step {step} of 3</div>

            {step < 3 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 flex items-center gap-2 neon-glow"
              >
                Next <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleCreateProject}
                disabled={!filesUploaded || creatingProject || projectCreated}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 neon-glow"
              >
                {creatingProject ? (
                  <>Creating...</>
                ) : projectCreated ? (
                  <>Project Created ✓</>
                ) : (
                  <>
                    Create Project <CheckCircle2 size={18} />
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
