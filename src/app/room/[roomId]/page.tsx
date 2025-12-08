'use client';

import { useUser } from "@clerk/nextjs";

import React, {
  useEffect,
  useRef,
  useState,
  createRef,
  MouseEvent as ReactMouseEvent,
} from 'react';
import { useParams } from 'next/navigation';
import { socket } from '../../lib/socket';
import Board from './Board';

interface BoardPosition {
  x: number;
  y: number;
}

interface BoardData {
  id: number;
  name: string;
  position: BoardPosition;
}

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  const { user, isLoaded } = useUser();
  const username = user?.username || user?.fullName || "Anonymous";
  const userId = user?.id || socket.id;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // FIXED: presence structure
  const [onlineUsers, setOnlineUsers] = useState<{ userId: string; username: string }[]>([]);

  // Drawing State
  const [selectedTool, setSelectedTool] = useState<'pencil' | 'line' | 'rect' | 'circle' | 'eraser'>('pencil');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [imageData, setImageData] = useState<ImageData | null>(null);

  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  const saveToHistory = () => {
    if (!canvasRef.current) return;

    setHistoryStep((prev) => {
      const newStep = prev + 1;
      setHistory((prevHistory) => [
        ...(Array.isArray(prevHistory) ? prevHistory.slice(0, newStep) : []),
        canvasRef.current!.toDataURL(),
      ]);
      return newStep;
    });
  };

  const emitCanvasImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !roomId) return;
    const image = canvas.toDataURL('image/png');
    // Emitting the full image data for collaboration
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

  // Canvas size effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const handleResize = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // Preserve drawing on resize
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

  // Drawing engine
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
      // Save current canvas state before starting a new shape/stroke
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

      // Restore the saved image data for tools that redraw on mouse move (line, rect, circle)
      if (['line', 'rect', 'circle'].includes(selectedTool) && imageData) {
        ctx.putImageData(imageData, 0, 0);
      }

      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';

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
        case 'rect':
          ctx.strokeRect(startX, startY, x - startX, y - startY);
          break;
        case 'circle':
          const radius = Math.hypot(x - startX, y - startY);
          ctx.beginPath();
          ctx.arc(startX, startY, radius, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'eraser':
          // Use 'destination-out' to erase
          const originalGlobalCompositeOperation = ctx.globalCompositeOperation;
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = originalGlobalCompositeOperation;
          break;
      }
    };

    const finishStroke = () => {
      if (isDrawing) {
        // Only save and emit if an action was actually taken
        saveToHistory();
        emitCanvasImage();
        setIsDrawing(false);
      }
      ctx.beginPath();
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', finishStroke);
    canvas.addEventListener('mouseleave', finishStroke);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', finishStroke);
      canvas.removeEventListener('mouseleave', finishStroke);
    };
  }, [isDrawing, selectedTool, selectedColor, brushSize, startX, startY, imageData]);

  // 🛠️ FIX: REMOTE DRAWING LISTENER (Collaboration Feature)
  useEffect(() => {
    if (!roomId || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleRemoteDraw = ({ incomingRoom, image }: { incomingRoom: string, image: string }) => {
      if (incomingRoom !== roomId) return;

      // Only update the canvas if the user is not currently drawing locally.
      // This prevents remote updates from interfering with an active local stroke.
      if (!isDrawing) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = image;
      }
    };

    socket.on("draw", handleRemoteDraw);

    return () => {
      socket.off("draw", handleRemoteDraw);
    };
  }, [roomId, isDrawing]); // Include isDrawing to prevent remote updates during local drawing


  // PRESENCE: USER JOIN/LEAVE & UPDATE (Handles room join/leave on socket.io)
  useEffect(() => {
    if (!roomId) return;
    if (!isLoaded) return; // Wait for Clerk to fully load user
    if (!user) return;

    const realUserId = user.id;
    const realUsername = user.username || user.fullName || "Anonymous";

    // Make sure socket is connected
    socket.connect();

    const handleConnect = () => {
      // Joining the room and updating presence
      socket.emit("presence:join", {
        roomId,
        userId: realUserId,
        username: realUsername,
      });
    };

    const handlePresenceUpdate = (
      users: { userId: string; username: string }[]
    ) => {
      setOnlineUsers(Array.isArray(users) ? users : []);
    };

    // Set up listeners
    socket.on("connect", handleConnect);
    socket.on("presence:update", handlePresenceUpdate);

    // Initial join attempt if already connected
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      // Emit presence leave on unmount/cleanup
      socket.emit("presence:leave", {
        roomId,
        userId: realUserId,
      });

      // Clean up listeners
      socket.off("connect", handleConnect);
      socket.off("presence:update", handlePresenceUpdate);
    };
  }, [roomId, isLoaded, user]);

  // Removed the redundant useEffect for 'userJoined'/'userLeft'
  // The 'presence:join' event already handles joining the socket.io room.


  // Boards
  const [boards, setBoards] = useState<BoardData[]>([]);

  useEffect(() => {
    const savedBoards = JSON.parse(localStorage.getItem('boards') || '[]');
    setBoards(savedBoards);
  }, []);

  const boardRefs = useRef<React.RefObject<HTMLDivElement | null>[]>([]);

  const determineNewPosition = (): BoardPosition => {
    const maxX = window.innerWidth - 250;
    const maxY = window.innerHeight - 250;

    return {
      x: Math.floor(Math.random() * maxX),
      y: Math.floor(Math.random() * maxY),
    };
  };

  const handleDragStart = (board: BoardData, e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();

    const { id } = board;
    // @ts-ignore
    const boardRef = boardRefs.current[id]?.current;
    const container = containerRef.current;

    if (!boardRef || !container) return;

    const boardRect = boardRef.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const offsetX = e.clientX - boardRect.left;
    const offsetY = e.clientY - boardRect.top;

    const handleMouseMove = (eMove: MouseEvent) => {
      const newX = eMove.clientX - offsetX - containerRect.left;
      const newY = eMove.clientY - offsetY - containerRect.top;

      boardRef.style.left = `${newX}px`;
      boardRef.style.top = `${newY}px`;
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      const finalRect = boardRef.getBoundingClientRect();

      const newPosition: BoardPosition = {
        x: finalRect.left - containerRect.left,
        y: finalRect.top - containerRect.top,
      };

      updateBoardPosition(id, newPosition);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const updateBoardPosition = (id: number, newPosition: BoardPosition) => {
    const updatedBoards = boards.map((note) =>
      note.id === id ? { ...note, position: newPosition } : note
    );
    setBoards(updatedBoards);
    localStorage.setItem('boards', JSON.stringify(updatedBoards));
  };

  // ------------------- UI -------------------
  return (
    <div className="bg-gray-50 h-screen flex flex-col">

      {/* FIXED: Presence Display */}
      <div className="flex items-center justify-center gap-2 mt-2 p-2 bg-gray-100 shadow-sm z-20">
        <span className="font-semibold text-sm text-gray-700">Online Users ({onlineUsers.length}):</span>
        {onlineUsers.map((usr) => (
          <div 
            key={usr.userId} 
            className={`text-xs px-2 py-1 rounded-full ${usr.userId === userId ? 'bg-blue-500 text-white' : 'bg-green-200 text-green-800'}`}
          >
            {usr.username} 
          </div>
        ))}
      </div>

      <div className="bg-white shadow-md z-10 p-4 shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-800">
          White Board Sharing App
        </h1>
        <p className="text-center text-sm text-gray-600">
          Room ID: <span className="font-mono font-semibold">{roomId}</span>
        </p>

        <button
          onClick={() => {
            const newBoard: BoardData = {
              name: 'b1',
              id: Date.now(),
              position: determineNewPosition(),
            };
            const updatedBoards = [...boards, newBoard];
            setBoards(updatedBoards);
            localStorage.setItem('boards', JSON.stringify(updatedBoards));
          }}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
        >
          Add Board
        </button>
      </div>

      <div ref={containerRef} className="relative flex-1 w-full bg-white cursor-crosshair">
        <canvas ref={canvasRef} className="absolute top-0 left-0 block w-full h-full" />

        <div className="relative z-10 p-4">
          {boards.map((board) => (
            <Board
              key={board.id}
              ref={
                // @ts-ignore
                boardRefs.current[board.id]
                  ? boardRefs.current[board.id]
                  : (boardRefs.current[board.id] = createRef())
              }
              initialPos={board.position}
              onMouseDown={(e) => handleDragStart(board, e)}
            />
          ))}
        </div>

        {/* Toolbar toggle */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-60">
          <button
            onClick={() => setIsToolbarVisible(!isToolbarVisible)}
            className="bg-gray-800 text-white p-3 rounded-r-lg shadow-lg hover:bg-gray-700 transition-colors"
          >
            {isToolbarVisible ? "<" : ">"}
          </button>
        </div>

      </div>
    </div>
  );
}