// src/app/room/[roomId]/hooks/useCanvasDrawing.ts
import { useEffect, useState } from 'react';
import { drawOnCanvas, emitCanvasImage } from '../utils/canvasUtils';

interface UseCanvasDrawingProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  roomId: string;
  selectedTool: string;
  selectedColor: string;
  brushSize: number;
  isDrawing: boolean;
  setIsDrawing: (value: boolean) => void;
  startX: number;
  setStartX: (value: number) => void;
  startY: number;
  setStartY: (value: number) => void;
  imageData: ImageData | null;
  setImageData: (value: ImageData | null) => void;
  onEmitDraw: (canvas: HTMLCanvasElement) => void;
}

export const useCanvasDrawing = ({
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
  onEmitDraw
}: UseCanvasDrawingProps) => {
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

      drawOnCanvas(ctx, selectedTool, x, y, startX, startY, selectedColor, brushSize, imageData);
    };

    const finishStroke = () => {
      if (isDrawing) {
        const canvas = canvasRef.current;
        if (canvas) onEmitDraw(canvas);
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
};
