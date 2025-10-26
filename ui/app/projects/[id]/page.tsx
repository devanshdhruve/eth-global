"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Save, CheckCircle, AlertCircle, Loader2, Tag, FileText, Clock, Award, ChevronRight, ChevronLeft } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { motion } from "framer-motion"

interface Project {
  projectId: string
  taskCount: number
  reward: number
  description?: string
  instruction: string
  category?: string
  status: string
  userScreeningStatus: 'passed' | 'failed' | 'not-attempted'
  screeningScore: number | null
  canAnnotate: boolean
}

interface Task {
  taskId: number
  text: string
  ipfsHash: string
  metadata?: any
}

interface AnnotationData {
  label: string
  notes: string
  confidence: number
}

const annotationLabels = [
  { id: "positive", label: "Positive", color: "from-green-500 to-emerald-500", icon: "😊" },
  { id: "negative", label: "Negative", color: "from-red-500 to-rose-500", icon: "😞" },
  { id: "neutral", label: "Neutral", color: "from-gray-500 to-slate-500", icon: "😐" },
  { id: "mixed", label: "Mixed", color: "from-yellow-500 to-orange-500", icon: "🤔" }
]

export default function AnnotationPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  // State for project and tasks
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State for annotation
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [annotations, setAnnotations] = useState<Record<number, AnnotationData>>({})
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [notes, setNotes] = useState("")
  const [confidence, setConfidence] = useState(5)
  const [showAnnotation, setShowAnnotation] = useState(false)

  // Fetch project data
  useEffect(() => {
    async function fetchProject() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/projects/${projectId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch project")
        }

        if (!data.success) {
          throw new Error("Failed to load project data")
        }

        setProject(data.project)

        // Check if user can annotate
        if (!data.project.canAnnotate) {
          setError(
            data.project.userScreeningStatus === 'failed'
              ? "You failed the screening test for this project"
              : "You must pass the screening test before annotating"
          )
          setLoading(false)
          return
        }

        // Fetch tasks
        const tasksResponse = await fetch(`/api/projects/${projectId}/tasks`)
        const tasksData = await tasksResponse.json()

        if (!tasksResponse.ok) {
          throw new Error(tasksData.error || "Failed to fetch tasks")
        }

        if (!tasksData.success || !tasksData.tasks || tasksData.tasks.length === 0) {
          throw new Error("No tasks available for this project")
        }

        setTasks(tasksData.tasks)
        setLoading(false)
      } catch (err: any) {
        console.error("Error fetching project:", err)
        setError(err.message || "Failed to load project")
        setLoading(false)
      }
    }

    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  const currentTask = tasks[currentTaskIndex]
  const progress = tasks.length > 0 ? ((Object.keys(annotations).length) / tasks.length) * 100 : 0

  const handleAnnotate = async () => {
    if (!selectedLabel) {
      alert("Please select a label before submitting")
      return
    }

    if (!project || !currentTask) {
      alert("Project or task data not available")
      return
    }

    setSaving(true)

    try {
      // Submit annotation to API
      const response = await fetch("/api/annotations/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: project.projectId,
          taskId: currentTask.taskId,
          annotation: {
            label: selectedLabel,
            notes: notes,
            confidence: confidence * 20, // Convert 1-5 to 20-100
          },
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to submit annotation")
      }

      // Save annotation locally
      setAnnotations(prev => ({
        ...prev,
        [currentTask.taskId]: {
          label: selectedLabel,
          notes: notes,
          confidence: confidence,
        }
      }))

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)

      // Move to next task
      if (currentTaskIndex < tasks.length - 1) {
        setCurrentTaskIndex(currentTaskIndex + 1)
        setSelectedLabel(null)
        setNotes("")
        setConfidence(5)
      }
    } catch (err: any) {
      console.error("Error submitting annotation:", err)
      alert(`Failed to submit annotation: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handlePrevious = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(currentTaskIndex - 1)
      const prevAnnotation = annotations[tasks[currentTaskIndex - 1].taskId]
      if (prevAnnotation) {
        setSelectedLabel(prevAnnotation.label)
        setNotes(prevAnnotation.notes)
        setConfidence(prevAnnotation.confidence)
      } else {
        setSelectedLabel(null)
        setNotes("")
        setConfidence(5)
      }
    }
  }

  const handleNext = () => {
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1)
      const nextAnnotation = annotations[tasks[currentTaskIndex + 1].taskId]
      if (nextAnnotation) {
        setSelectedLabel(nextAnnotation.label)
        setNotes(nextAnnotation.notes)
        setConfidence(nextAnnotation.confidence)
      } else {
        setSelectedLabel(null)
        setNotes("")
        setConfidence(5)
      }
    }
  }

  const isLastTask = tasks.length > 0 && currentTaskIndex === tasks.length - 1
  const allTasksCompleted = tasks.length > 0 && Object.keys(annotations).length === tasks.length

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-foreground/70">Loading project data...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Error state
  if (error || !project) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <button
              onClick={() => router.push("/projects")}
              className="flex items-center gap-2 text-foreground/70 hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Projects
            </button>
            <div className="glass p-8 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Error Loading Project</h2>
              <p className="text-foreground/70 mb-6">{error || "Project not found"}</p>
              <button
                onClick={() => router.push("/projects")}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all"
              >
                Return to Projects
              </button>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    )
  }

  // If not showing annotation interface, show project overview
  if (!showAnnotation) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        {/* Project Overview */}
        <section className="py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <button
                onClick={() => router.push("/projects")}
                className="flex items-center gap-2 text-foreground/70 hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft size={20} />
                Back to Projects
              </button>

              <div className="glass p-8 mb-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1 className="text-4xl font-bold gradient-text mb-2">{project.projectId}</h1>
                    <p className="text-foreground/70">{project.description || project.instruction}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-foreground/60">Reward per task</div>
                    <div className="text-2xl font-bold text-teal-400">{project.reward} HBAR</div>
                  </div>
                </div>

                {/* Project Stats */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <div className="flex items-center gap-2 text-foreground/60 mb-2">
                      <FileText size={20} />
                      <span className="text-sm">Total Tasks</span>
                    </div>
                    <div className="text-3xl font-bold">{tasks.length}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <div className="flex items-center gap-2 text-foreground/60 mb-2">
                      <Award size={20} />
                      <span className="text-sm">Total Reward</span>
                    </div>
                    <div className="text-3xl font-bold text-teal-400">{tasks.length * project.reward} HBAR</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <div className="flex items-center gap-2 text-foreground/60 mb-2">
                      <Clock size={20} />
                      <span className="text-sm">Est. Time</span>
                    </div>
                    <div className="text-3xl font-bold">{tasks.length * 2} min</div>
                  </div>
                </div>

                {/* Progress */}
                {Object.keys(annotations).length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-foreground/70">
                        Your Progress: {Object.keys(annotations).length} / {tasks.length} tasks
                      </span>
                      <span className="text-sm text-foreground/70">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Guidelines */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
                  <h3 className="text-lg font-bold mb-4">Annotation Guidelines</h3>
                  <ul className="space-y-3 text-foreground/70">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>Read the entire text carefully before annotating</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>Choose the label that best represents the overall sentiment</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>Use "Mixed" for texts with both positive and negative aspects</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>Add notes if you're uncertain about your choice</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>Be consistent in your annotations across all tasks</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => setShowAnnotation(true)}
                  className="w-full px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all text-lg"
                >
                  {Object.keys(annotations).length > 0 ? 'Continue Annotating' : 'Start Annotating'}
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    )
  }

  // Annotation Workspace
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Annotation Interface */}
      <section className="flex-1 py-6 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <button
                onClick={() => setShowAnnotation(false)}
                className="flex items-center gap-2 text-foreground/70 hover:text-foreground mb-2 transition-colors"
              >
                <ArrowLeft size={20} />
                Back to Overview
              </button>
              <h2 className="text-xl font-bold">{project.projectId}</h2>
              <p className="text-sm text-foreground/60">Task {currentTaskIndex + 1} of {tasks.length}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-foreground/60">Reward</div>
              <div className="text-lg font-bold text-teal-400">{project.reward} HBAR</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="glass p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-foreground/70">
                Progress: {Object.keys(annotations).length} / {tasks.length} tasks
              </span>
              <span className="text-sm text-foreground/70">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Success Message */}
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass p-4 mb-6 border border-green-500/50"
            >
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle size={20} />
                <span className="font-semibold">Annotation saved successfully!</span>
              </div>
            </motion.div>
          )}

          {/* Completion Screen */}
          {allTasksCompleted ? (
            <div className="glass p-12 text-center">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h2 className="text-3xl font-bold gradient-text mb-4">All Tasks Completed!</h2>
              <p className="text-foreground/70 mb-2">
                You've successfully annotated all {tasks.length} tasks for project
              </p>
              <p className="text-xl font-bold text-blue-400 mb-2">{project.projectId}</p>
              <p className="text-lg font-semibold text-teal-400 mb-8">
                Total Reward: {tasks.length * project.reward} HBAR
              </p>
              <button
                onClick={() => router.push("/projects")}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all"
              >
                Return to Projects
              </button>
            </div>
          ) : (
            <>
              {/* Task Text */}
              <div className="glass p-8 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="text-blue-400" />
                  <h3 className="text-lg font-bold">Task Content</h3>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <p className="text-lg leading-relaxed">{currentTask?.text || "Loading task..."}</p>
                </div>
              </div>

              {/* Label Selection */}
              <div className="glass p-8 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="text-purple-400" />
                  <h3 className="text-lg font-bold">Select Label</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {annotationLabels.map((label) => (
                    <button
                      key={label.id}
                      onClick={() => setSelectedLabel(label.id)}
                      className={`
                        p-6 rounded-lg border-2 transition-all
                        ${selectedLabel === label.id
                          ? `border-white bg-gradient-to-br ${label.color} shadow-lg`
                          : 'border-white/20 bg-white/5 hover:border-white/40'
                        }
                      `}
                    >
                      <div className="text-4xl mb-2">{label.icon}</div>
                      <div className="font-semibold">{label.label}</div>
                    </button>
                  ))}
                </div>

                {/* Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes or observations..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg resize-none focus:outline-none focus:border-blue-500/50 transition-colors"
                    rows={3}
                  />
                </div>

                {/* Confidence Slider */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Confidence Level: {confidence}/5
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={confidence}
                    onChange={(e) => setConfidence(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-foreground/60 mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-4">
                <button
                  onClick={handlePrevious}
                  disabled={currentTaskIndex === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-lg font-semibold hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                  Previous
                </button>

                <button
                  onClick={handleAnnotate}
                  disabled={!selectedLabel || saving}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Saving...
                    </>
                  ) : isLastTask ? (
                    <>
                      <CheckCircle size={20} />
                      Complete
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      Save & Continue
                    </>
                  )}
                </button>

                <button
                  onClick={handleNext}
                  disabled={isLastTask}
                  className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-lg font-semibold hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight size={20} />
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
