import apiClient from "./client";

export async function fetchStudentProfile(token, signal) {
  return apiClient("/student/me", { token, signal });
}

export async function fetchStudentAttendance(token, signal) {
  return apiClient("/student/me/attendance", { token, signal });
}

export async function fetchStudentAttendanceSummary(token, signal) {
  return apiClient("/student/me/attendance/summary", { token, signal });
}

export async function fetchStudentDashboard(token, signal) {
  return apiClient("/student/me/dashboard", { token, signal });
}

export async function fetchStudentTimetable(token, signal) {
  return apiClient("/student/me/timetable", { token, signal });
}

export async function fetchStudentCourses(token, signal) {
  return apiClient("/student/me/courses", { token, signal });
}
