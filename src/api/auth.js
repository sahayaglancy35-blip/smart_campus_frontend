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

export async function getAuthMe(token) {
  return apiClient("/auth/me", {
    method: "GET",
    token,
  });
}
