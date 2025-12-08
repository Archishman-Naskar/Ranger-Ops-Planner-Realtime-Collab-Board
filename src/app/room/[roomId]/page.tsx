'use client';

import { useEffect, useRef, useState, createRef } from 'react';
import { useParams } from 'next/navigation';
import { socket } from '../../lib/socket';
import Board from './Board';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // FIX: Stable User ID to prevent duplicates in Strict Mode
  const userIdRef = useRef("");

  // Drawing State
  const [selectedTool, setSelectedTool] = useState('pencil');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [imageData, setImageData] = useState<ImageData | null>(null);

  // History State
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // UI State
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const [boards, setBoards] = useState<any[]>([]);
  const boardRefs = useRef<any>({}); 
  
  // Real User State
  const [users, setUsers] = useState<any[]>([]);

  // --- Helper Functions for Drawing ---

  const saveToHistory = () => {
    if (!canvasRef.current) return;

    setHistoryStep((prev) => {
      const newStep = prev + 1;
      setHistory((prev) => [
        ...prev.slice(0, newStep),
        canvasRef.current!.toDataURL(),
      ]);
      return newStep;
    });
  };

  const emitCanvasImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !roomId) return;
    const image = canvas.toDataURL('image/png');
    socket.emit('draw', { roomId, image });
  };

  const undo = () => {
    if (historyStep <= 0 || !canvasRef.current) return;

    const newStep = historyStep - 1;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.src = history[newStep];
    img.onload = () => {
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      ctx?.drawImage(img, 0, 0);
      setHistoryStep(newStep);
      emitCanvasImage();
    };
  };

  const redo = () => {
    if (historyStep >= history.length - 1 || !canvasRef.current) return;

    const newStep = historyStep + 1;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.src = history[newStep];
    img.onload = () => {
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      ctx?.drawImage(img, 0, 0);
      setHistoryStep(newStep);
      emitCanvasImage();
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      saveToHistory();
      emitCanvasImage();
    }
  };

  // --- Board Logic Helpers ---

  const determineNewPosition = () => {
    if (typeof window === 'undefined') return { x: 100, y: 100 };
    
    const maxX = window.innerWidth - 250;
    const maxY = window.innerHeight - 250;

    return {
      x: Math.floor(Math.random() * maxX),
      y: Math.floor(Math.random() * maxY),
    };
  };

  const checkForOverlap = (id: any) => {
    const currentNoteRef = boardRefs.current[id]?.current;
    if (!currentNoteRef) return false;
    
    const currentRect = currentNoteRef.getBoundingClientRect();

    return boards.some((note) => {
      if (note.id === id) return false;

      const otherNoteRef = boardRefs.current[note.id]?.current;
      if (!otherNoteRef) return false;
      
      const otherRect = otherNoteRef.getBoundingClientRect();

      return !(
        currentRect.right < otherRect.left ||
        currentRect.left > otherRect.right ||
        currentRect.bottom < otherRect.top ||
        currentRect.top > otherRect.bottom
      );
    });
  };

  const updateBoardPosition = (id: any, newPosition: any) => {
    const updatedBoards = boards.map((note) =>
      note.id === id ? { ...note, position: newPosition } : note
    );
    setBoards(updatedBoards);
    localStorage.setItem("boards", JSON.stringify(updatedBoards));
  };

  const handleDragStart = (board: any, e: React.MouseEvent) => {
    e.preventDefault();

    const { id } = board;
    const boardRef = boardRefs.current[id]?.current;
    const container = containerRef.current;

    if (!boardRef || !container) return;

    const boardRect = boardRef.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const offsetX = e.clientX - boardRect.left;
    const offsetY = e.clientY - boardRect.top;

    const startPos = board.position;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - offsetX - containerRect.left;
      const newY = e.clientY - offsetY - containerRect.top;

      boardRef.style.left = `${newX}px`;
      boardRef.style.top = `${newY}px`;
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      const finalRect = boardRef.getBoundingClientRect();
      const newPosition = {
        x: finalRect.left - containerRect.left,
        y: finalRect.top - containerRect.top
      };

      if (checkForOverlap(id)) {
        boardRef.style.left = `${startPos.x}px`;
        boardRef.style.top = `${startPos.y}px`;
      } else {
        updateBoardPosition(id, newPosition);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // --- EFFECT 1: Canvas Sizing ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const handleResize = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const tempImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      ctx.putImageData(tempImage, 0, 0);
    };

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- EFFECT 2: Drawing Logic ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleMouseDown = (e: MouseEvent) => {
      setIsDrawing(true);
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setStartX(x);
      setStartY(y);
      setImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));

      if (selectedTool === 'pencil') {
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (['line', 'rect', 'circle'].includes(selectedTool) && imageData) {
        ctx.putImageData(imageData, 0, 0);
      }

      ctx.strokeStyle = selectedColor;
      ctx.fillStyle = selectedColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (selectedTool) {
        case 'pencil':
          ctx.lineTo(x, y);
          ctx.stroke();
          break;
        case 'line':
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(x, y);
          ctx.stroke();
          break;
        case 'rect': {
          const width = x - startX;
          const height = y - startY;
          ctx.strokeRect(startX, startY, width, height);
          break;
        }
        case 'circle': {
          const radius = Math.sqrt(
            Math.pow(x - startX, 2) + Math.pow(y - startY, 2)
          );
          ctx.beginPath();
          ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        }
        case 'eraser':
          ctx.clearRect(
            x - brushSize / 2,
            y - brushSize / 2,
            brushSize,
            brushSize
          );
          break;
      }
    };

    const finishStroke = () => {
      if (isDrawing) {
        saveToHistory();
        emitCanvasImage();
        setIsDrawing(false);
      }
      ctx.beginPath();
    };

    const handleMouseUp = () => finishStroke();
    const handleMouseLeave = () => finishStroke();

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isDrawing, selectedTool, selectedColor, brushSize, startX, startY, imageData, roomId]);

  // --- EFFECT 3: Socket Logic (CRITICAL UPDATES) ---
  useEffect(() => {
    if (!roomId) return;

    // FIX: Initialize userId only ONCE.
    // If we don't do this check, React Strict Mode will generate 2 IDs 
    // and you will see 2 users join the room instantly.
    if (!userIdRef.current) {
        userIdRef.current = socket.id || `user-${Date.now()}`;
    }
    
    const userId = userIdRef.current;
    
    // Emit join event now that component is mounted
    socket.emit('userJoined', { userId, roomId });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle Drawing from other users
    const handleDraw = ({ roomId: incomingRoom, image }: { roomId: string; image: string; }) => {
      if (incomingRoom !== roomId) return;
      if (!image) return; // FIX: Safety check prevents blanking the screen

      const img = new Image();
      img.src = image;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Sync history silently
        setHistoryStep((prevStep) => {
            const baseStep = prevStep < 0 ? 0 : prevStep;
            const newStep = baseStep + 1;
            setHistory((prevHistory) => [...prevHistory.slice(0, newStep), image]);
            return newStep;
        });
      };
    };

    // Handle User List Updates
    const handleUserList = ({ success, users }: { success?: boolean, users: any[] }) => {
        if(success && users) setUsers(users);
        else if(Array.isArray(users)) setUsers(users);
    };

    // Listeners
    socket.on('draw', handleDraw);
    socket.on('userIsJoined', handleUserList); // Initial response to self
    socket.on('allUsers', (users) => setUsers(users)); // Broadcast response to others

    return () => {
      socket.off('draw', handleDraw);
      socket.off('userIsJoined', handleUserList);
      socket.off('allUsers');
    };
  }, [roomId]);

  // --- EFFECT 4: Load Boards ---
  useEffect(() => {
    const savedBoards = JSON.parse(localStorage.getItem("boards") || "[]");
    
    const updatedBoards = savedBoards.map((board: any) => {
       if(!board.position) {
          return { ...board, position: determineNewPosition() };
       }
       return board;
    });

    setBoards(updatedBoards);
  }, []);

  // --- RENDER ---
  return (
    <div className="bg-gray-50 h-screen flex flex-col font-sans">
      
      {/* --- HEADER --- */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-20 shrink-0">
        
        {/* Left: Title & Room ID */}
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
            Whiteboard
          </h1>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Room:</span>
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono">{roomId}</code>
          </div>
        </div>

        {/* Right: Actions & Users */}
        <div className="flex items-center gap-4">
          
          {/* User Presence Dropdown */}
          <div className="relative group z-50">
            <button className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full transition-colors cursor-default">
              <div className="flex -space-x-2">
                 {/* USING REAL USER STATE */}
                 {users.slice(0,3).map((u, i) => (
                    <div key={i} className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold" style={{backgroundColor: '#3B82F6'}}>
                        {u.id ? u.id.charAt(0).toUpperCase() : '?'}
                    </div>
                 ))}
              </div>
              <span className="text-sm font-medium text-gray-600">{users.length} Online</span>
            </button>

            {/* Dropdown Content */}
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right">
              <p className="text-xs font-semibold text-gray-400 px-2 py-1 uppercase">Current Users</p>
              <ul className="flex flex-col gap-1 overflow-y-auto max-h-40">
                {users.map((user, i) => (
                  <li key={i} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-lg transition-colors">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold bg-blue-500"
                    >
                      {user.id ? user.id.charAt(0).toUpperCase() : '?'}
                    </div>
                    <span className="text-sm text-gray-600 truncate">
                      User {user.id ? user.id.slice(0, 4) : '...'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1"></div>

          {/* Add Board Button */}
          <button
            onClick={() => {
              const newBoard = { 
                name: "b1", 
                id: Date.now(), 
                position: determineNewPosition() 
              };
              const updatedBoards = [...boards, newBoard];
              setBoards(updatedBoards);
              localStorage.setItem("boards", JSON.stringify(updatedBoards));
            }}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
            Add Board
          </button>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <div ref={containerRef} className="relative flex-1 w-full bg-white cursor-crosshair overflow-hidden">
        
        {/* Canvas Layer */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 block w-full h-full"
        />

        {/* Boards Layer */}
        {/* FIX: CORRECT COORDINATE SYSTEM FOR DRAGGING */}
        <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
          {boards.map((board) => (
            <div key={board.id} className="pointer-events-auto absolute">
                <Board
                ref={
                    boardRefs.current[board.id]
                    ? boardRefs.current[board.id]
                    : (boardRefs.current[board.id] = createRef())
                }
                initialPos={board.position}
                onMouseDown={(e: any) => handleDragStart(board, e)}
                />
            </div>
          ))}
        </div>

        {/* Toggle Button (Mobile/Floating) */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-[60]">
            <button 
                onClick={() => setIsToolbarVisible(!isToolbarVisible)}
                className="bg-white border border-l-0 border-gray-200 text-gray-600 p-2 pr-3 rounded-r-xl shadow-md hover:bg-gray-50 transition-colors"
            >
                {isToolbarVisible ? (
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                )}
            </button>
        </div>

        {/* Floating Toolbar */}
        <aside 
          className={`
            absolute top-1/2 -translate-y-1/2 left-4 z-50
            bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/60 p-3
            flex flex-col gap-5 max-h-[90%] overflow-y-auto
            transition-transform duration-300 ease-in-out
            ${isToolbarVisible ? 'translate-x-0' : '-translate-x-[150%]'}
          `}
        >
          {/* Tools */}
          <div className="flex flex-col gap-2">
            {['pencil', 'line', 'rect', 'circle', 'eraser'].map((tool) => (
                <button
                  key={tool}
                  onClick={() => setSelectedTool(tool)}
                  className={`
                    p-2.5 rounded-xl flex items-center gap-2 transition-all
                    ${selectedTool === tool ? 'bg-black text-white shadow-lg' : 'hover:bg-gray-100 text-gray-500'}
                  `}
                  title={tool}
                >
                    {tool === 'pencil' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>}
                    {tool === 'line' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>}
                    {tool === 'rect' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/></svg>}
                    {tool === 'circle' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>}
                    {tool === 'eraser' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>}
                </button>
              ))}
          </div>

          <div className="h-px bg-gray-200 w-full"></div>

           {/* Color & Size */}
           <div className="flex flex-col gap-4 items-center">
             <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-8 h-8 cursor-pointer rounded-full border-2 border-white shadow-sm ring-1 ring-gray-200 p-0 transition-transform hover:scale-110"
             />
              <input
                type="range"
                min="1" max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-1.5 h-20 bg-gray-200 rounded-full appearance-none cursor-pointer"
                style={{ writingMode: 'bt-lr', appearance: 'slider-vertical' }}
              />
           </div>

           <div className="h-px bg-gray-200 w-full"></div>

           {/* Actions */}
           <div className="flex flex-col gap-2">
             <button onClick={undo} disabled={historyStep <= 0} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
             </button>
             <button onClick={redo} disabled={historyStep >= history.length - 1} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
             </button>
             <button onClick={clearCanvas} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
             </button>
           </div>
        </aside>

      </div>
    </div>
  );
}