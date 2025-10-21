"use client"

import type React from "react"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { motion } from "framer-motion"
import { Upload, ArrowRight } from "lucide-react"
import { useState } from "react"

export default function CreateProject() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    projectName: "",
    description: "",
    category: "",
    budget: "",
    annotators: "",
    deadline: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handlePrev = () => {
    if (step > 1) setStep(step - 1)
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
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Upload Dataset</h2>

              <div className="border-2 border-dashed border-white/20 rounded-lg p-12 text-center hover:border-blue-500/50 transition-all duration-300 cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                <h3 className="text-lg font-semibold mb-2">Upload your dataset</h3>
                <p className="text-foreground/60 mb-4">Drag and drop your files or click to browse</p>
                <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-300">
                  Choose Files
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-sm text-foreground/60">Supported formats: CSV, JSON, ZIP • Max file size: 500MB</p>
              </div>
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

            <button
              onClick={handleNext}
              disabled={step === 3}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 disabled:opacity-50 flex items-center gap-2 neon-glow"
            >
              {step === 3 ? "Create Project" : "Next"} {step < 3 && <ArrowRight size={18} />}
            </button>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
