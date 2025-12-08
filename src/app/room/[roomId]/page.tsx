'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { socket } from '../../lib/socket';
import Board from './Board';
import { createRef } from 'react';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // --- EFFECT 1: Canvas Sizing (Runs ONCE) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const handleResize = () => {
      // 1. Save the current content
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const tempImage = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // 2. Resize the canvas
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      // 3. Put the content back
      ctx.putImageData(tempImage, 0, 0);
    };

    // Initial sizing
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty dependency array ensures this doesn't run on draw!

  // --- EFFECT 2: Drawing Logic (Runs on state change) ---
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
      // Save current state for shapes (rect/circle)
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

      // Restore image data for shapes to avoid "trails"
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
        // Only save/emit if we were actually drawing
        saveToHistory();
        emitCanvasImage();
        setIsDrawing(false);
      }
      ctx.beginPath();
    };

    const handleMouseUp = () => finishStroke();
    const handleMouseLeave = () => finishStroke();

    // Attach listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Clean up listeners
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [
    isDrawing,
    selectedTool,
    selectedColor,
    brushSize,
    startX,
    startY,
    imageData,
    roomId,
  ]);

  // --- EFFECT 3: Socket Logic ---
  useEffect(() => {
    if (!roomId || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleDraw = ({
      roomId: incomingRoom,
      image,
    }: {
      roomId: string;
      image: string;
    }) => {
      if (incomingRoom !== roomId) return;

      const img = new Image();
      img.src = image;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        setHistoryStep((prevStep) => {
          const baseStep = prevStep < 0 ? 0 : prevStep;
          const newStep = baseStep + 1;
          setHistory((prevHistory) => [
            ...prevHistory.slice(0, newStep),
            image,
          ]);
          return newStep;
        });
      };
    };

    socket.on('draw', handleDraw);
    return () => {
      socket.off('draw', handleDraw);
    };
  }, [roomId]);

  const [boards,setBoards]=useState<any[]>([]);

  useEffect(() => {
    // localstorage logic
    const savedBoards = JSON.parse(localStorage.getItem("boards") || "[]") ;

    const updatedBoards = boards.map((board) => {
      const savedNote = savedBoards.find((n) => n.id === board.id);
      if (savedNote) {
        return {...board, position: savedNote.position};
      } else {
        const position = determineNewPosition();
        return {...board, position};
      }
    });

    setBoards(savedBoards);
    localStorage.setItem("notes", JSON.stringify(updatedBoards));
  }, []);

  const boardRefs = useRef([]);

  const determineNewPosition = () => {
    const maxX = window.innerWidth - 250;
    const maxY = window.innerHeight - 250;

    return {
      x: Math.floor(Math.random() * maxX),
      y: Math.floor(Math.random() * maxY),
    };
  };

  const handleDragStart = (board: any, e: React.MouseEvent) => {
    // 1. Prevent default to stop text selection cursor issues
    e.preventDefault(); 
    
    const { id } = board;
    const boardRef = boardRefs.current[id].current;
    const container = containerRef.current; // Get the container
    
    if (!boardRef || !container) return;

    // Get strict bounds
    const boardRect = boardRef.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Calculate offset of mouse from the board's top-left corner
    const offsetX = e.clientX - boardRect.left;
    const offsetY = e.clientY - boardRect.top;

    const startPos = board.position;

    const handleMouseMove = (e: MouseEvent) => {
      // 2. THE FIX: Subtract containerRect.left/top to convert to relative coordinates
      const newX = e.clientX - offsetX - containerRect.left;
      const newY = e.clientY - offsetY - containerRect.top;

      // Update visually immediately
      boardRef.style.left = `${newX}px`;
      boardRef.style.top = `${newY}px`;
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      const finalRect = boardRef.getBoundingClientRect();
      
      // 3. Save relative position (Final Screen Pos - Container Pos)
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

  const checkForOverlap = (id) => {
    const currentNoteRef = boardRefs.current[id].current;
    const currentRect = currentNoteRef.getBoundingClientRect();

    return boards.some((note) => {
      if (note.id === id) return false;

      const otherNoteRef = boardRefs.current[note.id].current;
      const otherRect = otherNoteRef.getBoundingClientRect();

      const overlap = !(
        currentRect.right < otherRect.left ||
        currentRect.left > otherRect.right ||
        currentRect.bottom < otherRect.top ||
        currentRect.top > otherRect.bottom
      );

      return overlap;
    });
  };

  const updateBoardPosition = (id, newPosition) => {
    const updatedBoards = boards.map((note) =>
      note.id === id ? {...note, position: newPosition} : note
    );
    setBoards(updatedBoards);
    localStorage.setItem("notes", JSON.stringify(updatedBoards));
  };


  return (
    <div className="bg-gray-50 h-screen flex flex-col ">
      {/* Header */}
      <div className="bg-white shadow-sm z-10 p-4 shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-800">
          White Board Sharing App
        </h1>
        <p className="text-center text-sm text-gray-600">
          Room ID: <span className="font-mono font-semibold">{roomId}</span>
        </p>
        <button
        onClick={() => {
          // 1. Create the new list in a variable first
          const newBoard = { name: "b1", id: Date.now(),position:determineNewPosition() }; // Use Date.now() for unique IDs!
          const updatedBoards = [...boards, newBoard];

          // 2. Update State
          setBoards(updatedBoards);

          // 3. Save the NEW list to storage
          localStorage.setItem("boards", JSON.stringify(updatedBoards));
        }}
        >
          Add Board
        </button>
      </div>

      {/* Main Content Area */}
      <div ref={containerRef} className="relative flex-1 w-full bg-white cursor-crosshair">
        
        {/* Canvas Layer */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 block w-full h-full"
        > </canvas>

        <div className="relative z-10 p-4"> {/* Higher z-index to sit on top */}
          {
            boards.map((board)=>{
              return (
                <Board
                  key={board.id}
                  ref={
                    boardRefs.current[board.id]
                      ? boardRefs.current[board.id]
                      : (boardRefs.current[board.id] = createRef())
                  }
                  initialPos={board.position}
                  //content={board.text}
                  onMouseDown={(e) => handleDragStart(board, e)}
                />
              );
            })
          }
        </div>
        {/* Toggle Button (Mobile) */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-[60]">
            <button 
                onClick={() => setIsToolbarVisible(!isToolbarVisible)}
                className="bg-gray-800 text-white p-3 rounded-r-lg shadow-lg hover:bg-gray-700 transition-colors"
            >
                {isToolbarVisible ? (
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                )}
            </button>
        </div>

        {/* Floating Toolbar */}
        <aside 
          className={`
            absolute top-1/2 -translate-y-1/2 left-4 z-50
            bg-white rounded-xl shadow-2xl border border-gray-200 p-4
            flex flex-col gap-6 max-h-[90%] overflow-y-auto
            transition-transform duration-300 ease-in-out
            ${isToolbarVisible ? 'translate-x-0' : '-translate-x-[150%]'}
          `}
        >
          {/* Tools */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Tools</span>
            <div className="flex flex-col gap-2">
              {['pencil', 'line', 'rect', 'circle', 'eraser'].map((tool) => (
                <button
                  key={tool}
                  onClick={() => setSelectedTool(tool)}
                  className={`
                    p-2 rounded-lg flex items-center gap-2 transition-all
                    ${selectedTool === tool ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500' : 'hover:bg-gray-100 text-gray-600'}
                  `}
                  title={tool}
                >
                  <div className={`w-4 h-4 rounded-full border ${selectedTool === tool ? 'bg-blue-500 border-blue-600' : 'border-gray-400'}`}></div>
                  <span className="capitalize text-sm font-medium hidden lg:block">{tool === 'rect' ? 'Rect' : tool}</span>
                </button>
              ))}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Styles */}
          <div className="flex flex-col gap-3 items-center">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Style</span>
             <div className="relative group">
                <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-10 h-10 cursor-pointer rounded-full border-2 border-gray-200 overflow-hidden p-0"
                />
             </div>
             <div className="flex flex-col items-center gap-1">
                <input
                    type="range"
                    min="1"
                    max="20"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-2 h-24 -rotate-180" 
                    style={{ writingMode: 'bt-lr', appearance: 'slider-vertical' }}
                />
                <span className="text-[10px] text-gray-500 font-mono">{brushSize}px</span>
             </div>
          </div>

          <hr className="border-gray-100" />

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={undo}
              disabled={historyStep <= 0}
              className="p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-xs font-bold"
            >
              Undo
            </button>
            <button
              onClick={redo}
              disabled={historyStep >= history.length - 1}
              className="p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-xs font-bold"
            >
              Redo
            </button>
            <button
              onClick={clearCanvas}
              className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs font-bold"
            >
              Clear
            </button>
          </div>

        </aside>
      </div>
    </div>
  );
}