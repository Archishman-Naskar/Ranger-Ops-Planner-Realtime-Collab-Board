import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import Whiteboard from './WhiteBoard';

interface TokenPayload {
  id: string;
  email: string;
  username: string;
}

export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    redirect('/login');
  }

  let userEmail = "";

  try {
    // 1. Get the secret safely (Updated to match your .env file)
    const secret = process.env.ACCESS_TOKEN_SECRET;
    
    // 2. Check if secret exists before verifying
    if (!secret) {
      throw new Error("ACCESS_TOKEN_SECRET is not defined in environment variables");
    }

    const decoded = jwt.verify(token, secret) as TokenPayload;
    userEmail = decoded.email;

    if (!userEmail) {
      throw new Error("Email not found in token");
    }

  } catch (error: any) {
    console.error("Token verification failed:", error.message);
    redirect('/login');
  }

  return (
    <Whiteboard 
      roomId={roomId} 
      userEmail={userEmail} 
    />
  );
}