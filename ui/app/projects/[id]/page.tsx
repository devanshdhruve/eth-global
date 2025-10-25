"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Save, CheckCircle, AlertCircle, Loader2, Tag, FileText, Clock, Award, ChevronRight, ChevronLeft } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { motion } from "framer-motion"

// Mock project data - replace with actual data from your API
const mockProject = {
  projectId: "healthcare-sentiment-2024",
  taskCount: 50,
  reward: 10,
  currentTask: 1,
  description: "Annotate medical review text with sentiment labels"
}

const mockTasks = [
  {
    taskId: 1,
    text: "The doctor was very professional and explained everything clearly. The wait time was reasonable and the staff was friendly.",
    ipfsHash: "QmX7Y8Z9..."
  },
  {
    taskId: 2,
    text: "Terrible experience. Had to wait 3 hours past my appointment time. No one bothered to explain the delay.",
    ipfsHash: "QmA1B2C3..."
  },
  {
    taskId: 3,
    text: "The treatment was effective but the facility could use some updating. Overall satisfied with the care received.",
    ipfsHash: "QmD4E5F6..."
  }
]

const annotationLabels = [
  { id: "positive", label: "Positive", color: "from-green-500 to-emerald-500", icon: "😊" },
  { id: "negative", label: "Negative", color: "from-red-500 to-rose-500", icon: "😞" },
  { id: "neutral", label: "Neutral", color: "from-gray-500 to-slate-500", icon: "😐" },
  { id: "mixed", label: "Mixed", color: "from-yellow-500 to-orange-500", icon: "🤔" }
]

export default function AnnotationPage() {
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [annotations, setAnnotations] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [notes, setNotes] = useState("")
  const [confidence, setConfidence] = useState(5)
  const [showAnnotation, setShowAnnotation] = useState(false)

  const currentTask = mockTasks[currentTaskIndex]
  const progress = ((Object.keys(annotations).length) / mockTasks.length) * 100

  const handleAnnotate = async () => {
    if (!selectedLabel) {
      alert("Please select a label before submitting")
      return
    }

    setSaving(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Save annotation
    setAnnotations(prev => ({
      ...prev,
      [currentTask.taskId]: selectedLabel
    }))

    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)

    // Move to next task
    if (currentTaskIndex < mockTasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1)
      setSelectedLabel(null)
      setNotes("")
      setConfidence(5)
    }

    setSaving(false)
  }

  const handlePrevious = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(currentTaskIndex - 1)
      const prevAnnotation = annotations[mockTasks[currentTaskIndex - 1].taskId]
      setSelectedLabel(prevAnnotation || null)
    }
  }

  const handleNext = () => {
    if (currentTaskIndex < mockTasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1)
      const nextAnnotation = annotations[mockTasks[currentTaskIndex + 1].taskId]
      setSelectedLabel(nextAnnotation || null)
    }
  }

  const isLastTask = currentTaskIndex === mockTasks.length - 1
  const allTasksCompleted = Object.keys(annotations).length === mockTasks.length

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
                onClick={() => window.history.back()}
                className="flex items-center gap-2 text-foreground/70 hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft size={20} />
                Back to Projects
              </button>

              <div className="glass p-8 mb-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1 className="text-4xl font-bold gradient-text mb-2">{mockProject.projectId}</h1>
                    <p className="text-foreground/70">{mockProject.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-foreground/60">Reward per task</div>
                    <div className="text-2xl font-bold text-teal-400">{mockProject.reward} HBAR</div>
                  </div>
                </div>

                {/* Project Stats */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <div className="flex items-center gap-2 text-foreground/60 mb-2">
                      <FileText size={20} />
                      <span className="text-sm">Total Tasks</span>
                    </div>
                    <div className="text-3xl font-bold">{mockTasks.length}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <div className="flex items-center gap-2 text-foreground/60 mb-2">
                      <Award size={20} />
                      <span className="text-sm">Total Reward</span>
                    </div>
                    <div className="text-3xl font-bold text-teal-400">{mockTasks.length * mockProject.reward} HBAR</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                    <div className="flex items-center gap-2 text-foreground/60 mb-2">
                      <Clock size={20} />
                      <span className="text-sm">Est. Time</span>
                    </div>
                    <div className="text-3xl font-bold">{mockTasks.length * 2} min</div>
                  </div>
                </div>

                {/* Progress */}
                {Object.keys(annotations).length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-foreground/70">
                        Your Progress: {Object.keys(annotations).length} / {mockTasks.length} tasks
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
                  </ul>
                </div>

                <button
                  onClick={() => setShowAnnotation(true)}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 neon-glow text-lg"
                >
                  {Object.keys(annotations).length > 0 ? "Continue Annotating" : "Start Annotating"}
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Progress Header */}
      <section className="py-6 px-4 border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-16 z-40">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAnnotation(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl font-bold">{mockProject.projectId}</h2>
                <p className="text-sm text-foreground/60">Task {currentTaskIndex + 1} of {mockTasks.length}</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-foreground/60">Reward per task</div>
              <div className="text-lg font-bold text-teal-400">{mockProject.reward} HBAR</div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-foreground/70">
              Progress: {Object.keys(annotations).length} / {mockTasks.length} tasks
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
      </section>

      {/* Main Content */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {allTasksCompleted ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="glass p-12 text-center"
            >
              <CheckCircle size={64} className="text-green-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold gradient-text mb-2">All Tasks Completed!</h2>
              <p className="text-foreground/70 mb-6">
                You've successfully annotated all {mockTasks.length} tasks
              </p>
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-6 mb-6 max-w-md mx-auto">
                <div className="text-4xl font-bold text-green-400 mb-2">
                  {mockTasks.length * mockProject.reward} HBAR
                </div>
                <div className="text-foreground/70">Total Earnings</div>
              </div>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 neon-glow"
              >
                Back to Projects
              </button>
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Annotation Area */}
              <div className="lg:col-span-2 space-y-6">
                {/* Task Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="glass p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FileText size={20} className="text-blue-400" />
                      <span className="text-sm text-foreground/70">
                        Task {currentTaskIndex + 1} of {mockTasks.length}
                      </span>
                    </div>
                    {annotations[currentTask.taskId] && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full">
                        <CheckCircle size={16} className="text-green-400" />
                        <span className="text-sm text-green-400">Completed</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                    <p className="text-lg leading-relaxed">
                      {currentTask.text}
                    </p>
                  </div>

                  <div className="text-xs text-foreground/40 font-mono">
                    IPFS: {currentTask.ipfsHash}
                  </div>
                </motion.div>

                {/* Annotation Labels */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="glass p-6"
                >
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Tag size={20} className="text-purple-400" />
                    Select Annotation Label
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {annotationLabels.map((label) => (
                      <button
                        key={label.id}
                        onClick={() => setSelectedLabel(label.id)}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                          selectedLabel === label.id
                            ? `bg-gradient-to-r ${label.color} border-white/50 shadow-lg`
                            : "bg-white/5 border-white/10 hover:border-white/30"
                        }`}
                      >
                        <div className="text-3xl mb-2">{label.icon}</div>
                        <div className="font-semibold">{label.label}</div>
                      </button>
                    ))}
                  </div>
                </motion.div>

                {/* Additional Notes */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="glass p-6"
                >
                  <h3 className="text-lg font-bold mb-4">Additional Notes (Optional)</h3>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any observations or context..."
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 placeholder:text-foreground/40 focus:outline-none focus:border-blue-500/50 resize-none"
                  />
                </motion.div>

                {/* Confidence Slider */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="glass p-6"
                >
                  <h3 className="text-lg font-bold mb-4">Confidence Level</h3>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={confidence}
                      onChange={(e) => setConfidence(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-foreground/70">
                      <span>Low (1)</span>
                      <span className="text-blue-400 font-semibold">{confidence}/10</span>
                      <span>High (10)</span>
                    </div>
                  </div>
                </motion.div>

                {/* Navigation & Submit */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="flex gap-4"
                >
                  <button
                    onClick={handlePrevious}
                    disabled={currentTaskIndex === 0}
                    className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg font-semibold hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <ChevronLeft size={20} />
                    Previous
                  </button>
                  
                  <button
                    onClick={handleAnnotate}
                    disabled={!selectedLabel || saving}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 neon-glow"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={20} />
                        {isLastTask ? "Submit Final" : "Submit & Next"}
                      </>
                    )}
                  </button>

                  {!isLastTask && (
                    <button
                      onClick={handleNext}
                      disabled={currentTaskIndex === mockTasks.length - 1}
                      className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg font-semibold hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      Next
                      <ChevronRight size={20} />
                    </button>
                  )}
                </motion.div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Project Stats */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                  className="glass p-6"
                >
                  <h3 className="text-lg font-bold mb-4">Project Stats</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-foreground/70">
                        <Clock size={16} />
                        <span className="text-sm">Time Spent</span>
                      </div>
                      <span className="font-semibold">12m 34s</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-foreground/70">
                        <Award size={16} />
                        <span className="text-sm">Total Earned</span>
                      </div>
                      <span className="text-teal-400 font-semibold">
                        {Object.keys(annotations).length * mockProject.reward} HBAR
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-foreground/70">
                        <CheckCircle size={16} />
                        <span className="text-sm">Completed</span>
                      </div>
                      <span className="font-semibold">
                        {Object.keys(annotations).length}/{mockTasks.length}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Guidelines */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="glass p-6"
                >
                  <h3 className="text-lg font-bold mb-4">Guidelines</h3>
                  <ul className="space-y-3 text-sm text-foreground/70">
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
                  </ul>
                </motion.div>

                {/* Keyboard Shortcuts */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="glass p-6"
                >
                  <h3 className="text-lg font-bold mb-4">Shortcuts</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground/70">Submit</span>
                      <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-xs">Enter</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground/70">Previous</span>
                      <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-xs">←</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground/70">Next</span>
                      <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-xs">→</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground/70">Label 1-4</span>
                      <kbd className="px-2 py-1 bg-white/10 rounded font-mono text-xs">1-4</kbd>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-8 right-8 bg-green-500/20 border border-green-500/30 backdrop-blur-md rounded-lg p-4 flex items-center gap-3 animate-in slide-in-from-bottom">
          <CheckCircle size={24} className="text-green-400" />
          <div>
            <div className="font-semibold">Annotation Saved!</div>
            <div className="text-sm text-foreground/70">+{mockProject.reward} HBAR earned</div>
          </div>
        </div>
      )}
    </div>
  )
}