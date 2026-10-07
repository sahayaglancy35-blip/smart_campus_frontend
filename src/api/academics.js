import apiClient from "./client";

/**
 * Academics Management API Client
 * Interfaces with /api/v1/subjects, /api/v1/course-offerings, /api/v1/sections, /api/v1/timetable
 */

// -------------------------------------------------------------
// Subjects
// -------------------------------------------------------------
export async function getSubjects(token, signal) {
  return apiClient("/subjects", { token, signal });
}

export async function getSubjectById(token, id, signal) {
  return apiClient(`/subjects/${id}`, { token, signal });
}

export async function createSubject(token, data) {
  return apiClient("/subjects", {
    method: "POST",
    token,
    body: data,
  });
}

export async function updateSubject(token, id, data) {
  return apiClient(`/subjects/${id}`, {
    method: "PUT",
    token,
    body: data,
  });
}

export async function deleteSubject(token, id) {
  return apiClient(`/subjects/${id}`, {
    method: "DELETE",
    token,
  });
}

// -------------------------------------------------------------
// Course Offerings
// -------------------------------------------------------------
export async function getCourseOfferings(token, signal) {
  return apiClient("/course-offerings", { token, signal });
}

export async function getCourseOfferingById(token, id, signal) {
  return apiClient(`/course-offerings/${id}`, { token, signal });
}

export async function createCourseOffering(token, data) {
  return apiClient("/course-offerings", {
    method: "POST",
    token,
    body: data,
  });
}

export async function updateCourseOffering(token, id, data) {
  return apiClient(`/course-offerings/${id}`, {
    method: "PUT",
    token,
    body: data,
  });
}

export async function deleteCourseOffering(token, id) {
  return apiClient(`/course-offerings/${id}`, {
    method: "DELETE",
    token,
  });
}

// -------------------------------------------------------------
// Sections
// -------------------------------------------------------------
export async function getSections(token, signal) {
  return apiClient("/sections", { token, signal });
}

export async function getSectionById(token, id, signal) {
  return apiClient(`/sections/${id}`, { token, signal });
}

export async function createSection(token, data) {
  return apiClient("/sections", {
    method: "POST",
    token,
    body: data,
  });
}

export async function updateSection(token, id, data) {
  return apiClient(`/sections/${id}`, {
    method: "PUT",
    token,
    body: data,
  });
}

export async function deleteSection(token, id) {
  return apiClient(`/sections/${id}`, {
    method: "DELETE",
    token,
  });
}

// -------------------------------------------------------------
// Timetable
// -------------------------------------------------------------
export async function getTimetableSlots(token, signal) {
  return apiClient("/timetable", { token, signal });
}

export async function getTimetableSlotById(token, id, signal) {
  return apiClient(`/timetable/${id}`, { token, signal });
}

export async function createTimetableSlot(token, data) {
  return apiClient("/timetable", {
    method: "POST",
    token,
    body: data,
  });
}

export async function updateTimetableSlot(token, id, data) {
  return apiClient(`/timetable/${id}`, {
    method: "PUT",
    token,
    body: data,
  });
}

export async function deleteTimetableSlot(token, id) {
  return apiClient(`/timetable/${id}`, {
    method: "DELETE",
    token,
  });
}
