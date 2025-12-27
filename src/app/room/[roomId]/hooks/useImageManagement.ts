// src/app/room/[roomId]/hooks/useImageManagement.ts
import { useState } from 'react';
import { socket } from '../../../lib/socket';
import { BoardData, Position } from '../types';
import { determineNewPosition, processImageUpload } from '../utils/imageUtils';

export const useImageManagement = (roomId: string, initialImages: BoardData[] = []) => {
  const [images, setImages] = useState<BoardData[]>(initialImages);

  const addImage = async (file: File) => {
    try {
      const base64Image = await processImageUpload(file);

      const newImage: BoardData = {
        id: Date.now(),
        type: 'image',
        name: file.name,
        position: determineNewPosition(),
        content: base64Image
      };

      setImages((prev) => [...prev, newImage]);
      socket.emit('image:add', { roomId, imageData: newImage });
    } catch (err) {
      console.error('Image processing failed', err);
      alert('Could not process image.');
    }
  };

  const updateImagePosition = (id: number | string, newPosition: Position) => {
    const img = images.find((i) => i.id === id);
    if (!img) return;

    const updated = { ...img, position: newPosition };
    setImages((prev) => prev.map((i) => (i.id === id ? updated : i)));
    socket.emit('image:update', { roomId, imageData: updated });
  };

  const updateImageName = (id: number | string, newName: string) => {
    const img = images.find((i) => i.id === id);
    if (!img) return;

    const updated = { ...img, name: newName };
    setImages((prev) => prev.map((i) => (i.id === id ? updated : i)));
    socket.emit('image:update', { roomId, imageData: updated });
  };

  const deleteImage = (id: number | string) => {
    socket.emit('image:delete', { roomId, imageId: id });
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  return {
    images,
    setImages,
    addImage,
    updateImagePosition,
    updateImageName,
    deleteImage
  };
};
