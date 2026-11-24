import { useState } from "react";
import { resolveAssetUrl } from "../../api/client";

const SIZES = {
  xs: "h-8 w-8 text-xs",
  sm: "h-10 w-10 text-sm",
  md: "h-16 w-16 text-xl",
  lg: "h-20 w-20 text-3xl",
  xl: "h-28 w-28 text-4xl",
};

/**
 * Round profile picture. Shows the photo when there is one, and falls back to
 * the person's initial when there is none or the image fails to load.
 *
 * Props:
 *  - src      photo path from the backend (e.g. "/uploads/students/abc.jpg"),
 *             a full URL, a data: URL or a blob: URL
 *  - name     used for the initial and the alt text
 *  - size     "xs" | "sm" | "md" | "lg" | "xl"
 *  - version  optional cache-busting value (e.g. user.photoVersion)
 *  - className extra classes (rings, shadows)
 */
export function Avatar({ src, name, size = "sm", version, className = "" }) {
  const url = resolveAssetUrl(src, version);
  const [failedUrl, setFailedUrl] = useState(null);

  // If url changes (e.g. user picks a new photo or preview loads), clear previous error
  if (failedUrl && failedUrl !== url) {
    setFailedUrl(null);
  }

  const showImage = Boolean(url) && failedUrl !== url;
  const initial = (name || "U").trim().charAt(0).toUpperCase() || "U";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-100 font-bold text-green-800 ${
        SIZES[size] || SIZES.sm
      } ${className}`}
    >
      {showImage ? (
        <img
          src={url}
          alt={name ? `Photo of ${name}` : "Profile photo"}
          onError={() => setFailedUrl(url)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </span>
  );
}

export default Avatar;