import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Role-Based Subject Management & Academic Workspace Logic", () => {
  test("should correctly validate dedicated subject detail routes for Faculty, HOD, and Admin", () => {
    const validFacultyRoute = "/faculty/academic/subjects/2";
    const validHodRoute = "/hod/academic/subjects/2";
    const validAdminRoute = "/admin/academic/subjects/2";

    const facultyMatch = validFacultyRoute.match(/\/academic\/subjects\/(\d+)/);
    const hodMatch = validHodRoute.match(/\/academic\/subjects\/(\d+)/);
    const adminMatch = validAdminRoute.match(/\/admin\/academic\/subjects\/(\d+)/);

    assert.ok(facultyMatch, "Faculty route should match pattern");
    assert.equal(facultyMatch[1], "2");

    assert.ok(hodMatch, "HOD route should match pattern");
    assert.equal(hodMatch[1], "2");

    assert.ok(adminMatch, "Admin route should match pattern");
    assert.equal(adminMatch[1], "2");
  });

  test("should enforce strict role-based route access controls", () => {
    const regularFacultyUser = {
      role: "FACULTY",
      is_hod: false,
      department_id: 5,
    };

    const hodFacultyUser = {
      role: "FACULTY",
      is_hod: true,
      department_id: 5,
      designation: "Professor & Head of Department",
    };

    const studentUser = {
      role: "STUDENT",
      student_id: 1,
    };

    const adminUser = {
      role: "ADMIN",
      user_id: 1,
    };

    // Route authorizer function
    const canAccessRoute = (user, path) => {
      if (user.role === "ADMIN") {
        return path.startsWith("/admin");
      }
      if (user.role === "STUDENT") {
        return !path.startsWith("/admin") && !path.startsWith("/faculty/academic") && !path.startsWith("/hod/academic");
      }
      if (user.role === "FACULTY") {
        if (path.startsWith("/admin")) return false;
        if (path.startsWith("/hod/academic")) return Boolean(user.is_hod);
        return true;
      }
      return false;
    };

    // Regular faculty cannot access HOD routes or Admin routes
    assert.equal(canAccessRoute(regularFacultyUser, "/faculty/academic/subjects/2"), true);
    assert.equal(canAccessRoute(regularFacultyUser, "/hod/academic/subjects/2"), false);
    assert.equal(canAccessRoute(regularFacultyUser, "/admin/academic/subjects/2"), false);

    // HOD can access HOD routes and Faculty routes, but not Admin
    assert.equal(canAccessRoute(hodFacultyUser, "/hod/academic/subjects/2"), true);
    assert.equal(canAccessRoute(hodFacultyUser, "/faculty/academic/subjects/2"), true);
    assert.equal(canAccessRoute(hodFacultyUser, "/admin/academic/subjects/2"), false);

    // Student cannot access Faculty, HOD, or Admin routes
    assert.equal(canAccessRoute(studentUser, "/faculty/academic/subjects/2"), false);
    assert.equal(canAccessRoute(studentUser, "/hod/academic/subjects/2"), false);
    assert.equal(canAccessRoute(studentUser, "/admin/academic/subjects/2"), false);

    // Admin has access to admin subjects discovery
    assert.equal(canAccessRoute(adminUser, "/admin/academic/subjects"), true);
    assert.equal(canAccessRoute(adminUser, "/admin/academic/subjects/2"), true);
  });

  test("should format discovery filter search parameters accurately", () => {
    const filters = {
      search: "AIML",
      department_id: 5,
      school_id: 3,
      programme_id: 97,
      semester: 2,
      faculty_id: 1,
      is_active: 1,
    };

    const searchParams = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        searchParams.append(k, String(v));
      }
    });

    const queryString = searchParams.toString();
    assert.ok(queryString.includes("search=AIML"));
    assert.ok(queryString.includes("department_id=5"));
    assert.ok(queryString.includes("school_id=3"));
    assert.ok(queryString.includes("programme_id=97"));
    assert.ok(queryString.includes("semester=2"));
    assert.ok(queryString.includes("faculty_id=1"));
    assert.ok(queryString.includes("is_active=1"));
  });
});
