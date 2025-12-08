'use client';

import React, { forwardRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface BoardProps {
  id: number;
  name: string;
  initialPos: { x: number; y: number };
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onRename: (newName: string) => void;
}

const Board = forwardRef<HTMLDivElement, BoardProps>(({ id, name, initialPos, onMouseDown, onRename }, ref) => {
  
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Hello World! 🌎</p>',
    immediatelyRender: false, 
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl m-2 focus:outline-none min-h-[100px]',
      },
    },
  })

  // Handle Rename Click
  const handleRenameClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    const newName = window.prompt("Enter new board name:", name);
    if (newName && newName.trim() !== "") {
        onRename(newName);
    }
  };

  if (!editor) {
    return null
  }

  return (
    <div 
      ref={ref} 
      style={{
        position: 'absolute', 
        left: `${initialPos.x}px`,
        top: `${initialPos.y}px`,
      }}
      // FIX: Changed 'transition-all' to 'transition-shadow'. 
      // 'transition-all' causes the 'left' and 'top' properties to animate, creating drag lag.
      className="absolute group rounded-lg bg-white shadow-md hover:shadow-xl transition-shadow duration-200 w-[300px] flex flex-col border border-transparent hover:border-gray-200"
    >
      {/* --- HEADER AREA (Drag Handle) --- */}
      <div 
        onMouseDown={onMouseDown} 
        className="relative h-10 bg-gray-50 rounded-t-lg border-b border-gray-100 cursor-grab active:cursor-grabbing select-none"
      >
        
        {/* LAYER 1: NAME (Default) */}
        <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-200 opacity-100 group-hover:opacity-0 pointer-events-none">
            <span className="text-sm font-semibold text-gray-600 truncate max-w-[90%]">
                {name}
            </span>
        </div>

        {/* LAYER 2: TOOLBAR (Hover) */}
        <div className="absolute inset-0 flex items-center justify-between px-2 transition-opacity duration-200 opacity-0 group-hover:opacity-100 pointer-events-none">
            
            {/* Left: Editor Tools */}
            <div className="flex gap-1 pointer-events-auto" onMouseDown={(e) => e.stopPropagation()}>
                <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={`px-2 py-0.5 text-xs rounded hover:bg-gray-200 transition-colors ${editor.isActive('bold') ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-700'}`}
                >
                B
                </button>
                <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={`px-2 py-0.5 text-xs rounded hover:bg-gray-200 transition-colors ${editor.isActive('italic') ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-700'}`}
                >
                I
                </button>
            </div>

            {/* Right: Rename Button */}
            <div className="pointer-events-auto" onMouseDown={(e) => e.stopPropagation()}>
                <button 
                    onClick={handleRenameClick}
                    className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700 transition-colors"
                    title="Rename Board"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                </button>
            </div>
        </div>
      </div>

      {/* --- The Editor --- */}
      <div className="p-4 cursor-text" onMouseDown={(e) => e.stopPropagation()}>
         <EditorContent editor={editor} />
      </div>
    </div>
  )
});

Board.displayName = 'Board';

export default Board;