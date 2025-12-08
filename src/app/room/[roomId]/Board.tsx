'use client';

import React, { forwardRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
// 1. Import new extensions
import Underline from '@tiptap/extension-underline'
import {TextStyle} from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'

interface BoardProps {
  id: number;
  name: string;
  initialPos: { x: number; y: number };
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onRename: (newName: string) => void;
}

const Board = forwardRef<HTMLDivElement, BoardProps>(({ id, name, initialPos, onMouseDown, onRename }, ref) => {
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      // 2. Register new extensions
      Underline,
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
    ],
    content: '<p>Hello World! 🌎</p>',
    immediatelyRender: false, 
    editorProps: {
      attributes: {
        // Added styling for specific fonts if needed
        class: 'prose prose-sm sm:prose lg:prose-lg m-2 focus:outline-none min-h-[100px] leading-tight',
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

  // Helper to handle Font Selection
  const setFont = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'sans') editor?.chain().focus().unsetFontFamily().run();
    else editor?.chain().focus().setFontFamily(value).run();
  };

  // Helper to handle Size (Heading Level) Selection
  const setSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'p') editor?.chain().focus().setParagraph().run();
    else if (value === 'h1') editor?.chain().focus().toggleHeading({ level: 1 }).run();
    else if (value === 'h2') editor?.chain().focus().toggleHeading({ level: 2 }).run();
    else if (value === 'h3') editor?.chain().focus().toggleHeading({ level: 3 }).run();
  };

  if (!editor) {
    return null
  }

  // Calculate current values for dropdowns
  const currentFont = editor.isActive('textStyle', { fontFamily: 'serif' }) ? 'serif' 
                    : editor.isActive('textStyle', { fontFamily: 'monospace' }) ? 'monospace' 
                    : 'sans';
  
  const currentSize = editor.isActive('heading', { level: 1 }) ? 'h1'
                    : editor.isActive('heading', { level: 2 }) ? 'h2'
                    : editor.isActive('heading', { level: 3 }) ? 'h3'
                    : 'p';

  return (
    <div 
      ref={ref} 
      style={{
        position: 'absolute', 
        left: `${initialPos.x}px`,
        top: `${initialPos.y}px`,
      }}
      // transition-shadow prevents drag lag
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
        <div className="absolute inset-0 flex items-center justify-between px-2 gap-2 transition-opacity duration-200 opacity-0 group-hover:opacity-100 pointer-events-none">
            
            {/* Left: Editor Tools (Buttons + Dropdowns) */}
            <div className="flex items-center gap-1 pointer-events-auto" onMouseDown={(e) => e.stopPropagation()}>
                
                {/* B / I / U Buttons */}
                <div className="flex bg-white rounded border border-gray-200 overflow-hidden shrink-0">
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        disabled={!editor.can().chain().focus().toggleBold().run()}
                        className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold hover:bg-gray-100 transition-colors ${editor.isActive('bold') ? 'bg-black text-white' : 'text-gray-700'}`}
                        title="Bold"
                    >
                        B
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        disabled={!editor.can().chain().focus().toggleItalic().run()}
                        className={`w-6 h-6 flex items-center justify-center text-[10px] italic hover:bg-gray-100 transition-colors ${editor.isActive('italic') ? 'bg-black text-white' : 'text-gray-700'}`}
                        title="Italic"
                    >
                        I
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={`w-6 h-6 flex items-center justify-center text-[10px] underline hover:bg-gray-100 transition-colors ${editor.isActive('underline') ? 'bg-black text-white' : 'text-gray-700'}`}
                        title="Underline"
                    >
                        U
                    </button>
                </div>

                {/* Size Dropdown */}
                <select 
                    value={currentSize}
                    onChange={setSize}
                    className="h-6 w-16 text-[10px] bg-white border border-gray-200 rounded px-1 outline-none cursor-pointer hover:bg-gray-50"
                    title="Text Size"
                >
                    <option value="p">Normal</option>
                    <option value="h3">Large</option>
                    <option value="h2">X-Large</option>
                    <option value="h1">Huge</option>
                </select>

                {/* Font Dropdown */}
                <select 
                    value={currentFont}
                    onChange={setFont}
                    className="h-6 w-16 text-[10px] bg-white border border-gray-200 rounded px-1 outline-none cursor-pointer hover:bg-gray-50"
                    title="Font Style"
                >
                    <option value="sans">Sans</option>
                    <option value="serif">Serif</option>
                    <option value="monospace">Mono</option>
                </select>

            </div>

            {/* Right: Rename Button */}
            <div className="pointer-events-auto" onMouseDown={(e) => e.stopPropagation()}>
                <button 
                    onClick={handleRenameClick}
                    className="p-1.5 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700 transition-colors"
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