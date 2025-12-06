"use client"
import React from 'react';
import { useRouter } from 'next/navigation';

const Page = () => {
  const router = useRouter();

  const goHome = () => {
    router.push('/whiteboard');
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <button 
        onClick={goHome} 
        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Go to WhiteBoard
      </button>
    </div>
  );
};

export default Page;