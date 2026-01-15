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
  const [apiAvailable, setApiAvailable] = useState(true);

  // Initialize reader
  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    // Check if MediaDevices API is available (requires HTTPS)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
      const isLocalhost = typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

      if (!isHttps && !isLocalhost) {
        setError("Kamera wymaga polaczenia HTTPS. Otworz strone przez https://");
      } else {
        setError("Twoja przegladarka nie wspiera dostepu do kamery");
      }
      setApiAvailable(false);
      return;
    }

    return () => {
      stopScanning();
    };
  }, []);

  // Get devices after permission is granted
  const refreshDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;

    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
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
    } catch (err) {
      console.error("Error getting devices:", err);
    }
  };

  const startScanning = async () => {
    if (!readerRef.current || !videoRef.current) return;

    setError(null);
    setIsScanning(true);

    try {
      // Use selectedDevice if available, otherwise use facingMode constraint for back camera
      const deviceId = selectedDevice || undefined;
      const constraints: MediaStreamConstraints = deviceId
        ? { video: { deviceId: { exact: deviceId } } }
        : { video: { facingMode: "environment" } };

      // First request camera permission
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach(track => track.stop()); // Stop this stream, we'll use ZXing's

      // Refresh device list after permission granted
      await refreshDevices();

      // Now start decoding
      await readerRef.current.decodeFromVideoDevice(
        selectedDevice || null,
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
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Dostep do kamery zostal zablokowany. Sprawdz uprawnienia w ustawieniach przegladarki.");
      } else {
        setError("Nie mozna uruchomic skanera. Sprawdz uprawnienia kamery.");
      }
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
            disabled={!apiAvailable}
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
          className="w-full px-4 py-2 border rounded-lg bg-background text-sm appearance-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
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
