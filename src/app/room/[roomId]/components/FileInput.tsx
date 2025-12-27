// src/app/room/[roomId]/components/FileInput.tsx
'use client';

import { forwardRef } from 'react';

interface FileInputProps {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileInput = forwardRef<HTMLInputElement, FileInputProps>(({ onChange }, ref) => {
  return (
    <input
      ref={ref}
      type="file"
      onChange={onChange}
      accept="image/*"
      className="hidden"
    />
  );
});

FileInput.displayName = 'FileInput';
export default FileInput;
