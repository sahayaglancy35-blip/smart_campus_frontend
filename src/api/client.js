import { API_BASE_URL } from "./endpoints";

/**
 * Safely parse response body whether JSON, plain text, or unexpected HTML.
 */
async function parseResponseBody(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const rawText = await response.text();
    if (!rawText || !rawText.trim()) {
      return null;
    }

    const isHtml =
      contentType.includes("text/html") ||
      rawText.trim().startsWith("<!DOCTYPE") ||
      rawText.trim().startsWith("<html");

    if (isHtml) {
      const preMatch = rawText.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      if (preMatch && preMatch[1]) {
        const cleanPre = preMatch[1].replace(/<[^>]+>/g, "").trim();
        return { message: cleanPre, rawHtml: true };
      }

      const titleMatch = rawText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        const cleanTitle = titleMatch[1].replace(/<[^>]+>/g, "").trim();
        return { message: cleanTitle, rawHtml: true };
      }

      return {
        message: `Server returned unexpected HTML response (${response.status})`,
        rawHtml: true,
      };
    }

    return { message: rawText.trim() };
  } catch {
    return null;
  }
}

/**
 * Build a user-friendly error message based on response data and status.
 */
function resolveErrorMessage(data, status, method, cleanEndpoint) {
  let extracted = data?.message || data?.error;

  if (typeof extracted === "string") {
    if (
      extracted.includes("<!DOCTYPE") ||
      extracted.includes("<html") ||
      extracted.includes("<body")
    ) {
      extracted = null;
    }
  } else {
    extracted = null;
  }

  if (extracted) {
    if (extracted.startsWith("Cannot ")) {
      return `Endpoint not supported on server: ${extracted}`;
    }
    return extracted;
  }

  switch (status) {
    case 400:
      return "The request contained invalid or incomplete parameters.";
    case 401:
      return "Your session has expired or authentication is required. Please sign in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return `The requested resource or endpoint was not found (${cleanEndpoint}).`;
    case 409:
      return "A conflict occurred with an existing record. Please review your input.";
    case 413:
      return "The file is too large for the server. Choose a smaller file.";
    case 500:
      return "An internal server error occurred. Please try again or contact the administrator.";
    case 502:
    case 503:
    case 504:
      return "The server is temporarily unavailable or gateway timed out. Please try again.";
    default:
      return `Request failed with status ${status}`;
  }
}

/**
 * Universal API client for Joy University Smart Campus ERP
 */
export async function apiClient(endpoint, options = {}) {
  const {
    method = "GET",
    token = null,
    body = null,
    headers = {},
    signal = undefined,
    ...customConfig
  } = options;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const defaultHeaders = {
    ...headers,
  };

  if (!isFormData && !defaultHeaders["Content-Type"]) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  const config = {
    method,
    headers: defaultHeaders,
    signal,
    ...customConfig,
  };

  if (body && method !== "GET" && method !== "HEAD") {
    config.body = isFormData ? body : (typeof body === "string" ? body : JSON.stringify(body));
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  try {
    const response = await fetch(url, config);
    const data = await parseResponseBody(response);

    if (!response.ok) {
      const errorMessage = resolveErrorMessage(
        data,
        response.status,
        method,
        cleanEndpoint,
      );
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data || { success: true };
  } catch (err) {
    if (err.name === "AbortError") {
      throw err;
    }
    console.error(`[API Error] ${method} ${cleanEndpoint}:`, err.message);
    throw err;
  }
}

/**
 * Convert a backend photo path (e.g. "/uploads/students/abc.jpg") into a
 * full URL that works in <img src>. Uploaded files are served from the
 * server origin (e.g. http://localhost:5000/uploads/...), not from the
 * frontend origin and not under /api/v1.
 * Pass a version (e.g. a timestamp) to bust the browser cache after a
 * photo is replaced. Full http(s), data: and blob: URLs pass through unchanged.
 */
export function resolveAssetUrl(path, version) {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;

  let origin = "";
  try {
    origin = new URL(API_BASE_URL, window.location.origin).origin;
  } catch {
    origin = "";
  }

  const clean = path.startsWith("/") ? path : `/${path}`;
  const url = `${origin}${clean}`;
  return version
    ? `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`
    : url;
}

export { API_BASE_URL };
export default apiClient;