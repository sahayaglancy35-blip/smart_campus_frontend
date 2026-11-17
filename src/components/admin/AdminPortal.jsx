import { useState, useCallback, lazy, Suspense } from "react";
import AdminLayout from "./layout/AdminLayout";
import LoadingSpinner from "../common/LoadingSpinner";

const AdminDashboardOverview = lazy(() => import("./AdminDashboardOverview"));
const StudentManagementView = lazy(() => import("./StudentManagementView"));
const FacultyManagementView = lazy(() => import("./FacultyManagementView"));
const DepartmentManagementView = lazy(() => import("./DepartmentManagementView"));
const InfrastructureManagementView = lazy(() => import("./InfrastructureManagementView"));
const AcademicsManagementView = lazy(() => import("./AcademicsManagementView"));
const AttendanceSessionsView = lazy(() => import("./AttendanceSessionsView"));
const SubjectDiscoveryDashboard = lazy(() => import("../academic/SubjectDiscoveryDashboard"));
const SubjectWorkspaceView = lazy(() => import("../academic/SubjectWorkspaceView"));

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
  "/admin/academic/subjects": {
    title: "Courseware & Subject Workspace",
    subtitle: "University-wide course discovery, syllabus oversight, and teaching staff management.",
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
  subjects: "/admin/academic/subjects",
  courseware: "/admin/academic/subjects",
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
  const meta =
    ADMIN_ROUTE_METADATA[normalizedPath] ||
    (normalizedPath.startsWith("/admin/academic/subjects")
      ? ADMIN_ROUTE_METADATA["/admin/academic/subjects"]
      : ADMIN_ROUTE_METADATA["/admin/dashboard"]);

  const renderModule = () => {
    if (normalizedPath.startsWith("/admin/academic/subjects/")) {
      const match = normalizedPath.match(/\/admin\/academic\/subjects\/(\d+)/);
      if (match) {
        return (
          <SubjectWorkspaceView
            token={token}
            user={user}
            subjectId={parseInt(match[1], 10)}
            onBack={() => onNavigate("/admin/academic/subjects")}
          />
        );
      }
    }

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
      case "/admin/academic/subjects":
        return (
          <SubjectDiscoveryDashboard
            token={token}
            user={user}
            onSelectSubject={(sub) => onNavigate(`/admin/academic/subjects/${sub.subject_id}`)}
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
      <div key={normalizedPath}>
        <Suspense fallback={<LoadingSpinner message="Loading administration console..." />}>
          {renderModule()}
        </Suspense>
      </div>
    </AdminLayout>
  );
}

export default AdminPortal;

