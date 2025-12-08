'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { socket } from '../../lib/socket';

// Kanban imports
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  // -------------------- KANBAN FRONTEND STATE --------------------
  const [lists, setLists] = useState([
    {
      id: 'list-1',
      title: 'To Do',
      cards: [
        { id: 'card-1', title: 'Gather mission requirements' },
        { id: 'card-2', title: 'Prepare tactical overview' },
      ],
    },
    {
      id: 'list-2',
      title: 'In Progress',
      cards: [{ id: 'card-3', title: 'Building strategy board' }],
    },
    {
      id: 'list-3',
      title: 'Done',
      cards: [{ id: 'card-4', title: 'Squad assembled' }],
    },
  ]);

  function onDragEnd(result: DropResult) {
    const { source, destination } = result;
    if (!destination) return;

    const newLists = [...lists];

    const srcIdx = newLists.findIndex((l) => l.id === source.droppableId);
    const destIdx = newLists.findIndex((l) => l.id === destination.droppableId);

    const srcCards = [...newLists[srcIdx].cards];
    const [moved] = srcCards.splice(source.index, 1);

    newLists[srcIdx].cards = srcCards;

    const destCards = [...newLists[destIdx].cards];
    destCards.splice(destination.index, 0, moved);

    newLists[destIdx].cards = destCards;

    setLists(newLists);
  }

  // -------------------- WHITEBOARD STATE --------------------
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTool, setSelectedTool] = useState('pencil');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [imageData, setImageData] = useState<ImageData | null>(null);

  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

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

  // -------------------- WHITEBOARD LISTENERS --------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const handleMouseDown = (e: MouseEvent) => {
      setIsDrawing(true);
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

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
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

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
      }
      setIsDrawing(false);
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
      window.removeEventListener('resize', updateCanvasSize);
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

  // -------------------- SOCKET: RECEIVE DRAW EVENTS --------------------
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
        ctx.drawImage(img, 0, 0);

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

  // -------------------- UI --------------------

  return (
    <div className="bg-gray-50 min-h-screen p-4">
      <div className="max-w-6xl mx-auto">

        {/* ROOM HEADER */}
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          Ranger Ops Room
        </h1>
        <p className="text-center text-sm text-gray-600 mb-6">
          Room ID: <span className="font-mono font-semibold">{roomId}</span>
        </p>

        {/* -------------------- KANBAN BOARD -------------------- */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-10">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
            Mission Kanban Board
          </h2>

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-6 overflow-x-auto pb-2">
              {lists.map((list) => (
                <Droppable droppableId={list.id} key={list.id}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="w-72 bg-gray-50 border border-gray-200 rounded-lg p-4"
                    >
                      <h3 className="font-semibold text-lg mb-3 text-gray-700">
                        {list.title}
                      </h3>

                      {list.cards.map((card, index) => (
                        <Draggable
                          draggableId={card.id}
                          index={index}
                          key={card.id}
                        >
                          {(prov) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className="p-3 bg-blue-100 rounded mb-3 shadow-sm cursor-grab"
                            >
                              {card.title}
                            </div>
                          )}
                        </Draggable>
                      ))}

                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        </div>

        {/* -------------------- WHITEBOARD -------------------- */}
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Real-time Collaborative Whiteboard
        </h2>

        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          {/* TOOLS */}
          <div className="flex gap-4 items-center flex-wrap mb-4">
            {['pencil', 'line', 'rect', 'circle', 'eraser'].map((tool) => (
              <label
                key={tool}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="tool"
                  value={tool}
                  checked={selectedTool === tool}
                  onChange={(e) => setSelectedTool(e.target.value)}
                />
                <span className="capitalize">{tool}</span>
              </label>
            ))}
          </div>

          {/* COLOR + SIZE */}
          <div className="flex gap-6 items-center mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span>Color:</span>
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <span>Size:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
              />
              <span>{brushSize}px</span>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <button
              onClick={undo}
              className="px-4 py-2 bg-blue-500 text-white rounded-md"
            >
              Undo
            </button>
            <button
              onClick={redo}
              className="px-4 py-2 bg-blue-500 text-white rounded-md"
            >
              Redo
            </button>
            <button
              onClick={clearCanvas}
              className="px-4 py-2 bg-red-500 text-white rounded-md"
            >
              Clear Canvas
            </button>
          </div>
        </div>

        {/* CANVAS */}
        <div className="bg-white rounded-lg shadow p-2">
          <canvas
            ref={canvasRef}
            width={1200}
            height={600}
            className="border border-gray-300 w-full cursor-crosshair"
          />
        </div>
      </div>
    </div>
  );
}
