"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { Camera, CameraOff, FlipHorizontal } from "lucide-react";

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
}

export default function CameraScanner({ onScan, onError }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [lastScanned, setLastScanned] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Initialize reader and get camera devices
  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    // Get available video devices
    navigator.mediaDevices
      .enumerateDevices()
      .then((deviceList) => {
        const videoDevices = deviceList.filter((d) => d.kind === "videoinput");
        setDevices(videoDevices);

        // Prefer back camera on mobile
        const backCamera = videoDevices.find(
          (d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("rear") ||
            d.label.toLowerCase().includes("environment")
        );
        if (backCamera) {
          setSelectedDevice(backCamera.deviceId);
        } else if (videoDevices.length > 0) {
          setSelectedDevice(videoDevices[0].deviceId);
        }
      })
      .catch((err) => {
        console.error("Error getting devices:", err);
        setError("Nie mozna uzyskac dostepu do kamer");
      });

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    if (!readerRef.current || !videoRef.current || !selectedDevice) return;

    setError(null);
    setIsScanning(true);

    try {
      await readerRef.current.decodeFromVideoDevice(
        selectedDevice,
        videoRef.current,
        (result, err) => {
          if (result) {
            const code = result.getText();
            // Prevent duplicate scans within 2 seconds
            if (code !== lastScanned) {
              setLastScanned(code);
              onScan(code);

              // Reset last scanned after 2 seconds
              setTimeout(() => setLastScanned(""), 2000);
            }
          }
          if (err && !(err instanceof NotFoundException)) {
            console.error("Scan error:", err);
          }
        }
      );
    } catch (err) {
      console.error("Error starting scanner:", err);
      setError("Nie mozna uruchomic skanera. Sprawdz uprawnienia kamery.");
      onError?.("Nie mozna uruchomic skanera");
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setIsScanning(false);
  };

  const switchCamera = () => {
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDevice);
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedDevice(devices[nextIndex].deviceId);

    // Restart scanning with new device
    if (isScanning) {
      stopScanning();
      setTimeout(startScanning, 100);
    }
  };

  return (
    <div className="space-y-4">
      {/* Video preview */}
      <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Scan line animation */}
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2">
              <div className="h-0.5 bg-primary animate-pulse" />
            </div>

            {/* Corner markers */}
            <div className="absolute top-8 left-8 w-12 h-12 border-l-4 border-t-4 border-primary" />
            <div className="absolute top-8 right-8 w-12 h-12 border-r-4 border-t-4 border-primary" />
            <div className="absolute bottom-8 left-8 w-12 h-12 border-l-4 border-b-4 border-primary" />
            <div className="absolute bottom-8 right-8 w-12 h-12 border-r-4 border-b-4 border-primary" />
          </div>
        )}

        {/* No camera message */}
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center text-muted-foreground">
              <CameraOff className="w-12 h-12 mx-auto mb-2" />
              <p>Kliknij przycisk ponizej aby uruchomic kamere</p>
            </div>
          </div>
        )}

        {/* Last scanned indicator */}
        {lastScanned && (
          <div className="absolute bottom-4 inset-x-4 bg-primary text-primary-foreground text-center py-2 px-4 rounded-lg text-sm font-medium">
            Zeskanowano: {lastScanned}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {isScanning ? (
          <>
            <button
              onClick={stopScanning}
              className="flex-1 py-3 px-4 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2"
            >
              <CameraOff className="w-5 h-5" />
              Zatrzymaj
            </button>
            {devices.length > 1 && (
              <button
                onClick={switchCamera}
                className="py-3 px-4 border rounded-lg hover:bg-accent transition-colors"
                title="Zmien kamere"
              >
                <FlipHorizontal className="w-5 h-5" />
              </button>
            )}
          </>
        ) : (
          <button
            onClick={startScanning}
            disabled={!selectedDevice}
            className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Uruchom kamere
          </button>
        )}
      </div>

      {/* Device selector (if multiple cameras) */}
      {devices.length > 1 && !isScanning && (
        <select
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg bg-background text-sm"
        >
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Kamera ${devices.indexOf(device) + 1}`}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
