import apiClient from "./client";

export async function loginUser(username, password) {
  return apiClient("/auth/login", {
    method: "POST",
    body: {
      username: username.trim(),
      password,
    },
  });
}

export async function loginAdmin(username, password) {
  return apiClient("/auth/admin/login", {
    method: "POST",
    body: {
      username: username.trim(),
      password,
    },
  });
}

export async function getAuthMe(token) {
  return apiClient("/auth/me", {
    method: "GET",
    token,
  });
}

export async function getUserProfile(token, signal) {
  return apiClient("/auth/profile", {
    method: "GET",
    token,
    signal,
  });
}

export async function updateUserProfile(token, profileData) {
  return apiClient("/auth/profile", {
    method: "PUT",
    token,
    body: profileData,
  });
}

export async function logoutUser(token, signal) {
  return apiClient("/auth/logout", {
    method: "POST",
    token,
    signal,
  });
}
