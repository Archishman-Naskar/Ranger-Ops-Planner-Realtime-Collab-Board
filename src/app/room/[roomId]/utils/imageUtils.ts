export const determineNewPosition = () => {
  // Random position between 50-200 pixels from top-left
  return {
    x: Math.random() * 100 + 50,
    y: Math.random() * 100 + 50
  };
};

export const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 800;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const processImageUpload = async (file: File): Promise<string> => {
  try {
    const base64Image = await resizeImage(file);
    return base64Image;
  } catch (err) {
    console.error('Image processing failed', err);
    throw new Error('Could not process image.');
  }
};
