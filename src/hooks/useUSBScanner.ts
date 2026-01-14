"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseUSBScannerOptions {
  onScan: (barcode: string) => void;
  minLength?: number;
  maxDelay?: number;
  enabled?: boolean;
}

/**
 * Hook to listen for USB barcode scanner input.
 * USB scanners typically emulate keyboard input and send characters very quickly,
 * ending with Enter key.
 */
export function useUSBScanner({
  onScan,
  minLength = 8,
  maxDelay = 50,
  enabled = true,
}: UseUSBScannerOptions) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;

      // If too much time has passed, reset buffer
      if (timeSinceLastKey > maxDelay && bufferRef.current.length > 0) {
        bufferRef.current = "";
      }

      lastKeyTimeRef.current = now;

      // Handle Enter key - end of barcode
      if (event.key === "Enter") {
        if (bufferRef.current.length >= minLength) {
          // Valid barcode detected
          const barcode = bufferRef.current;
          bufferRef.current = "";
          onScan(barcode);
          event.preventDefault();
        }
        bufferRef.current = "";
        return;
      }

      // Only accept numeric characters and common barcode characters
      if (/^[0-9A-Za-z\-]$/.test(event.key)) {
        bufferRef.current += event.key;

        // Prevent buffer from growing too large
        if (bufferRef.current.length > 50) {
          bufferRef.current = bufferRef.current.slice(-50);
        }
      }
    },
    [onScan, minLength, maxDelay]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  // Return a function to manually clear the buffer
  return {
    clearBuffer: () => {
      bufferRef.current = "";
    },
  };
}
