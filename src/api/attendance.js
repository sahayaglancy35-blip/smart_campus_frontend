import apiClient from "./client";

// Attendance Sessions
export async function getAttendanceSessions(token, signal) {
  return apiClient("/attendance/sessions", { token, signal });
}

export async function getAttendanceSessionById(token, id, signal) {
  return apiClient(`/attendance/sessions/${id}`, { token, signal });
}

export async function getAttendanceSessionStatus(token, id, signal) {
  return apiClient(`/attendance/sessions/${id}/status`, { token, signal });
}

export async function createAttendanceSession(token, data) {
  return apiClient("/attendance/sessions", {
    method: "POST",
    token,
    body: data,
  });
}

export async function startAttendanceSession(token, id) {
  return apiClient(`/attendance/sessions/${id}/start`, {
    method: "POST",
    token,
  });
}

export async function finalizeAttendanceSession(token, id) {
  return apiClient(`/attendance/sessions/${id}/finalize`, {
    method: "POST",
    token,
  });
}

// Attendance Records
export async function getAttendanceRecords(token, signal) {
  return apiClient("/attendance", { token, signal });
}

export async function getSessionAttendance(token, sessionId, signal) {
  return apiClient(`/attendance/session/${sessionId}`, { token, signal });
}

export async function getStudentAttendanceById(token, studentId, signal) {
  return apiClient(`/attendance/student/${studentId}`, { token, signal });
}

export async function getFacultyAttendance(token, facultyId, signal) {
  return apiClient(`/attendance/staff/${facultyId}`, { token, signal });
}

export async function createAttendanceRecord(token, data) {
  return apiClient("/attendance", {
    method: "POST",
    token,
    body: data,
  });
}

export async function overrideAttendanceRecord(token, id, data) {
  return apiClient(`/attendance/${id}/override`, {
    method: "POST",
    token,
    body: data,
  });
}
