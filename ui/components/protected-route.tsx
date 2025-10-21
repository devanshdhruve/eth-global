"use client"

import type React from "react"

import { useAuth } from "@/app/auth/context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: "annotator" | "reviewer" | "client"
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, role } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    if (requiredRole && role !== requiredRole) {
      router.push("/")
      return
    }
  }, [isAuthenticated, role, requiredRole, router])

  if (!isAuthenticated) {
    return null
  }

  if (requiredRole && role !== requiredRole) {
    return null
  }

  return <>{children}</>
}
