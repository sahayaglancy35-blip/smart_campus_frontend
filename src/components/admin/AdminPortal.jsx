import { useState, useCallback } from "react";
import AdminLayout from "./layout/AdminLayout";
import AdminDashboardOverview from "./AdminDashboardOverview";
import StudentManagementView from "./StudentManagementView";
import FacultyManagementView from "./FacultyManagementView";
import DepartmentManagementView from "./DepartmentManagementView";
import InfrastructureManagementView from "./InfrastructureManagementView";
import AcademicsManagementView from "./AcademicsManagementView";
import AttendanceSessionsView from "./AttendanceSessionsView";

const ADMIN_ROUTE_METADATA = {
  "/admin": {
    title: "University Administrative Overview",
    subtitle: "Institutional statistics, registry metrics, and operational control.",
  },
  "/admin/dashboard": {
    title: "University Administrative Overview",
    subtitle: "Institutional statistics, registry metrics, and operational control.",
  },
  "/admin/students": {
    title: "Student Information Directory",
    subtitle: "Manage student enrollments, academic cohorts, and profiles.",
  },
  "/admin/faculty": {
    title: "Faculty & Staff Management",
    subtitle: "Manage academic faculty, staff designations, and departmental affiliations.",
  },
  "/admin/departments": {
    title: "Academic Departments",
    subtitle: "Configure institutional faculties, academic departments, codes, and operational status.",
  },
  "/admin/classrooms": {
    title: "Campus Infrastructure & Facilities",
    subtitle: "Manage campus blocks, lecture halls, smart classrooms, and labs.",
  },
  "/admin/academics": {
    title: "Academic Offerings & Timetable Management",
    subtitle: "Manage constituent schools, programs, batches, course offerings, and section schedules.",
  },
  "/admin/attendance": {
    title: "Attendance Session Management",
    subtitle: "Oversee institutional class attendance sessions and roster records.",
  },
};

const KEY_TO_ROUTE = {
  dashboard: "/admin/dashboard",
  "admin-dashboard": "/admin/dashboard",
  students: "/admin/students",
  faculty: "/admin/faculty",
  departments: "/admin/departments",
  infrastructure: "/admin/classrooms",
  classrooms: "/admin/classrooms",
  academics: "/admin/academics",
  sessions: "/admin/attendance",
  attendance: "/admin/attendance",
};

export function AdminPortal({ user, token, currentPath, onNavigate, onLogout }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleInternalNavigate = useCallback(
    (target) => {
      if (typeof target === "string" && target.startsWith("/")) {
        onNavigate(target);
      } else if (typeof target === "string" && KEY_TO_ROUTE[target]) {
        onNavigate(KEY_TO_ROUTE[target]);
      } else {
        onNavigate(`/admin/${target}`);
      }
    },
    [onNavigate]
  );

  const normalizedPath = currentPath === "/admin" ? "/admin/dashboard" : currentPath;
  const meta = ADMIN_ROUTE_METADATA[normalizedPath] || ADMIN_ROUTE_METADATA["/admin/dashboard"];

  const renderModule = () => {
    switch (normalizedPath) {
      case "/admin/dashboard":
        return (
          <AdminDashboardOverview
            token={token}
            user={user}
            onNavigate={handleInternalNavigate}
          />
        );
      case "/admin/students":
        return <StudentManagementView token={token} />;
      case "/admin/faculty":
        return <FacultyManagementView token={token} />;
      case "/admin/departments":
        return <DepartmentManagementView token={token} />;
      case "/admin/classrooms":
        return <InfrastructureManagementView token={token} />;
      case "/admin/academics":
        return (
          <AcademicsManagementView
            token={token}
            refreshTrigger={refreshTrigger}
          />
        );
      case "/admin/attendance":
        return (
          <AttendanceSessionsView
            token={token}
            user={user}
            refreshTrigger={refreshTrigger}
          />
        );
      default:
        return (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
            <h2 className="text-lg font-bold text-slate-900">
              Administrative Section Not Found
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              The requested administrative path ({currentPath}) does not correspond to an active module.
            </p>
            <button
              type="button"
              onClick={() => onNavigate("/admin/dashboard")}
              className="mt-6 inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Return to Admin Dashboard
            </button>
          </div>
        );
    }
  };

  return (
    <AdminLayout
      user={user}
      currentPath={normalizedPath}
      onNavigate={onNavigate}
      onLogout={onLogout}
      onRefresh={handleRefresh}
      title={meta.title}
      subtitle={meta.subtitle}
    >
      <div key={normalizedPath}>{renderModule()}</div>
    </AdminLayout>
  );
}

export default AdminPortal;

