import { useUser } from '@clerk/nextjs'

export type UserRole = "annotator" | "reviewer" | "client" | null

export function useUserRole() {
  const { user, isLoaded } = useUser()
  
  const role = (user?.publicMetadata?.role as UserRole) || null
  
  return {
    role,
    isLoaded,
    user,
  }
}