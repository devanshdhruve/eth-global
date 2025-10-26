// /app/api/user/profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user ID
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    // Fetch user data from Clerk
    const user = await clerkClient().users.getUser(userId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Extract wallet address and role from publicMetadata
    const walletAddress = user.publicMetadata?.walletAddress as string | undefined;
    const role = user.publicMetadata?.role as string | undefined;

    // Return user profile data
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || null,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        walletAddress: walletAddress || null,
        role: role || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching user profile:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch user profile",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
