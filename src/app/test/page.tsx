'use client' // <--- 1. THIS IS REQUIRED

import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

export default function TiptapEditor() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Hello World! 🌎</p>',
    
    // 2. THIS IS REQUIRED FOR NEXT.JS
    // Without this, you will get a "Hydration Mismatch" error next.
    immediatelyRender: false, 
    
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl m-5 focus:outline-none border p-4 rounded-md min-h-[200px]',
      },
    },
  })

  if (!editor) {
    return null
  }

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white">
      {/* --- Custom Toolbar --- */}
      <div className="mb-4 flex gap-2 border-b pb-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`px-3 py-1 rounded ${editor.isActive('bold') ? 'bg-black text-white' : 'bg-gray-200'}`}
        >
          Bold
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`px-3 py-1 rounded ${editor.isActive('italic') ? 'bg-black text-white' : 'bg-gray-200'}`}
        >
          Italic
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-black text-white' : 'bg-gray-200'}`}
        >
          H1
        </button>
      </div>

      {/* --- The Editor --- */}
      <EditorContent editor={editor} />
    </div>
  )
}