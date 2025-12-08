'use client';

import React, { forwardRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface BoardProps {
  initialPos: { x: number; y: number };
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
}

// 1. Wrap the component in forwardRef to allow the parent to control the DOM element
const Board = forwardRef<HTMLDivElement, BoardProps>(({ initialPos, onMouseDown }, ref) => {
  
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Hello World! 🌎</p>',
    immediatelyRender: false, 
    editorProps: {
      attributes: {
        // Prevent drag events from bubbling up when interacting with text
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl m-2 focus:outline-none min-h-[100px]',
      },
    },
  })

  if (!editor) {
    return null
  }

  return (
    <div 
      ref={ref} // 2. Attach the ref here
      onMouseDown={onMouseDown} // 3. Attach the drag listener
      style={{
        position: 'absolute', // Required for x/y positioning
        left: `${initialPos.x}px`,
        top: `${initialPos.y}px`,
      }}
      className="absolute border border-gray-300 rounded-lg bg-white shadow-xl w-[300px] flex flex-col"
    >
      {/* --- Drag Handle / Toolbar --- */}
      {/* It is best UX to only allow dragging from this header so text selection works below */}
      <div className="bg-gray-100 p-2 rounded-t-lg border-b flex gap-2 cursor-grab active:cursor-grabbing">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`px-2 py-1 text-xs rounded ${editor.isActive('bold') ? 'bg-black text-white' : 'bg-white border'}`}
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`px-2 py-1 text-xs rounded ${editor.isActive('italic') ? 'bg-black text-white' : 'bg-white border'}`}
        >
          I
        </button>
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