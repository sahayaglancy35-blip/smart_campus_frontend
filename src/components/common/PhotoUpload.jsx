import { useEffect, useRef, useState } from "react";
import { PhotoIcon, TrashIcon, ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import Avatar from "./Avatar";
import { PHOTO_ACCEPT, validatePhotoFile } from "../../utils/photo";

/**
 * Photo picker for the admin forms. It does not upload anything itself; it
 * reports the admin's choice to the parent, which uploads on "Save".
 *
 * Props:
 *  - currentUrl  photo already saved for this person (path or URL), if any
 *  - name        person's name (for the initial fallback)
 *  - file        File the parent currently holds (or null)
 *  - removed     true when the admin chose to remove the saved photo
 *  - onChange    ({ file, remove }) => void
 *  - disabled    disable the buttons while saving
 */
export function PhotoUpload({
  currentUrl = null,
  name = "",
  file = null,
  removed = false,
  onChange,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null); // { file, url }

  // Build a local preview of the chosen file (no upload yet).
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return undefined;
    }

    // If file is already a data URL or blob URL string, use it directly
    if (typeof file === "string") {
      setPreview({ file, url: file });
      return undefined;
    }

    // Try synchronous object URL first for immediate UI rendering
    let objectUrl = null;
    try {
      if (typeof window !== "undefined" && window.URL && window.URL.createObjectURL) {
        objectUrl = window.URL.createObjectURL(file);
        setPreview({ file, url: objectUrl });
      }
    } catch {
      // Fallback to FileReader below
    }

    let cancelled = false;
    const reader = new FileReader();
    reader.onload = () => {
      if (!cancelled && reader.result) {
        setPreview({ file, url: reader.result });
      }
    };
    reader.readAsDataURL(file);

    return () => {
      cancelled = true;
      if (objectUrl && typeof window !== "undefined" && window.URL && window.URL.revokeObjectURL) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file]);

  const previewUrl = file && preview?.file === file ? preview.url : null;
  const hasSaved = Boolean(currentUrl);
  const shown = file ? previewUrl : removed ? null : currentUrl;

  const handlePick = (event) => {
    const picked = event.target.files?.[0];
    event.target.value = ""; // allow picking the same file again
    if (!picked) return;

    const problem = validatePhotoFile(picked);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    onChange?.({ file: picked, remove: false });
  };

  const handleRemove = () => {
    setError("");
    // With a new file selected this discards it; otherwise it removes the saved photo.
    onChange?.({ file: null, remove: !file && hasSaved });
  };

  const handleUndo = () => {
    setError("");
    onChange?.({ file: null, remove: false });
  };

  const status = file
    ? `New photo selected: ${file.name}. It is saved when you save this form.`
    : removed
      ? "The photo will be removed when you save this form."
      : null;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
      <Avatar src={shown} name={name} size="lg" className="ring-2 ring-green-600/20" />

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-gray-700">Profile photo</p>
        <p className="mt-0.5 text-[11px] text-gray-500">
          JPG, PNG or WebP, up to 2 MB.
        </p>
        {status && (
          <p className="mt-1 break-words text-[11px] font-medium text-green-800">{status}</p>
        )}
        {error && (
          <p role="alert" className="mt-1 text-[11px] font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="mt-2 flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={PHOTO_ACCEPT}
            onChange={handlePick}
            className="hidden"
            tabIndex={-1}
          />

          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-900 disabled:opacity-50"
          >
            <PhotoIcon className="h-4 w-4" />
            {shown ? "Change photo" : "Choose photo"}
          </button>

          {(file || (hasSaved && !removed)) && (
            <button
              type="button"
              disabled={disabled}
              onClick={handleRemove}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4" />
              {file ? "Discard" : "Remove"}
            </button>
          )}

          {removed && !file && (
            <button
              type="button"
              disabled={disabled}
              onClick={handleUndo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
              Keep current photo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PhotoUpload;