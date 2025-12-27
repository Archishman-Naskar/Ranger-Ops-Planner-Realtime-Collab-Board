'use client';

import { useEffect, useRef, useState, createRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Position } from './types';
import { useRoomSocket } from './hooks/useRoomSocket';
import { useCanvasDrawing } from './hooks/useCanvasDrawing';
import { useBoardManagement } from './hooks/useBoardManagement';
import { useImageManagement } from './hooks/useImageManagement';
import { useDragLogic } from './hooks/useDragLogic';
import { resizeCanvas } from './utils/canvasUtils';
import { socket } from '../../lib/socket';

import RoomHeader from './components/RoomHeader';
import RoomModal from './components/RoomModal';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import ItemRenderer from './components/ItemRenderer';
import FileInput from './components/FileInput';

interface RoomClientProps {
  roomId: string;
  userEmail: string;
}

export default function RoomClient({ roomId, userEmail }: RoomClientProps) {
  const router = useRouter();

  // --- REFS ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Initialize with the email passed from Server Component
  const userIdRef = useRef(userEmail);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- DRAWING STATE ---
  const [selectedTool, setSelectedTool] = useState('pencil');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [imageData, setImageData] = useState<ImageData | null>(null);

  // --- UI STATE ---
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  // --- DATA STATES ---
  const {
    boards,
    setBoards,
    addBoard,
    updateBoardPosition,
    updateBoardName,
    updateBoardContent,
    deleteBoard
  } = useBoardManagement(roomId);

  const {
    images,
    setImages,
    addImage,
    updateImagePosition,
    updateImageName,
    deleteImage
  } = useImageManagement(roomId);

  // --- UNIFIED REFS FOR ITEMS ---
  const itemRefs = useRef<any>({});

  // --- LOGOUT LOGIC ---
  const handleLogout = async () => {
    try {
      socket.disconnect(); // Disconnect socket immediately
      await axios.get('/api/users/logout');
      toast.success('Logout successful');
      router.push('/login');
    } catch (error: any) {
      console.error("Logout failed", error.message);
      toast.error(error.message || "Logout failed");
    }
  };

  // --- SOCKET HOOK ---
  useRoomSocket({
    roomId,
    userIdRef,
    setBoards,
    setImages,
    setUsers,
    onDrawReceived: (image) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      if (!image) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } else {
        const img = new Image();
        img.src = image;
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
      }
    }
  });

  // --- CANVAS DRAWING HOOK ---
  useCanvasDrawing({
    canvasRef,
    roomId,
    selectedTool,
    selectedColor,
    brushSize,
    isDrawing,
    setIsDrawing,
    startX,
    setStartX,
    startY,
    setStartY,
    imageData,
    setImageData,
    onEmitDraw: (canvas) => {
      const image = canvas.toDataURL('image/png');
      socket.emit('draw', { roomId, image });
    }
  });

  // --- DRAG LOGIC HOOK ---
  const { handleDragStart } = useDragLogic({
    boards,
    images,
    itemRefs,
    onUpdatePosition: (id, newPosition, type) => {
      if (type === 'text') updateBoardPosition(id, newPosition);
      else updateImagePosition(id, newPosition);
    }
  });

  // --- UNIFIED UPDATE HANDLERS ---
  const updateItemPosition = (
    id: number | string,
    newPosition: Position,
    type: 'text' | 'image'
  ) => {
    if (type === 'text') updateBoardPosition(id, newPosition);
    else updateImagePosition(id, newPosition);
  };

  const updateItemName = (
    id: number | string,
    newName: string,
    type: 'text' | 'image'
  ) => {
    if (type === 'text') updateBoardName(id, newName);
    else updateImageName(id, newName);
  };

  const emitDeleteItem = (id: number | string, type: 'text' | 'image') => {
    if (type === 'text') deleteBoard(id);
    else deleteImage(id);
  };

  // --- EVENT HANDLERS ---
  const handleAddBoard = () => {
    if (!newBoardTitle.trim()) return;
    addBoard(newBoardTitle);
    setNewBoardTitle('');
    setIsModalOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      addImage(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUndo = () => {
    socket.emit('undo', { roomId });
  };

  const handleRedo = () => {
    socket.emit('redo', { roomId });
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/png');
    socket.emit('draw', { roomId, image });
  };

  // --- EFFECTS ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const allItems = [...boards, ...images];
    const previousUrl = canvas.toDataURL();
    resizeCanvas(canvas, container, allItems, previousUrl);

    const handleResize = () =>
      resizeCanvas(canvas, container, allItems, canvas.toDataURL());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [boards, images]);

  useEffect(() => {
    const allItems = [...boards, ...images];
    allItems.forEach((item) => {
      if (!itemRefs.current[item.id]) {
        itemRefs.current[item.id] = createRef();
      }
    });
  }, [boards, images]);

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col font-sans">
      <FileInput ref={fileInputRef} onChange={handleImageUpload} />

      <RoomHeader
        roomId={roomId}
        users={users}
        onAddBoard={() => setIsModalOpen(true)}
        onLogout={handleLogout} 
      />

      <RoomModal
        isOpen={isModalOpen}
        title={newBoardTitle}
        onTitleChange={setNewBoardTitle}
        onAdd={handleAddBoard}
        onClose={() => {
          setIsModalOpen(false);
          setNewBoardTitle('');
        }}
      />

      <div
        ref={containerRef}
        className={`relative flex-1 w-full bg-white cursor-crosshair transition-all duration-200`}
        data-container="room-canvas"
      >
        <Canvas ref={canvasRef} />

        <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
          <ItemRenderer
            boards={boards}
            images={images}
            itemRefs={itemRefs}
            onDragStart={handleDragStart}
            onBoardContentChange={updateBoardContent}
            onBoardRename={(id, name) => updateItemName(id, name, 'text')}
            onBoardDelete={(id) => emitDeleteItem(id, 'text')}
            onImageRename={(id, name) => updateItemName(id, name, 'image')}
            onImageDelete={(id) => emitDeleteItem(id, 'image')}
          />
        </div>

        <div className="fixed z-[60] bottom-24 left-4 md:left-0 md:top-1/2 md:bottom-auto md:-translate-y-1/2">
          <button
            onClick={() => setIsToolbarVisible(!isToolbarVisible)}
            className="bg-white border border-gray-200 md:border-l-0 text-gray-600 p-2 md:pr-3 rounded-full md:rounded-r-xl md:rounded-l-none shadow-md hover:bg-gray-50 transition-colors"
          >
            {isToolbarVisible ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-90 md:rotate-0">
                <path d="m15 18-6-6 6-6" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            )}
          </button>
        </div>

        <Toolbar
          isVisible={isToolbarVisible}
          selectedTool={selectedTool}
          onToolChange={setSelectedTool}
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          onImageUpload={() => fileInputRef.current?.click()}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClearCanvas}
        />
      </div>
    </div>
  );
}