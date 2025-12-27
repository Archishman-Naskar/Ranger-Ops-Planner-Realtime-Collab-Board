// src/app/room/[roomId]/utils/canvasUtils.ts

export const emitCanvasImage = (canvas: HTMLCanvasElement | null, roomId: string, emit: (event: string, data: any) => void) => {
  if (!canvas || !roomId) return;
  const image = canvas.toDataURL('image/png');
  emit('draw', { roomId, image });
};

export const clearCanvasContent = (canvas: HTMLCanvasElement | null, roomId: string, emit: (event: string, data: any) => void) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx?.clearRect(0, 0, canvas.width, canvas.height);
  emitCanvasImage(canvas, roomId, emit);
};

export const resizeCanvas = (
  canvas: HTMLCanvasElement,
  container: HTMLDivElement,
  allItems: any[],
  previousUrl: string
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const lowestItemBottom = allItems.reduce((max, item) => {
    return Math.max(max, item.position.y + 600);
  }, 0);

  const requiredHeight = Math.max(window.innerHeight, lowestItemBottom);
  const requiredWidth = container.clientWidth;

  if (canvas.height !== requiredHeight || canvas.width !== requiredWidth) {
    const tempUrl = previousUrl || canvas.toDataURL();
    canvas.width = requiredWidth;
    canvas.height = requiredHeight;
    container.style.height = `${requiredHeight}px`;

    if (tempUrl) {
      const img = new Image();
      img.src = tempUrl;
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
    }
  }
};

export const drawOnCanvas = (
  ctx: CanvasRenderingContext2D,
  tool: string,
  x: number,
  y: number,
  startX: number,
  startY: number,
  color: string,
  size: number,
  imageData: ImageData | null
) => {
  if (imageData && ['line', 'rect', 'circle'].includes(tool)) {
    ctx.putImageData(imageData, 0, 0);
  }

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (tool) {
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
      const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
      ctx.beginPath();
      ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
      ctx.stroke();
      break;
    }
    case 'eraser':
      ctx.clearRect(x - size / 2, y - size / 2, size, size);
      break;
  }
};
