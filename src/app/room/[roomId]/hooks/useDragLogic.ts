// src/app/room/[roomId]/hooks/useDragLogic.ts
import { useCallback } from 'react';
import { BoardData, Position } from '../types';
import { checkForOverlap } from '../utils/positionUtils';

interface UseDragLogicProps {
  boards: BoardData[];
  images: BoardData[];
  itemRefs: any;
  onUpdatePosition: (id: number | string, newPosition: Position, type: 'text' | 'image') => void;
}

export const useDragLogic = ({ boards, images, itemRefs, onUpdatePosition }: UseDragLogicProps) => {
  const handleDragStart = useCallback(
    (item: BoardData, e: React.MouseEvent) => {
      e.preventDefault();
      const { id, type } = item;
      const itemRef = itemRefs[id]?.current;
      const container = document.querySelector('[data-container="room-canvas"]');

      if (!itemRef || !container) return;

      const containerRef = container as HTMLDivElement;
      const itemRect = itemRef.getBoundingClientRect();
      const containerRect = containerRef.getBoundingClientRect();
      const offsetX = e.clientX - itemRect.left;
      const offsetY = e.clientY - itemRect.top;
      const startPos = item.position;

      const handleMouseMove = (e: MouseEvent) => {
        const newX = e.clientX - offsetX - containerRect.left;
        let newY = e.clientY - offsetY - containerRect.top;
        if (newY < 0) newY = 0;

        itemRef.style.left = `${newX}px`;
        itemRef.style.top = `${newY}px`;
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        const finalRect = itemRef.getBoundingClientRect();
        const newPosition: Position = {
          x: finalRect.left - containerRect.left,
          y: finalRect.top - containerRect.top
        };

        if (checkForOverlap(id, itemRefs, boards, images)) {
          itemRef.style.left = `${startPos.x}px`;
          itemRef.style.top = `${startPos.y}px`;
        } else {
          onUpdatePosition(id, newPosition, type);
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [boards, images, itemRefs, onUpdatePosition]
  );

  return { handleDragStart };
};
