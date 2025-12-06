"use client";

import React, { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="w-full bg-black-600 text-white py-4 px-6 shadow-md">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">MyApp</h1>

    
        <button
          className="md:hidden text-white text-2xl"
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>

  
        <ul className="hidden md:flex items-center gap-6 text-sm font-medium">
          <li className="hover:text-blue-200 cursor-pointer">
            <a href="/page">Home</a>
          </li>
          <li className="hover:text-blue-200 cursor-pointer">Features</li>
          <li className="hover:text-blue-200 cursor-pointer">About</li>
          <li className="hover:text-blue-200 cursor-pointer">Contact</li>
        </ul>
      </div>

  
      {open && (
        <ul className="md:hidden mt-4 flex flex-col gap-4 text-sm font-medium">
          <li className="hover:text-blue-200 cursor-pointer">
            <a href="/page">Home</a>
          </li>
          <li className="hover:text-blue-200 cursor-pointer">Features</li>
          <li className="hover:text-blue-200 cursor-pointer">About</li>
          <li className="hover:text-blue-200 cursor-pointer">Contact</li>
        </ul>
      )}
    </nav>
  );
}
