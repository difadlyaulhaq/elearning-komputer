'use client';

import { useEffect } from 'react';

export const WebProtection = () => {
  useEffect(() => {
    // 1. Disable Right Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Disable Key Shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S)
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      // Ctrl + Shift + I/J/C
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
        e.preventDefault();
      }
      // Ctrl + U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
      }
      // Ctrl + S (Save Page)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
      }
    };

    // 3. Debugger Loop (Freezes execution if DevTools is open)
    // This is a common technique to make debugging very difficult
    const debuggerInterval = setInterval(() => {
      const startTime = performance.now();
      debugger;
      const endTime = performance.now();
      
      // If the difference is large, DevTools is likely open (paused on debugger)
      if (endTime - startTime > 100) {
        console.clear();
        // You could also redirect the user or show a warning
      }
    }, 1000);

    // 4. Disable Drag and Drop (Prevents dragging images/content to other tabs)
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragstart', handleDragStart);

    // Periodic Console Clearing
    const consoleClearInterval = setInterval(() => {
      console.clear();
      console.log("%cPERINGATAN!%c\nArea ini diawasi secara ketat oleh sistem keamanan Alfajr. Segala upaya akses ilegal akan dicatat.", 
        "color: red; font-size: 24px; font-weight: bold;", 
        "color: black; font-size: 14px;");
    }, 2000);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragstart', handleDragStart);
      clearInterval(debuggerInterval);
      clearInterval(consoleClearInterval);
    };
  }, []);

  return null; // This component doesn't render anything
};
