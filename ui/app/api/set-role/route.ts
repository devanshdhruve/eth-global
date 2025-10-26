import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { role, walletAddress } = await req.json()

    if (!['annotator', 'reviewer', 'client'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Prepare metadata update
    const metadata: { role: string; walletAddress?: string } = { role };
    
    // Add wallet address if provided
    if (walletAddress) {
      metadata.walletAddress = walletAddress;
    }

    // Update user's public metadata with the role and wallet address
    const client = await clerkClient()
    await client.users.updateUserMetadata(userId, {
      publicMetadata: metadata,
    })

    return NextResponse.json({ success: true, role, walletAddress })
  } catch (error) {
    console.error('Error setting role:', error)
    return NextResponse.json({ error: 'Failed to set role' }, { status: 500 })
  }
}