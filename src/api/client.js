const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

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

  const defaultHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };

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
    config.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  try {
    const response = await fetch(url, config);

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }

    if (!response.ok) {
      const errorMessage =
        data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === "AbortError") {
      throw err;
    }
    console.error(`[API Error] ${method} ${cleanEndpoint}:`, err.message);
    throw err;
  }
}

export { API_BASE_URL };
export default apiClient;
