// src/app/room/[roomId]/hooks/useRoomSocket.ts
import { useEffect } from 'react';
import { socket } from '../../../lib/socket';
import { BoardData } from '../types';

interface UseRoomSocketProps {
  roomId: string;
  userIdRef: React.MutableRefObject<string>;
  setBoards: (boards: BoardData[]) => void;
  setImages: (images: BoardData[]) => void;
  setUsers: (users: any[]) => void;
  onDrawReceived: (image: string | null) => void;
}

export const useRoomSocket = ({
  roomId,
  userIdRef,
  setBoards,
  setImages,
  setUsers,
  onDrawReceived
}: UseRoomSocketProps) => {
  useEffect(() => {
    if (!roomId) return;

    if (!userIdRef.current) userIdRef.current = socket.id || `user-${Date.now()}`;
    const userId = userIdRef.current;

    socket.emit('userJoined', { userId, roomId });

    // --- CANVAS HANDLERS ---
    const handleDraw = ({ roomId: incomingRoom, image }: { roomId: string; image: string | null }) => {
      if (incomingRoom !== roomId) return;
      onDrawReceived(image);
    };

    const handleUserList = (data: any) => {
      const userList = Array.isArray(data) ? data : data.users;
      if (userList) setUsers(userList);
    };

    // --- TEXT BOARD HANDLERS ---
    const handleBoardsSync = (serverBoards: BoardData[]) => setBoards(serverBoards || []);

    const handleBoardAdd = (newBoard: BoardData) => {
      setBoards((prev) => {
        if (prev.find((b) => b.id === newBoard.id)) return prev;
        return [...prev, newBoard];
      });
    };

    const handleBoardUpdate = (updatedBoard: BoardData) => {
      setBoards((prev) => prev.map((b) => (b.id === updatedBoard.id ? updatedBoard : b)));
    };

    const handleBoardDelete = (boardId: string | number) => {
      setBoards((prev) => prev.filter((b) => b.id !== boardId));
    };

    // --- IMAGE HANDLERS ---
    const handleImagesSync = (serverImages: BoardData[]) => setImages(serverImages || []);

    const handleImageAdd = (newImage: BoardData) => {
      setImages((prev) => {
        if (prev.find((img) => img.id === newImage.id)) return prev;
        return [...prev, newImage];
      });
    };

    const handleImageUpdate = (updatedImage: BoardData) => {
      setImages((prev) => prev.map((img) => (img.id === updatedImage.id ? updatedImage : img)));
    };

    const handleImageDelete = (imageId: string | number) => {
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    };

    // --- Register Listeners ---
    socket.on('draw', handleDraw);
    socket.on('userIsJoined', handleUserList);
    socket.on('allUsers', handleUserList);

    socket.on('boards:sync', handleBoardsSync);
    socket.on('board:add', handleBoardAdd);
    socket.on('board:update', handleBoardUpdate);
    socket.on('board:delete', handleBoardDelete);

    socket.on('images:sync', handleImagesSync);
    socket.on('image:add', handleImageAdd);
    socket.on('image:update', handleImageUpdate);
    socket.on('image:delete', handleImageDelete);

    return () => {
      socket.off('draw', handleDraw);
      socket.off('userIsJoined', handleUserList);
      socket.off('allUsers', handleUserList);

      socket.off('boards:sync', handleBoardsSync);
      socket.off('board:add', handleBoardAdd);
      socket.off('board:update', handleBoardUpdate);
      socket.off('board:delete', handleBoardDelete);

      socket.off('images:sync', handleImagesSync);
      socket.off('image:add', handleImageAdd);
      socket.off('image:update', handleImageUpdate);
      socket.off('image:delete', handleImageDelete);
    };
  }, [roomId]);
};
