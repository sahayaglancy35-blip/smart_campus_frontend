import apiClient from "./client";

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
