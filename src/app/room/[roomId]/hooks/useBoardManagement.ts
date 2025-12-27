// src/app/room/[roomId]/hooks/useBoardManagement.ts
import { useState } from 'react';
import { socket } from '../../../lib/socket';
import { BoardData, Position } from '../types';
import { determineNewPosition } from '../utils/positionUtils';

export const useBoardManagement = (roomId: string, initialBoards: BoardData[] = []) => {
  const [boards, setBoards] = useState<BoardData[]>(initialBoards);

  const addBoard = (name: string) => {
    if (!name.trim()) return;

    const newBoard: BoardData = {
      id: Date.now(),
      type: 'text',
      name,
      position: determineNewPosition(),
      content: '<p>Hello World! 🌎</p>'
    };

    setBoards((prev) => [...prev, newBoard]);
    socket.emit('board:add', { roomId, boardData: newBoard });
  };

  const updateBoardPosition = (id: number | string, newPosition: Position) => {
    const board = boards.find((b) => b.id === id);
    if (!board) return;

    const updated = { ...board, position: newPosition };
    setBoards((prev) => prev.map((b) => (b.id === id ? updated : b)));
    socket.emit('board:update', { roomId, boardData: updated });
  };

  const updateBoardName = (id: number | string, newName: string) => {
    const board = boards.find((b) => b.id === id);
    if (!board) return;

    const updated = { ...board, name: newName };
    setBoards((prev) => prev.map((b) => (b.id === id ? updated : b)));
    socket.emit('board:update', { roomId, boardData: updated });
  };

  const updateBoardContent = (id: number | string, newContent: string) => {
    const board = boards.find((b) => b.id === id);
    if (!board || board.content === newContent) return;

    const updated = { ...board, content: newContent };
    setBoards((prev) => prev.map((b) => (b.id === id ? updated : b)));
    socket.emit('board:update', { roomId, boardData: updated });
  };

  const deleteBoard = (id: number | string) => {
    socket.emit('board:delete', { roomId, boardId: id });
    setBoards((prev) => prev.filter((b) => b.id !== id));
  };

  return {
    boards,
    setBoards,
    addBoard,
    updateBoardPosition,
    updateBoardName,
    updateBoardContent,
    deleteBoard
  };
};
