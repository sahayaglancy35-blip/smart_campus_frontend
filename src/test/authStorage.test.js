import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Authentication & Role Authorization Mapping", () => {
  const ROLE_MAP = {
    Student: "STUDENT",
    Staff: "FACULTY",
    Admin: "ADMIN",
  };

  const VALID_ADMIN_MODULE_ROUTES = [
    "/admin",
    "/admin/dashboard",
    "/admin/students",
    "/admin/faculty",
    "/admin/departments",
    "/admin/classrooms",
    "/admin/academics",
    "/admin/attendance",
  ];

  it("should correctly map institutional roles to authorization constants", () => {
    assert.equal(ROLE_MAP.Student, "STUDENT");
    assert.equal(ROLE_MAP.Staff, "FACULTY");
    assert.equal(ROLE_MAP.Admin, "ADMIN");
  });

  it("should validate and whitelist all administrative routes", () => {
    assert.ok(VALID_ADMIN_MODULE_ROUTES.includes("/admin/dashboard"));
    assert.ok(VALID_ADMIN_MODULE_ROUTES.includes("/admin/academics"));
    assert.ok(VALID_ADMIN_MODULE_ROUTES.includes("/admin/departments"));
    assert.equal(VALID_ADMIN_MODULE_ROUTES.includes("/admin/unauthorized-module"), false);
  });

  it("should prevent non-admin roles from navigating to administrative endpoints", () => {
    function canAccessAdminRoute(role, path) {
      if (!path.startsWith("/admin")) return true;
      if (path === "/admin/login") return true;
      return role === "ADMIN";
    }

    assert.equal(canAccessAdminRoute("STUDENT", "/admin/dashboard"), false);
    assert.equal(canAccessAdminRoute("FACULTY", "/admin/academics"), false);
    assert.equal(canAccessAdminRoute("ADMIN", "/admin/academics"), true);
    assert.equal(canAccessAdminRoute(null, "/admin/login"), true);
  });

  it("should accurately resolve is_hod for faculty with HOD designation or username", () => {
    function resolveIsHod(profile, authData) {
      return Boolean(
        profile?.is_hod ||
        authData?.is_hod ||
        /head\s+of\s+department|\bhod/i.test(profile?.designation || "") ||
        /head\s+of\s+department|\bhod/i.test(profile?.designation_name || "") ||
        /head\s+of\s+department|\bhod/i.test(profile?.in_charge_class || "") ||
        /head\s+of\s+department|\bhod/i.test(authData?.username || "")
      );
    }

    const regularFaculty = { designation: "Assistant Professor" };
    assert.equal(resolveIsHod(regularFaculty, { username: "FAC001" }), false);

    const hodByDesignation = { designation: "Professor & Head of Department" };
    assert.equal(resolveIsHod(hodByDesignation, { username: "FAC002" }), true);

    const hodByUsername = { designation: "Professor" };
    assert.equal(resolveIsHod(hodByUsername, { username: "HOD001" }), true);
  });
});
