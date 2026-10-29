import apiClient from "./client";

/**
 * Academics Management API Client
 * Interfaces with:
 * - /api/v1/schools
 * - /api/v1/departments
 * - /api/v1/programs (or /api/v1/programmes)
 * - /api/v1/batches
 * - /api/v1/degrees
 * - /api/v1/subjects
 * - /api/v1/course-offerings
 * - /api/v1/sections
 * - /api/v1/timetable
 */

function withQuery(endpoint, params) {
  if (!params) return endpoint;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      searchParams.append(key, val);
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
}

// -------------------------------------------------------------
// Schools
// -------------------------------------------------------------
export async function getSchools(token, params, signal) {
  return apiClient(withQuery("/schools", params), { token, signal });
}

export async function getSchoolById(token, id, signal) {
  return apiClient(`/schools/${id}`, { token, signal });
}

export async function createSchool(token, data) {
  return apiClient("/schools", {
    method: "POST",
    token,
    body: data,
  });
}

export async function updateSchool(token, id, data) {
  return apiClient(`/schools/${id}`, {
    method: "PUT",
    token,
    body: data,
  });
}

export async function deleteSchool(token, id) {
  return apiClient(`/schools/${id}`, {
    method: "DELETE",
    token,
  });
}

// -------------------------------------------------------------
// Departments
// -------------------------------------------------------------
export async function getDepartments(token, params, signal) {
  return apiClient(withQuery("/departments", params), { token, signal });
}

export async function getDepartmentById(token, id, signal) {
  return apiClient(`/departments/${id}`, { token, signal });
}

// -------------------------------------------------------------
// Programs / Programmes
// -------------------------------------------------------------
export async function getPrograms(token, params, signal) {
  return apiClient(withQuery("/programs", params), { token, signal });
}

export async function getProgramById(token, id, signal) {
  return apiClient(`/programs/${id}`, { token, signal });
}

export async function createProgram(token, data) {
  return apiClient("/programs", {
    method: "POST",
    token,
    body: data,
  });
}

export async function updateProgram(token, id, data) {
  return apiClient(`/programs/${id}`, {
    method: "PUT",
    token,
    body: data,
  });
}

export async function deleteProgram(token, id) {
  return apiClient(`/programs/${id}`, {
    method: "DELETE",
    token,
  });
}

// -------------------------------------------------------------
// Batches
// -------------------------------------------------------------
export async function getBatches(token, params, signal) {
  return apiClient(withQuery("/batches", params), { token, signal });
}

export async function getBatchById(token, id, signal) {
  return apiClient(`/batches/${id}`, { token, signal });
}

export async function createBatch(token, data) {
  return apiClient("/batches", {
    method: "POST",
    token,
    body: data,
  });
}

export async function updateBatch(token, id, data) {
  return apiClient(`/batches/${id}`, {
    method: "PUT",
    token,
    body: data,
  });
}

export async function deleteBatch(token, id) {
  return apiClient(`/batches/${id}`, {
    method: "DELETE",
    token,
  });
}

// -------------------------------------------------------------
// Degrees
// -------------------------------------------------------------
export async function getDegrees(token, signal) {
  return apiClient("/degrees", { token, signal });
}

export async function getDegreeById(token, id, signal) {
  return apiClient(`/degrees/${id}`, { token, signal });
}

export async function createDegree(token, data) {
  return apiClient("/degrees", {
    method: "POST",
    token,
    body: data,
  });
}

export async function updateDegree(token, id, data) {
  return apiClient(`/degrees/${id}`, {
    method: "PUT",
    token,
    body: data,
  });
}

export async function deleteDegree(token, id) {
  return apiClient(`/degrees/${id}`, {
    method: "DELETE",
    token,
  });
}

// -------------------------------------------------------------
// Academic Years
// -------------------------------------------------------------
export async function getAcademicYears(token, params, signal) {
  return apiClient(withQuery("/academic-years", params), { token, signal });
}

export async function getAcademicYearById(token, id, signal) {
  return apiClient(`/academic-years/${id}`, { token, signal });
}

export async function createAcademicYear(token, data) {
  return apiClient("/academic-years", {
    method: "POST",
    token,
    body: data,
  });
}

export async function updateAcademicYear(token, id, data) {
  return apiClient(`/academic-years/${id}`, {
    method: "PUT",
    token,
    body: data,
  });
}

export async function deleteAcademicYear(token, id) {
  return apiClient(`/academic-years/${id}`, {
    method: "DELETE",
    token,
  });
}

// -------------------------------------------------------------
// Academic Terms
// -------------------------------------------------------------
export async function getAcademicTerms(token, params, signal) {
  return apiClient(withQuery("/academic-terms", params), { token, signal });
}

export async function getAcademicTermById(token, id, signal) {
  return apiClient(`/academic-terms/${id}`, { token, signal });
}

export async function createAcademicTerm(token, data) {
  return apiClient("/academic-terms", {
    method: "POST",
    token,
    body: data,
  });
}

export async function updateAcademicTerm(token, id, data) {
  return apiClient(`/academic-terms/${id}`, {
    method: "PUT",
    token,
    body: data,
  });
}

export async function deleteAcademicTerm(token, id) {
  return apiClient(`/academic-terms/${id}`, {
    method: "DELETE",
    token,
  });
}

// -------------------------------------------------------------
// Subjects
// -------------------------------------------------------------
export async function getSubjects(token, params, signal) {
  return apiClient(withQuery("/subjects", params), { token, signal });
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
export async function getCourseOfferings(token, params, signal) {
  return apiClient(withQuery("/course-offerings", params), { token, signal });
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
export async function getSections(token, params, signal) {
  return apiClient(withQuery("/sections", params), { token, signal });
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
export async function getTimetableSlots(token, params, signal) {
  return apiClient(withQuery("/timetable", params), { token, signal });
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
