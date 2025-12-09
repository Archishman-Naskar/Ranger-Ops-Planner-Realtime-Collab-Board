'use client';

import { useEffect, useRef, useState, createRef } from 'react';
import { useParams } from 'next/navigation';
import { socket } from '../../lib/socket';
import Board from './Board';

type Position = { x: number; y: number };
type BoardData = {
  id: number | string;
  name: string;
  position: Position;
  content: string; 
};

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userIdRef = useRef("");

  // --- Drawing State ---
  const [selectedTool, setSelectedTool] = useState('pencil');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [imageData, setImageData] = useState<ImageData | null>(null);

  // --- UI State ---
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  
  // BOARDS
  const [boards, setBoards] = useState<BoardData[]>([]); 
  const boardRefs = useRef<any>({});
  
  const [users, setUsers] = useState<any[]>([]);

  // --- Modal State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");

  // ==========================================
  // 1. SOCKET & DATA SYNC LOGIC
  // ==========================================

  useEffect(() => {
    if (!roomId) return;
    
    if (!userIdRef.current) userIdRef.current = socket.id || `user-${Date.now()}`;
    const userId = userIdRef.current;

    socket.emit('userJoined', { userId, roomId });

    // --- CANVAS HANDLERS ---
    const handleDraw = ({ roomId: incomingRoom, image }: { roomId: string; image: string | null; }) => {
      if (incomingRoom !== roomId) return;
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
    };

    const handleUserList = (data: any) => {
      const userList = Array.isArray(data) ? data : data.users;
      if (userList) setUsers(userList);
    };

    // --- BOARD HANDLERS ---
    
    const handleBoardsSync = (serverBoards: BoardData[]) => {
      setBoards(serverBoards || []);
    };

    const handleBoardAdd = (newBoard: BoardData) => {
      setBoards((prev) => {
        if (prev.find(b => b.id === newBoard.id)) return prev;
        return [...prev, newBoard];
      });
    };

    const handleBoardUpdate = (updatedBoard: BoardData) => {
      setBoards((prev) => 
        prev.map((b) => (b.id === updatedBoard.id ? updatedBoard : b))
      );
    };

    // This handles deletion when OTHER users delete a board, or when server confirms
    const handleBoardDelete = (boardId: string | number) => {
        setBoards((prev) => prev.filter(b => b.id !== boardId));
    };

    socket.on('draw', handleDraw);
    socket.on('userIsJoined', handleUserList);
    socket.on('allUsers', handleUserList);
    
    socket.on('boards:sync', handleBoardsSync);
    socket.on('board:add', handleBoardAdd);
    socket.on('board:update', handleBoardUpdate);
    socket.on('board:delete', handleBoardDelete);

    return () => {
      socket.off('draw', handleDraw);
      socket.off('userIsJoined', handleUserList);
      socket.off('allUsers', handleUserList);
      socket.off('boards:sync', handleBoardsSync);
      socket.off('board:add', handleBoardAdd);
      socket.off('board:update', handleBoardUpdate);
      socket.off('board:delete', handleBoardDelete);
    };
  }, [roomId]);


  // ==========================================
  // 2. CANVAS DRAWING LOGIC
  // ==========================================

  const emitCanvasImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !roomId) return;
    const image = canvas.toDataURL('image/png');
    socket.emit('draw', { roomId, image });
  };

  const undo = () => socket.emit('undo', { roomId });
  const redo = () => socket.emit('redo', { roomId });

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      emitCanvasImage();
    }
  };

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
          const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
          ctx.beginPath();
          ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        }
        case 'eraser':
          ctx.clearRect(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
          break;
      }
    };

    const finishStroke = () => {
      if (isDrawing) {
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


  // ==========================================
  // 3. BOARD MANAGEMENT LOGIC
  // ==========================================

  const determineNewPosition = () => {
    if (typeof window === 'undefined') return { x: 100, y: 100 };
    return {
      x: Math.floor(Math.random() * (window.innerWidth / 2)),
      y: Math.floor(Math.random() * (window.innerHeight / 2))
    };
  };

  const checkForOverlap = (id: number | string) => {
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

  // --- ADD BOARD ---
  const handleAddBoard = () => {
    if (!newBoardTitle.trim()) return;

    const newBoard: BoardData = {
      id: Date.now(),
      name: newBoardTitle,
      position: determineNewPosition(),
      content: '<p>Hello World! 🌎</p>'
    };

    setBoards((prev) => [...prev, newBoard]);
    socket.emit('board:add', { roomId, boardData: newBoard });
    setNewBoardTitle("");
    setIsModalOpen(false);
  };

  // --- UPDATE BOARD POSITION ---
  const updateBoardPosition = (id: number | string, newPosition: Position) => {
    const board = boards.find(b => b.id === id);
    if (!board) return;

    const updatedBoard = { ...board, position: newPosition };
    setBoards((prev) => prev.map((b) => (b.id === id ? updatedBoard : b)));
    socket.emit('board:update', { roomId, boardData: updatedBoard });
  };

  // --- UPDATE BOARD NAME ---
  const updateBoardName = (id: number | string, newName: string) => {
    const board = boards.find(b => b.id === id);
    if (!board) return;

    const updatedBoard = { ...board, name: newName };
    setBoards((prev) => prev.map((b) => (b.id === id ? updatedBoard : b)));
    socket.emit('board:update', { roomId, boardData: updatedBoard });
  };

  // --- UPDATE BOARD CONTENT ---
  const updateBoardContent = (id: number | string, newContent: string) => {
    const board = boards.find(b => b.id === id);
    if (!board || board.content === newContent) return;

    const updatedBoard = { ...board, content: newContent };
    
    setBoards((prev) => prev.map((b) => (b.id === id ? updatedBoard : b)));
    socket.emit('board:update', { roomId, boardData: updatedBoard });
  };

  // --- DELETE BOARD (NEW FUNCTION) ---
  const emitDeleteBoard = (id: number | string) => {
    // 1. Emit to server
    socket.emit('board:delete', { roomId, boardId: id });
    
    // 2. Optimistic update (remove locally immediately)
    setBoards((prev) => prev.filter(b => b.id !== id));
  };

  // --- DRAG LOGIC ---
  const handleDragStart = (board: BoardData, e: React.MouseEvent) => {
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
      let newY = e.clientY - offsetY - containerRect.top;

      if (newY < 0) {
        newY = 0;
      }

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

  // --- EFFECT: Canvas Sizing ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const lowestBoardBottom = boards.reduce((max, board) => {
        return Math.max(max, board.position.y + 600);
      }, 0);

      const requiredHeight = Math.max(window.innerHeight, lowestBoardBottom);
      const requiredWidth = container.clientWidth;

      if (canvas.height !== requiredHeight || canvas.width !== requiredWidth) {
        const tempUrl = canvas.toDataURL();
        canvas.width = requiredWidth;
        canvas.height = requiredHeight;
        container.style.height = `${requiredHeight}px`;
        const img = new Image();
        img.src = tempUrl;
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);

  }, [boards]);


  // ==========================================
  // 4. RENDER
  // ==========================================
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-[70] shrink-0">
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            Whiteboard
          </h1>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Room:</span>
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono">{roomId}</code>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group z-50">
            <button className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full transition-colors cursor-default">
              <span className="text-sm font-medium text-gray-600">{users.length} Online</span>
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <p className="text-xs font-semibold text-gray-400 px-2 py-1 uppercase">Current Users</p>
              <ul className="flex flex-col gap-1 overflow-y-auto max-h-40">
                {users.map((user, i) => (
                  <li key={i} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold bg-blue-500">
                      {user.id ? user.id.charAt(0).toUpperCase() : '?'}
                    </div>
                    <span className="text-sm text-gray-600 truncate">User {user.id ? user.id.slice(0, 4) : '...'}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            Add Board
          </button>
        </div>
      </header>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 scale-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">New Board</h3>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Board Name</label>
              <input
                type="text"
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                placeholder="e.g., Project Notes"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddBoard()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
              />
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
              <button
                onClick={() => { setIsModalOpen(false); setNewBoardTitle(""); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleAddBoard}
                disabled={!newBoardTitle.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Add Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div ref={containerRef} className="relative flex-1 w-full bg-white cursor-crosshair">
        <canvas ref={canvasRef} className="absolute top-0 left-0 block w-full" />

        <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
          {boards.map((board) => (
            <div key={board.id} className="pointer-events-auto absolute">
              <Board
                ref={boardRefs.current[board.id] ? boardRefs.current[board.id] : (boardRefs.current[board.id] = createRef())}
                id={board.id} 
                name={board.name}
                initialPos={board.position}
                content={board.content}
                onContentChange={(newContent) => updateBoardContent(board.id, newContent)}
                onMouseDown={(e: any) => handleDragStart(board, e)}
                onRename={(newName: string) => updateBoardName(board.id, newName)}
                // --- PASSING THE DELETE FUNCTION ---
                onDelete={() => emitDeleteBoard(board.id)} 
              />
            </div>
          ))}
        </div>

        {/* --- RESPONSIVE TOGGLE BUTTON --- */}
        <div className="fixed z-[60] bottom-24 left-4 md:left-0 md:top-1/2 md:bottom-auto md:-translate-y-1/2">
          <button
            onClick={() => setIsToolbarVisible(!isToolbarVisible)}
            className="bg-white border border-gray-200 md:border-l-0 text-gray-600 p-2 md:pr-3 rounded-full md:rounded-r-xl md:rounded-l-none shadow-md hover:bg-gray-50 transition-colors"
          >
            {isToolbarVisible ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-90 md:rotate-0"><path d="m15 18-6-6 6-6" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            )}
          </button>
        </div>

        {/* --- RESPONSIVE TOOLBAR (FIXED) --- */}
        <aside
          className={`
            fixed z-50
            bg-white/95 backdrop-blur-sm shadow-xl border border-gray-200/60 p-3
            flex gap-5 transition-all duration-300 ease-in-out
            
            /* MOBILE STYLES */
            bottom-6 left-1/2 -translate-x-1/2 rounded-full flex-row items-center
            ${isToolbarVisible ? 'translate-y-0 opacity-100' : 'translate-y-[200%] opacity-0'}

            /* DESKTOP STYLES */
            md:top-[57%] md:left-4 md:bottom-auto md:translate-x-0 md:-translate-y-1/2 md:rounded-2xl md:flex-col md:items-start
            md:${isToolbarVisible ? 'md:translate-x-0' : 'md:-translate-x-[150%]'}
          `}
        >
          <div className="flex md:flex-col flex-row gap-2">
            {['pencil', 'line', 'rect', 'circle', 'eraser'].map((tool) => (
              <button
                key={tool}
                onClick={() => setSelectedTool(tool)}
                className={`p-2.5 rounded-xl flex items-center justify-center transition-all ${selectedTool === tool ? 'bg-black text-white' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                {tool === 'pencil' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>}
                {tool === 'line' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>}
                {tool === 'rect' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /></svg>}
                {tool === 'circle' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg>}
                {tool === 'eraser' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /><path d="M22 21H7" /><path d="m5 11 9 9" /></svg>}
              </button>
            ))}
          </div>

          <div className="md:h-px md:w-full w-px h-8 bg-gray-200"></div>

          <div className="flex md:flex-col flex-row gap-4 items-center">
            <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="w-8 h-8 rounded-full border-2 border-white cursor-pointer" />
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={brushSize} 
              onChange={(e) => setBrushSize(Number(e.target.value))} 
              className="md:w-1.5 md:h-20 w-20 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer" 
              style={{ writingMode: typeof window !== 'undefined' && window.innerWidth >= 768 ? 'vertical-lr' : 'horizontal-tb' } as any} 
            />
          </div>

          <div className="md:h-px md:w-full w-px h-8 bg-gray-200"></div>

          <div className="flex md:flex-col flex-row gap-2">
            <button onClick={undo} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
            </button>
            <button onClick={redo} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" /></svg>
            </button>
            <button onClick={clearCanvas} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
            </button>
          </div>
        </aside>

      </div>
    </div>
  );
}