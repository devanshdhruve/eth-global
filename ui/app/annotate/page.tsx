"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ChevronLeft, ChevronRight, Check, Flag, MessageSquare } from "lucide-react"
import { motion } from "framer-motion"

export default function AnnotatePage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [annotations, setAnnotations] = useState<Record<number, string>>({})
  const [feedback, setFeedback] = useState("")
  const [showFeedback, setShowFeedback] = useState(false)

  const samples = [
    {
      id: 1,
      type: "image",
      content: "/medical-scan.png",
      question: "Identify any abnormalities in this medical scan",
      options: ["Normal", "Abnormal - Minor", "Abnormal - Severe", "Unclear"],
    },
    {
      id: 2,
      type: "text",
      content: "The product arrived on time and exceeded my expectations. Highly recommended!",
      question: "What is the sentiment of this review?",
      options: ["Positive", "Negative", "Neutral", "Mixed"],
    },
    {
      id: 3,
      type: "image",
      content: "/street-scene-with-cars-and-pedestrians.jpg",
      question: "Count the number of vehicles in this image",
      options: ["0-2", "3-5", "6-10", "10+"],
    },
    {
      id: 4,
      type: "text",
      content: "The service was terrible and I will never return to this restaurant.",
      question: "What is the sentiment of this review?",
      options: ["Positive", "Negative", "Neutral", "Mixed"],
    },
    {
      id: 5,
      type: "image",
      content: "/product-photo-ecommerce.jpg",
      question: "Categorize this product",
      options: ["Electronics", "Clothing", "Home & Garden", "Sports"],
    },
  ]

  const currentSample = samples[currentIndex]
  const isAnswered = annotations[currentIndex] !== undefined

  const handleAnswer = (option: string) => {
    setAnnotations({ ...annotations, [currentIndex]: option })
  }

  const handleNext = () => {
    if (currentIndex < samples.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setShowFeedback(false)
      setFeedback("")
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setShowFeedback(false)
      setFeedback("")
    }
  }

  const handleSubmitFeedback = () => {
    console.log("Feedback submitted:", feedback)
    setFeedback("")
    setShowFeedback(false)
  }

  const progress = ((currentIndex + 1) / samples.length) * 100
  const completedCount = Object.keys(annotations).length

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 gradient-text">Medical Image Classification</h1>
          <p className="text-foreground/60">Classify medical imaging datasets for AI training</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold">
              Sample {currentIndex + 1} of {samples.length}
            </span>
            <span className="text-sm font-semibold text-blue-400">
              {completedCount}/{samples.length} Completed
            </span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Main Annotation Area */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Content Area */}
          <div className="lg:col-span-2">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8"
            >
              {/* Sample Content */}
              <div className="mb-8">
                {currentSample.type === "image" ? (
                  <div className="relative h-96 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg overflow-hidden flex items-center justify-center">
                    <img
                      src={currentSample.content || "/placeholder.svg"}
                      alt="Sample"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="p-8 bg-white/5 border border-white/10 rounded-lg">
                    <p className="text-lg text-foreground leading-relaxed">{currentSample.content}</p>
                  </div>
                )}
              </div>

              {/* Question */}
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-6">{currentSample.question}</h2>

                {/* Options */}
                <div className="space-y-3">
                  {currentSample.options.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleAnswer(option)}
                      className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-300 font-medium ${
                        annotations[currentIndex] === option
                          ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500 text-blue-400"
                          : "bg-white/5 border-white/10 text-foreground hover:border-white/20 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            annotations[currentIndex] === option ? "border-blue-500 bg-blue-500" : "border-white/30"
                          }`}
                        >
                          {annotations[currentIndex] === option && <Check size={16} className="text-white" />}
                        </div>
                        {option}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button className="flex-1 px-4 py-3 border border-white/10 rounded-lg font-semibold hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                  <Flag size={18} />
                  Flag for Review
                </button>
                <button
                  onClick={() => setShowFeedback(!showFeedback)}
                  className="flex-1 px-4 py-3 border border-white/10 rounded-lg font-semibold hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare size={18} />
                  Add Feedback
                </button>
              </div>
            </motion.div>

            {/* Feedback Section */}
            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 mt-6"
              >
                <h3 className="font-semibold mb-4">Add Feedback or Comments</h3>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share any issues or suggestions about this sample..."
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-blue-500/50 transition-colors resize-none h-24"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleSubmitFeedback}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all"
                  >
                    Submit Feedback
                  </button>
                  <button
                    onClick={() => setShowFeedback(false)}
                    className="px-4 py-2 border border-white/10 rounded-lg font-semibold hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Stats */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-6">
              <h3 className="font-bold mb-4">Session Stats</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-foreground/60 mb-1">Annotations</p>
                  <p className="text-2xl font-bold text-blue-400">{completedCount}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground/60 mb-1">Estimated Earnings</p>
                  <p className="text-2xl font-bold text-teal-400">{completedCount * 5} ASI</p>
                </div>
                <div>
                  <p className="text-sm text-foreground/60 mb-1">Accuracy</p>
                  <p className="text-2xl font-bold text-purple-400">98%</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <h3 className="font-bold mb-4">Navigation</h3>
              <div className="space-y-3">
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="w-full px-4 py-3 border border-white/10 rounded-lg font-semibold hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentIndex === samples.length - 1}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 neon-glow"
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Sample Indicators */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-xs text-foreground/60 mb-3 font-semibold">SAMPLES</p>
                <div className="grid grid-cols-5 gap-2">
                  {samples.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentIndex(i)}
                      className={`aspect-square rounded-lg text-xs font-bold transition-all ${
                        i === currentIndex
                          ? "bg-gradient-to-br from-blue-500 to-purple-500 text-white neon-glow"
                          : annotations[i]
                            ? "bg-teal-500/30 border border-teal-500/50 text-teal-400"
                            : "bg-white/5 border border-white/10 text-foreground/60 hover:bg-white/10"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Section */}
        {completedCount === samples.length && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center border-2 border-teal-500/30"
          >
            <Check className="w-12 h-12 text-teal-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">All Samples Annotated!</h2>
            <p className="text-foreground/60 mb-6">You've earned {completedCount * 5} ASI tokens for this batch</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all neon-glow">
                Submit Batch
              </button>
              <button className="px-8 py-3 border border-white/10 rounded-lg font-semibold hover:bg-white/5 transition-colors">
                Start New Batch
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  )
}
