// src/app/room/[roomId]/utils/positionUtils.ts
import { Position, BoardData } from '../types';

export const determineNewPosition = (): Position => {
  if (typeof window === 'undefined') return { x: 100, y: 100 };
  return {
    x: Math.floor(Math.random() * (window.innerWidth / 2)),
    y: Math.floor(Math.random() * (window.innerHeight / 2))
  };
};

export const checkForOverlap = (
  id: number | string,
  itemRefs: any,
  boards: BoardData[],
  images: BoardData[]
): boolean => {
  const currentNoteRef = itemRefs[id]?.current;
  if (!currentNoteRef) return false;
  const currentRect = currentNoteRef.getBoundingClientRect();

  const allItems = [...boards, ...images];

  return allItems.some((item) => {
    if (item.id === id) return false;
    const otherNoteRef = itemRefs[item.id]?.current;
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

export const calculateNewPosition = (
  itemRef: HTMLElement,
  containerRect: DOMRect,
  newX: number,
  newY: number
): Position => {
  const finalRect = itemRef.getBoundingClientRect();
  return {
    x: finalRect.left - containerRect.left,
    y: finalRect.top - containerRect.top
  };
};
