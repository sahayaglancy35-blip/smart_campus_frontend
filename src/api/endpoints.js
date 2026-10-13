/**
 * Joy University Smart Campus ERP - API Endpoint Registry
 * Centralizes all service routes reading from environment variables with safe defaults.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

export const ENDPOINTS = {
  // Authentication
  AUTH_LOGIN: import.meta.env.VITE_AUTH_LOGIN_ENDPOINT || "/auth/login",
  AUTH_ME: import.meta.env.VITE_AUTH_ME_ENDPOINT || "/auth/me",
  AUTH_LOGOUT: import.meta.env.VITE_AUTH_LOGOUT_ENDPOINT || "/auth/logout",

  // Student Portal
  STUDENT_PROFILE: import.meta.env.VITE_STUDENT_PROFILE_ENDPOINT || "/student/me",
  STUDENT_DASHBOARD: import.meta.env.VITE_STUDENT_DASHBOARD_ENDPOINT || "/student/me/dashboard",
  STUDENT_TIMETABLE: import.meta.env.VITE_STUDENT_TIMETABLE_ENDPOINT || "/student/me/timetable",
  STUDENT_COURSES: import.meta.env.VITE_STUDENT_COURSES_ENDPOINT || "/student/me/courses",
  STUDENT_ATTENDANCE: import.meta.env.VITE_STUDENT_ATTENDANCE_ENDPOINT || "/student/me/attendance",
  STUDENT_ATTENDANCE_SUMMARY:
    import.meta.env.VITE_STUDENT_ATTENDANCE_SUMMARY_ENDPOINT || "/student/me/attendance/summary",

  // Faculty Portal
  FACULTY_PROFILE: import.meta.env.VITE_FACULTY_PROFILE_ENDPOINT || "/faculty/me",
  FACULTY_DASHBOARD: import.meta.env.VITE_FACULTY_DASHBOARD_ENDPOINT || "/faculty/dashboard",
  FACULTY_TIMETABLE: import.meta.env.VITE_FACULTY_TIMETABLE_ENDPOINT || "/faculty/timetable",
  FACULTY_COURSES: import.meta.env.VITE_FACULTY_COURSES_ENDPOINT || "/faculty/courses",
  FACULTY_SECTIONS: import.meta.env.VITE_FACULTY_SECTIONS_ENDPOINT || "/faculty/sections",
  FACULTY_SESSIONS: import.meta.env.VITE_FACULTY_SESSIONS_ENDPOINT || "/faculty/attendance/sessions",
  FACULTY_SUMMARY: import.meta.env.VITE_FACULTY_SUMMARY_ENDPOINT || "/faculty/attendance/summary",

  // Admin Management
  ADMIN_DASHBOARD_STATS: import.meta.env.VITE_ADMIN_DASHBOARD_STATS_ENDPOINT || "/admin/dashboard-stats",
  ADMIN_STUDENTS: import.meta.env.VITE_ADMIN_STUDENTS_ENDPOINT || "/students",
  ADMIN_FACULTY: import.meta.env.VITE_ADMIN_FACULTY_ENDPOINT || "/staff/t",
  ADMIN_SCHOOLS: import.meta.env.VITE_ADMIN_SCHOOLS_ENDPOINT || "/schools",
  ADMIN_DEPARTMENTS: import.meta.env.VITE_ADMIN_DEPARTMENTS_ENDPOINT || "/departments",
  ADMIN_PROGRAMS: import.meta.env.VITE_ADMIN_PROGRAMS_ENDPOINT || "/programs",
  ADMIN_BATCHES: import.meta.env.VITE_ADMIN_BATCHES_ENDPOINT || "/batches",
  ADMIN_DEGREES: import.meta.env.VITE_ADMIN_DEGREES_ENDPOINT || "/degrees",
  ADMIN_BLOCKS: import.meta.env.VITE_ADMIN_BLOCKS_ENDPOINT || "/blocks",
  ADMIN_CLASSROOMS: import.meta.env.VITE_ADMIN_CLASSROOMS_ENDPOINT || "/classrooms",
  ADMIN_SUBJECTS: import.meta.env.VITE_ADMIN_SUBJECTS_ENDPOINT || "/subjects",
  ADMIN_COURSE_OFFERINGS: import.meta.env.VITE_ADMIN_COURSE_OFFERINGS_ENDPOINT || "/course-offerings",
  ADMIN_SECTIONS: import.meta.env.VITE_ADMIN_SECTIONS_ENDPOINT || "/sections",
  ADMIN_TIMETABLE: import.meta.env.VITE_ADMIN_TIMETABLE_ENDPOINT || "/timetable",
  ADMIN_ATTENDANCE_SESSIONS:
    import.meta.env.VITE_ADMIN_ATTENDANCE_SESSIONS_ENDPOINT || "/attendance/sessions",
};

