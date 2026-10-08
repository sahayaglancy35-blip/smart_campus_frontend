import apiClient from "./client";

/**
 * Faculty Portal API Client
 * Interfaces with /api/v1/faculty/* endpoints
 */

export async function fetchFacultyProfile(token, signal) {
  return apiClient("/faculty/me", { token, signal });
}

export async function fetchFacultyDashboard(token, signal) {
  return apiClient("/faculty/dashboard", { token, signal });
}

export async function fetchFacultyTimetable(token, params = {}, signal) {
  let query = "";
  if (params && params.day_of_week) {
    query = `?day_of_week=${encodeURIComponent(params.day_of_week)}`;
  }
  return apiClient(`/faculty/timetable${query}`, { token, signal });
}

export async function fetchFacultyCourses(token, signal) {
  return apiClient("/faculty/courses", { token, signal });
}

export async function fetchFacultySections(token, signal) {
  return apiClient("/faculty/sections", { token, signal });
}

export async function fetchFacultyAttendanceSessions(token, signal) {
  return apiClient("/faculty/attendance/sessions", { token, signal });
}

export async function fetchFacultyAttendanceSessionById(token, id, signal) {
  return apiClient(`/faculty/attendance/sessions/${id}`, { token, signal });
}

export async function startFacultyAttendanceSession(token, id) {
  return apiClient(`/faculty/attendance/sessions/${id}/start`, {
    method: "POST",
    token,
  });
}

export async function finalizeFacultyAttendanceSession(token, id) {
  return apiClient(`/faculty/attendance/sessions/${id}/finalize`, {
    method: "POST",
    token,
  });
}

export async function fetchFacultyAttendanceRoster(token, sessionId, signal) {
  return apiClient(`/faculty/attendance/sessions/${sessionId}/roster`, {
    token,
    signal,
  });
}

export async function markFacultyAttendanceRecord(token, sessionId, data) {
  return apiClient(`/faculty/attendance/sessions/${sessionId}/records`, {
    method: "POST",
    token,
    body: data,
  });
}

export async function overrideFacultyAttendanceRecord(token, recordId, data) {
  return apiClient(`/faculty/attendance/records/${recordId}/override`, {
    method: "POST",
    token,
    body: data,
  });
}

export async function fetchFacultyAttendanceSummary(token, signal) {
  return apiClient("/faculty/attendance/summary", { token, signal });
}
