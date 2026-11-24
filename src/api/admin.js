import apiClient from "./client";
import { ENDPOINTS, PHOTO_ENDPOINTS } from "./endpoints";

// Admin Institutional Dashboard Stats
export async function getAdminDashboardStats(token, signal) {
  return apiClient("/admin/dashboard-stats", { token, signal });
}

// Student Management (Admin)
export async function getStudents(token, signal) {
  return apiClient("/students", { token, signal });
}

export async function getStudentById(token, id, signal) {
  return apiClient(`/students/${id}`, { token, signal });
}

export async function createStudent(token, data) {
  return apiClient("/students", {
    method: "POST",
    token,
    body: data,
  });
}

export async function updateStudent(token, id, data) {
  return apiClient(`/students/${id}`, {
    method: "PUT",
    token,
    body: data,
  });
}

export async function deleteStudent(token, id) {
  return apiClient(`/students/${id}`, {
    method: "DELETE",
    token,
  });
}

// Faculty & Staff Management
export async function getFaculty(token, signal) {
  return apiClient("/staff/t", { token, signal });
}

export async function getFacultyById(token, id, signal) {
  return apiClient(`/staff/t/${id}`, { token, signal });
}

export async function createFaculty(token, data) {
  return apiClient("/staff/t", {
    method: "POST",
    token,
    body: data,
  });
}

export async function updateFaculty(token, id, data) {
  return apiClient(`/staff/t/${id}`, {
    method: "PUT",
    token,
    body: data,
  });
}

export async function deleteFaculty(token, id) {
  return apiClient(`/staff/t/${id}`, {
    method: "DELETE",
    token,
  });
}

// Department Management
export async function getDepartments(token, signal) {
  return apiClient("/departments", { token, signal });
}

export async function getDepartmentById(token, id, signal) {
  return apiClient(`/departments/${id}`, { token, signal });
}

export async function createDepartment(token, data) {
  return apiClient("/departments", {
    method: "POST",
    token,
    body: data,
  });
}

export async function updateDepartment(token, id, data) {
  return apiClient(`/departments/${id}`, {
    method: "PUT",
    token,
    body: data,
  });
}

export async function deleteDepartment(token, id) {
  return apiClient(`/departments/${id}`, {
    method: "DELETE",
    token,
  });
}

// Block Management
export async function getBlocks(token, signal) {
  return apiClient("/blocks", { token, signal });
}

export async function getBlockById(token, id, signal) {
  return apiClient(`/blocks/${id}`, { token, signal });
}

export async function createBlock(token, data) {
  return apiClient("/blocks", {
    method: "POST",
    token,
    body: data,
  });
}

export async function updateBlock(token, id, data) {
  return apiClient(`/blocks/${id}`, {
    method: "PUT",
    token,
    body: data,
  });
}

export async function deleteBlock(token, id) {
  return apiClient(`/blocks/${id}`, {
    method: "DELETE",
    token,
  });
}

// Classroom Management
export async function getClassrooms(token, signal) {
  return apiClient("/classrooms", { token, signal });
}

export async function getClassroomById(token, id, signal) {
  return apiClient(`/classrooms/${id}`, { token, signal });
}

export async function createClassroom(token, data) {
  return apiClient("/classrooms", {
    method: "POST",
    token,
    body: data,
  });
}

export async function updateClassroom(token, id, data) {
  return apiClient(`/classrooms/${id}`, {
    method: "PUT",
    token,
    body: data,
  });
}

export async function deleteClassroom(token, id) {
  return apiClient(`/classrooms/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function fetchAdminProfile(token, signal) {
  return apiClient("/auth/profile", {
    method: "GET",
    token,
    signal,
  });
}

export async function updateAdminProfile(token, data) {
  return apiClient("/auth/profile", {
    method: "PUT",
    token,
    body: data,
  });
}

// Academic Batches Reference
export async function getBatches(token, signal) {
  return apiClient("/batches", { token, signal });
}

// Designations Reference
export async function getDesignations(token, signal) {
  return apiClient("/designations", { token, signal });
}

// ---------------------------------------------------------------------------
// Profile photos
// Backend contract: POST multipart/form-data with the file in field "photo";
// DELETE removes the photo. Responses should include the new photo URL
// (e.g. { success: true, data: { photo_url: "/uploads/students/abc.jpg" } }).
// ---------------------------------------------------------------------------

function buildPhotoForm(file) {
  const form = new FormData();
  form.append("photo", file);
  return form;
}

// Student photos (admin)
export async function uploadStudentPhoto(token, id, file) {
  return apiClient(PHOTO_ENDPOINTS.student(id), {
    method: "POST",
    token,
    body: buildPhotoForm(file),
  });
}

export async function deleteStudentPhoto(token, id) {
  return apiClient(PHOTO_ENDPOINTS.student(id), { method: "DELETE", token });
}

// Faculty photos (admin)
export async function uploadFacultyPhoto(token, id, file) {
  return apiClient(PHOTO_ENDPOINTS.faculty(id), {
    method: "POST",
    token,
    body: buildPhotoForm(file),
  });
}

export async function deleteFacultyPhoto(token, id) {
  return apiClient(PHOTO_ENDPOINTS.faculty(id), { method: "DELETE", token });
}

// Admin's own photo
export async function uploadAdminPhoto(token, file) {
  return apiClient(ENDPOINTS.ADMIN_PROFILE_PHOTO, {
    method: "POST",
    token,
    body: buildPhotoForm(file),
  });
}

export async function deleteAdminPhoto(token) {
  return apiClient(ENDPOINTS.ADMIN_PROFILE_PHOTO, { method: "DELETE", token });
}

/**
 * Pull the new record's id out of a create response, whatever its shape.
 * Used to attach the photo right after creating a student or faculty record.
 */
export function extractCreatedId(res) {
  const d = res?.data;
  return (
    d?.student_id ?? d?.faculty_id ?? d?.id ?? d?.insertId ??
    res?.student_id ?? res?.faculty_id ?? res?.id ?? res?.insertId ??
    d?.student?.student_id ?? d?.faculty?.faculty_id ??
    null
  );
}

const MISSING_ID_ERROR =
  "Created, but the new record id was not returned, so the photo could not be attached.";

/**
 * Create a student, then upload the photo (if any).
 * Returns { record, photoError } so the form can say "saved, but the photo
 * failed, retry" instead of losing the whole submission.
 */
export async function createStudentWithPhoto(token, data, file) {
  const record = await createStudent(token, data);
  if (!file) return { record, photoError: null };
  const id = extractCreatedId(record);
  if (!id) return { record, photoError: new Error(MISSING_ID_ERROR) };
  try {
    await uploadStudentPhoto(token, id, file);
    return { record, photoError: null };
  } catch (err) {
    return { record, photoError: err };
  }
}

export async function createFacultyWithPhoto(token, data, file) {
  const record = await createFaculty(token, data);
  if (!file) return { record, photoError: null };
  const id = extractCreatedId(record);
  if (!id) return { record, photoError: new Error(MISSING_ID_ERROR) };
  try {
    await uploadFacultyPhoto(token, id, file);
    return { record, photoError: null };
  } catch (err) {
    return { record, photoError: err };
  }
}