'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { socket } from '../../lib/socket';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;

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
            Math.pow(x - startX, 2) + Math.pow(y - startY, 2),
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
            brushSize,
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
      // 1) Draw received image to canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 2) Ensure history/step advance for this window
      setHistoryStep((prevStep) => {
        const baseStep = prevStep < 0 ? 0 : prevStep;      // handle first time
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



  return (
    <div className="bg-gray-50 min-h-screen p-2 sm:p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-4xl font-bold text-center mb-2 sm:mb-4 text-gray-800">
          White Board Sharing App
        </h1>
        <p className="text-center text-sm text-gray-600 mb-4 sm:mb-6">
          Room ID: <span className="font-mono font-semibold">{roomId}</span>
        </p>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
          {/* Tools */}
          <div className="flex gap-3 sm:gap-6 items-center flex-wrap mb-4">
            {['pencil', 'line', 'rect', 'circle', 'eraser'].map((tool) => (
              <div key={tool} className="flex items-center gap-2">
                <input
                  type="radio"
                  id={tool}
                  name="tool"
                  value={tool}
                  checked={selectedTool === tool}
                  onChange={(e) => setSelectedTool(e.target.value)}
                  className="w-4 h-4 cursor-pointer"
                />
                <label
                  htmlFor={tool}
                  className="cursor-pointer font-semibold text-sm sm:text-base text-gray-700 capitalize"
                >
                  {tool === 'rect' ? 'Rectangle' : tool}
                </label>
              </div>
            ))}
          </div>

          {/* Color & Size */}
          <div className="flex gap-3 sm:gap-6 items-center flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <label
                htmlFor="color"
                className="font-semibold text-sm sm:text-base text-gray-700"
              >
                Color:
              </label>
              <input
                type="color"
                id="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-8 h-8 sm:w-10 sm:h-10 cursor-pointer rounded"
              />
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="size"
                className="font-semibold text-sm sm:text-base text-gray-700"
              >
                Size:
              </label>
              <input
                type="range"
                id="size"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-24 sm:w-32 cursor-pointer"
              />
              <span className="text-gray-600 font-semibold text-sm">
                {brushSize}px
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 sm:gap-4 flex-wrap">
            <button
              onClick={undo}
              disabled={historyStep <= 0}
              className="px-3 sm:px-4 py-2 bg-blue-500 text-white font-semibold text-sm rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Undo
            </button>

            <button
              onClick={redo}
              disabled={historyStep >= history.length - 1}
              className="px-3 sm:px-4 py-2 bg-blue-500 text-white font-semibold text-sm rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Redo
            </button>

            <button
              onClick={clearCanvas}
              className="px-3 sm:px-4 py-2 bg-red-500 text-white font-semibold text-sm rounded-md hover:bg-red-600 transition-colors"
            >
              Clear Canvas
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden w-full">
          <canvas
            ref={canvasRef}
            width={1200}
            height={600}
            className="border border-gray-300 cursor-crosshair w-full"
          />
        </div>
      </div>
    </div>
  );
}
