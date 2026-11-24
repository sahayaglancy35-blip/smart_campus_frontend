import { useState, useRef, useEffect, useCallback } from "react";
import {
  XMarkIcon,
  CheckIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

/**
 * ImageCropModal
 * Standalone modal offering circular framing, pan/drag, zoom slider, and 90-deg rotation.
 * Outputs a cropped, high-resolution square JPEG file. Zero external dependencies.
 *
 * Props:
 *  - isOpen: boolean
 *  - imageSrc: string (URL or data URL)
 *  - fileName: string
 *  - onClose: () => void
 *  - onCropComplete: (croppedFile: File) => void
 */
export function ImageCropModal({
  isOpen,
  imageSrc,
  fileName = "photo.jpg",
  onClose,
  onCropComplete,
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  // Handle pointer drag for panning
  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Zoom controls with mouse wheel
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(Math.max(1, prev + delta), 3.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const handleConfirmCrop = useCallback(() => {
    const img = imageRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    const canvas = document.createElement("canvas");
    const outputSize = 512;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");

    // The circular viewport diameter inside the container
    const maskDiameter = 250; // matches h-[250px] w-[250px] in styling
    const containerRect = container.getBoundingClientRect();
    const maskCenterX = containerRect.width / 2;
    const maskCenterY = containerRect.height / 2;

    // Relative image center inside container
    const imgCenterX = maskCenterX + offset.x;
    const imgCenterY = maskCenterY + offset.y;

    // Render on canvas scaled to 512x512
    const scaleFactor = outputSize / maskDiameter;

    ctx.save();
    // Move to canvas center
    ctx.translate(outputSize / 2, outputSize / 2);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply scale & translation
    ctx.scale(zoom * scaleFactor, zoom * scaleFactor);
    ctx.translate(
      (offset.x * Math.cos((-rotation * Math.PI) / 180) -
        offset.y * Math.sin((-rotation * Math.PI) / 180)) /
        zoom,
      (offset.x * Math.sin((-rotation * Math.PI) / 180) +
        offset.y * Math.cos((-rotation * Math.PI) / 180)) /
        zoom
    );

    // Draw image centered
    const renderedWidth = img.naturalWidth;
    const renderedHeight = img.naturalHeight;
    const aspect = renderedWidth / renderedHeight;
    let baseDrawW = maskDiameter;
    let baseDrawH = maskDiameter;
    if (aspect > 1) {
      baseDrawW = maskDiameter * aspect;
    } else {
      baseDrawH = maskDiameter / aspect;
    }

    ctx.drawImage(
      img,
      -baseDrawW / 2,
      -baseDrawH / 2,
      baseDrawW,
      baseDrawH
    );
    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], fileName.replace(/\.[^.]+$/, "") + "-cropped.jpg", {
          type: "image/jpeg",
        });
        onCropComplete(croppedFile);
        onClose();
      },
      "image/jpeg",
      0.92
    );
  }, [offset, zoom, rotation, fileName, onCropComplete, onClose]);

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Crop and Zoom Photo"
        className="relative flex flex-col w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 bg-gray-50/80">
          <div>
            <h4 className="text-sm font-bold text-gray-900">Crop & Position Photo</h4>
            <p className="text-[11px] text-gray-500">Drag to re-center and use slider to zoom</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Viewport & circular mask */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
          className="relative flex items-center justify-center h-[320px] bg-gray-950 overflow-hidden cursor-grab active:cursor-grabbing select-none"
        >
          {/* Rotated & Scaled Image */}
          <div
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
              transition: isDragging ? "none" : "transform 0.08s ease-out",
            }}
            className="flex items-center justify-center shrink-0 pointer-events-none"
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Source preview for crop"
              draggable={false}
              className="max-h-[250px] max-w-[250px] object-contain select-none"
            />
          </div>

          {/* Circular aperture guide overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[250px] w-[250px] rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
          </div>

          <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-white/60 bg-black/40 px-2 py-0.5 rounded">
            Drag to pan
          </div>
        </div>

        {/* Zoom & Control Sliders */}
        <div className="border-t border-gray-100 px-5 py-3.5 bg-white space-y-3">
          <div className="flex items-center gap-3">
            <MagnifyingGlassMinusIcon
              className="h-4 w-4 text-gray-400 shrink-0 cursor-pointer hover:text-gray-600"
              onClick={() => setZoom((prev) => Math.max(1, prev - 0.2))}
            />
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-green-800 cursor-pointer h-1.5 bg-gray-200 rounded-lg"
            />
            <MagnifyingGlassPlusIcon
              className="h-4 w-4 text-gray-400 shrink-0 cursor-pointer hover:text-gray-600"
              onClick={() => setZoom((prev) => Math.min(3, prev + 0.2))}
            />
            <span className="text-xs font-mono font-medium text-gray-500 w-9 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotate}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                <ArrowPathIcon className="h-3 w-3" />
                Rotate
              </button>
              {(zoom !== 1 || rotation !== 0 || offset.x !== 0 || offset.y !== 0) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-md px-2 py-1 text-[11px] font-semibold text-gray-500 hover:text-gray-800"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCrop}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-900 transition shadow-sm"
              >
                <CheckIcon className="h-4 w-4" />
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImageCropModal;
