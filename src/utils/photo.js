/**
 * Profile photo helpers shared by Avatar, PhotoUpload, the admin forms and App.jsx.
 */

export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Returns an error message, or "" when the file is acceptable. */
export function validatePhotoFile(file) {
  if (!file) return "";
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Use a JPG, PNG or WebP image.";
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return "This photo is larger than 2 MB. Choose a smaller image.";
  }
  return "";
}

const PHOTO_KEYS = [
  "photoUrl",
  "photo_url",
  "profile_image",
  "profileImage",
  "photo",
  "profile_photo",
  "avatar_url",
  "image",
];

/**
 * Find the photo path on a user/student/faculty record or an API response.
 * Looks at the object itself and at its `.data` property, so it works for
 * both { photo_url } and { success, data: { photo_url } }.
 */
export function getPhotoPath(source) {
  if (typeof source === "string" && source.trim()) {
    return source.trim();
  }
  for (const obj of [source, source?.data, source?.student, source?.faculty, source?.user]) {
    if (!obj || typeof obj !== "object") continue;
    for (const key of PHOTO_KEYS) {
      const value = obj[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return null;
}