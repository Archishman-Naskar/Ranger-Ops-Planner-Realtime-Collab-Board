// src/app/room/[roomId]/components/ItemRenderer.tsx
'use client';

import { createRef } from 'react';
import Board from './Board';
import IBoard from './IBoard';
import { BoardData } from '../types';

interface ItemRendererProps {
  boards: BoardData[];
  images: BoardData[];
  itemRefs: any;
  onDragStart: (item: BoardData, e: React.MouseEvent) => void;
  onBoardContentChange: (id: number | string, content: string) => void;
  onBoardRename: (id: number | string, name: string) => void;
  onBoardDelete: (id: number | string) => void;
  onImageRename: (id: number | string, name: string) => void;
  onImageDelete: (id: number | string) => void;
}

export default function ItemRenderer({
  boards,
  images,
  itemRefs,
  onDragStart,
  onBoardContentChange,
  onBoardRename,
  onBoardDelete,
  onImageRename,
  onImageDelete
}: ItemRendererProps) {
  return (
    <>
      {/* RENDER TEXT BOARDS */}
      {boards.map((board) => (
        <div key={board.id} className="pointer-events-auto absolute">
          <Board
            ref={itemRefs[board.id] ? itemRefs[board.id] : (itemRefs[board.id] = createRef())}
            id={board.id}
            name={board.name}
            initialPos={board.position}
            content={board.content}
            onContentChange={(newContent) => onBoardContentChange(board.id, newContent)}
            onMouseDown={(e) => onDragStart(board, e)}
            onRename={(newName) => onBoardRename(board.id, newName)}
            onDelete={() => onBoardDelete(board.id)}
          />
        </div>
      ))}

      {/* RENDER IMAGES */}
      {images.map((img) => (
        <div key={img.id} className="pointer-events-auto absolute">
          <IBoard
            ref={itemRefs[img.id] ? itemRefs[img.id] : (itemRefs[img.id] = createRef())}
            id={img.id}
            name={img.name}
            initialPos={img.position}
            content={img.content}
            onMouseDown={(e) => onDragStart(img, e)}
            onRename={(newName) => onImageRename(img.id, newName)}
            onDelete={() => onImageDelete(img.id)}
          />
        </div>
      ))}
    </>
  );
}
