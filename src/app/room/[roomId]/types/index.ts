// src/app/room/[roomId]/types/index.ts

export type Position = { x: number; y: number };

export type BoardData = {
  id: number | string;
  type: 'text' | 'image';
  name: string;
  position: Position;
  content: string;
};

export type DrawingState = {
  selectedTool: string;
  selectedColor: string;
  brushSize: number;
  isDrawing: boolean;
  startX: number;
  startY: number;
  imageData: ImageData | null;
};

export type User = {
  id: string;
  roomId: string;
  socketId: string;
};
