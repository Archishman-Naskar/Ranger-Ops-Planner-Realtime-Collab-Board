import React from 'react';
import Link from 'next/link';

const Page = () => {
  return (
    // 'h-screen' makes the div take up the full height of the screen
    // 'flex flex-col items-center justify-center' centers the content nicely
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-gray-50">
      
      {/* Your original text */}
      <h1 className="text-2xl font-bold">Toh Kaise Hai Aap Log</h1>
      
      <p className="text-gray-600">To Continue LogIn/Signup</p>

      <div className="flex gap-4">
        {/* Login Link */}
        <Link 
          href="/login" 
          className="px-6 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 transition"
        >
          Login
        </Link>

        {/* Signup Link */}
        <Link 
          href="/signup" 
          className="px-6 py-2 text-white bg-green-600 rounded hover:bg-green-700 transition"
        >
          Signup
        </Link>
      </div>
    </div>
  );
}

export default Page;