// src/app/room/[roomId]/components/Canvas.tsx
'use client';

import { forwardRef } from 'react';

const Canvas = forwardRef<HTMLCanvasElement>((props, ref) => {
  return <canvas ref={ref} className="absolute top-0 left-0 block w-full" />;
});

Canvas.displayName = 'Canvas';
export default Canvas;
