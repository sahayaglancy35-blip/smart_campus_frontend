import { useState, useRef, useEffect, useCallback } from "react";
import {
  CameraIcon,
  XMarkIcon,
  ArrowPathIcon,
  CheckIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

/**
 * CameraCaptureModal
 * Provides live video preview, camera capture, retake, and permission denial handling.
 * Works across Chrome, Firefox, Safari, Android, and iOS.
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - onCapture: (file: File) => void
 */
export function CameraCaptureModal({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [capturedUrl, setCapturedUrl] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [permissionError, setPermissionError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [facingMode, setFacingMode] = useState("user"); // 'user' or 'environment'

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startStream = useCallback(async (mode = facingMode) => {
    setIsLoading(true);
    setPermissionError("");
    setCapturedUrl(null);
    setCapturedBlob(null);

    stopStream();

    if (!navigator?.mediaDevices?.getUserMedia) {
      setPermissionError(
        "Camera access is not supported by your browser or environment. Please upload a photo instead."
      );
      setIsLoading(false);
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(() => {});
        };
      }
    } catch (err) {
      console.warn("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionError(
          "Camera permission was denied. Please allow camera access in your browser settings, or use the file upload option instead."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setPermissionError("No camera device was detected on your device.");
      } else {
        setPermissionError(
          `Unable to access camera: ${err.message || "Unknown error"}. Please check permissions or upload a file.`
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    if (isOpen) {
      startStream();
    } else {
      stopStream();
      setCapturedUrl(null);
      setCapturedBlob(null);
      setPermissionError("");
    }
    return () => {
      stopStream();
    };
  }, [isOpen, startStream, stopStream]);

  // Capture still frame from live stream and resize/crop to square 512x512
  const handleTakePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    const targetSize = 512;
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext("2d");

    // Center-crop to a square
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    const minDim = Math.min(videoWidth, videoHeight);
    const startX = (videoWidth - minDim) / 2;
    const startY = (videoHeight - minDim) / 2;

    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const previewUrl = URL.createObjectURL(blob);
        setCapturedUrl(previewUrl);
        setCapturedBlob(blob);
        stopStream();
      },
      "image/jpeg",
      0.9
    );
  };

  const handleRetake = () => {
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
    }
    setCapturedUrl(null);
    setCapturedBlob(null);
    startStream();
  };

  const handleConfirmPhoto = () => {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `camera-photo-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    onCapture(file);
    onClose();
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    startStream(nextMode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Take profile photo"
        className="relative flex flex-col w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 bg-gray-50/80">
          <div className="flex items-center gap-2">
            <CameraIcon className="h-5 w-5 text-green-800" />
            <h4 className="text-sm font-bold text-gray-900">Take Profile Photo</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative flex flex-col items-center justify-center bg-gray-950 min-h-[340px] overflow-hidden">
          {permissionError ? (
            <div className="p-6 text-center max-w-sm">
              <ExclamationCircleIcon className="h-10 w-10 text-amber-500 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white mb-2">Camera Unavailable</p>
              <p className="text-xs text-gray-300 leading-relaxed">{permissionError}</p>
            </div>
          ) : capturedUrl ? (
            <div className="relative flex items-center justify-center w-full h-[340px]">
              <img
                src={capturedUrl}
                alt="Captured live preview"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="relative flex items-center justify-center w-full h-[340px]">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 text-white text-xs font-medium">
                  Starting camera...
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
              />
              {/* Circular framing overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-56 w-56 rounded-full border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 bg-white">
          {permissionError ? (
            <div className="flex w-full justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          ) : capturedUrl ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Retake
              </button>
              <button
                type="button"
                onClick={handleConfirmPhoto}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-800 px-4 py-2 text-xs font-semibold text-white hover:bg-green-900 transition shadow-sm"
              >
                <CheckIcon className="h-4 w-4" />
                Use Photo
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleFacingMode}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                title="Switch camera"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Switch
              </button>

              <button
                type="button"
                onClick={handleTakePhoto}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-full bg-green-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-green-900 shadow-md transition disabled:opacity-50"
              >
                <div className="h-3 w-3 rounded-full bg-white" />
                Capture
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CameraCaptureModal;
