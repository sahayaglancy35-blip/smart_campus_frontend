import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from "react";
import AppLayout from "./layout/AppLayout";
import LoadingSpinner from "./common/LoadingSpinner";

// Student Views
const StudentDashboardOverview = lazy(() => import("./student/StudentDashboardOverview"));
const StudentTimetableView = lazy(() => import("./student/StudentTimetableView"));
const AttendanceSummaryView = lazy(() => import("./student/AttendanceSummaryView"));
const AttendanceHistoryView = lazy(() => import("./student/AttendanceHistoryView"));
const StudentCoursesView = lazy(() => import("./student/StudentCoursesView"));
const StudentAcademicHubView = lazy(() => import("./student/StudentAcademicHubView"));

// Admin Views
const AdminDashboardOverview = lazy(() => import("./admin/AdminDashboardOverview"));
const StudentManagementView = lazy(() => import("./admin/StudentManagementView"));
const FacultyManagementView = lazy(() => import("./admin/FacultyManagementView"));
const DepartmentManagementView = lazy(() => import("./admin/DepartmentManagementView"));
const InfrastructureManagementView = lazy(() => import("./admin/InfrastructureManagementView"));
const AttendanceSessionsView = lazy(() => import("./admin/AttendanceSessionsView"));
const AcademicsManagementView = lazy(() => import("./admin/AcademicsManagementView"));
const AdminAcademicOversightView = lazy(() => import("./admin/AdminAcademicOversightView"));

// Faculty Views
const FacultyDashboardOverview = lazy(() => import("./faculty/FacultyDashboardOverview"));
const FacultyTimetableView = lazy(() =>
  import("./faculty/FacultyTimetableView").then((m) => ({ default: m.FacultyTimetableView }))
);
const FacultySessionsView = lazy(() =>
  import("./faculty/FacultySessionsView").then((m) => ({ default: m.FacultySessionsView }))
);
const FacultyAttendanceLogsView = lazy(() =>
  import("./faculty/FacultyAttendanceLogsView").then((m) => ({ default: m.FacultyAttendanceLogsView }))
);
const FacultyAcademicManagerView = lazy(() => import("./faculty/FacultyAcademicManagerView"));
const FacultyQuizAnalyticsView = lazy(() => import("./faculty/FacultyQuizAnalyticsView"));

const PAGE_TITLES = {
  // Student Titles
  dashboard: "Student Portal Dashboard",
  "academic-hub": "Study Materials & Quizzes",
  timetable: "Class Schedule & Timetable",
  summary: "Institutional Attendance Summary",
  "attendance-logs": "Granular Attendance History",
  "absent-details": "Absenteeism Records",
  courses: "Registered Courses & Credits",

  // Admin Titles
  "admin-dashboard": "University Administrative Overview",
  students: "Student Information Directory",
  faculty: "Faculty & Staff Management",
  departments: "Academic Departments",
  infrastructure: "Campus Infrastructure & Facilities",
  academics: "Academic Offerings & Timetable Management",
  "admin-academic-oversight": "Academic Oversight",
  sessions: "Attendance Session Management",

  // Faculty Titles
  "faculty-dashboard": "Faculty Member Portal",
  "faculty-academics": "Academic Courseware & Quiz Builder",
  "faculty-quiz-analytics": "Assessment Analytics",
  "faculty-attendance": "Teaching Attendance Logs",
};

const PAGE_SUBTITLES = {
  // Student Subtitles
  dashboard: "Personalized academic performance and daily schedule.",
  "academic-hub": "Topic courseware and unit assessments.",
  timetable: "Weekly class timetable and lecture hall assignments.",
  summary: "Institutional attendance compliance and course percentages.",
  "attendance-logs": "Attendance audit logs and session history.",
  "absent-details": "Absence records and attendance alerts.",
  courses: "Active enrolled curriculum and academic credits.",

  // Admin Subtitles
  "admin-dashboard": "Institutional statistics and operational metrics.",
  students: "Student enrollments and academic cohorts.",
  faculty: "Faculty designations and departmental affiliations.",
  departments: "Academic departments and degree offerings.",
  infrastructure: "Campus blocks, classrooms, and labs.",
  academics: "Curriculum offerings and section schedules.",
  "admin-academic-oversight": "Curriculum materials, quizzes, and assessment oversight.",
  sessions: "Institutional class attendance sessions.",

  // Faculty Subtitles
  "faculty-dashboard": "Teaching assignments and daily schedule.",
  "faculty-academics": "Curriculum courseware, question banks, and quizzes.",
  "faculty-quiz-analytics": "Candidate performance, score registries, and integrity monitoring.",
  "faculty-attendance": "Verified attendance logs for assigned classes.",
};

const ROLE_PAGES = {
  STUDENT: ["dashboard", "academic-hub", "timetable", "summary", "attendance-logs", "absent-details", "courses"],
  ADMIN: ["admin-dashboard", "students", "faculty", "departments", "infrastructure", "academics", "admin-academic-oversight", "sessions"],
  FACULTY: ["faculty-dashboard", "faculty-academics", "faculty-quiz-analytics", "timetable", "sessions"],
};

export function Dashboard({ user, token, onLogout }) {
  const role = user?.role || "STUDENT";

  const initialPage = useMemo(() => {
    if (role === "ADMIN") return "admin-dashboard";
    if (role === "FACULTY") return "faculty-dashboard";
    return "dashboard";
  }, [role]);

  const resolveValidPage = useCallback(
    (target) => {
      const allowed = ROLE_PAGES[role] || ROLE_PAGES.STUDENT;
      if (target && allowed.includes(target)) {
        return target;
      }
      return initialPage;
    },
    [role, initialPage]
  );

  // Initialize page state from URL pathname -> URL hash -> localStorage -> initialPage
  const [page, setPageState] = useState(() => {
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname || "";
      if (
        pathname.startsWith("/faculty/academic") ||
        pathname.startsWith("/hod/academic")
      ) {
        return "faculty-academics";
      }
      if (window.location.hash) {
        const hash = window.location.hash.replace(/^#[/]?/, "").split("?")[0].trim();
        const allowed = ROLE_PAGES[role] || ROLE_PAGES.STUDENT;
        if (allowed.includes(hash)) return hash;
      }
    }
    try {
      const stored = localStorage.getItem(`ju_erp_active_page_${role}`);
      const allowed = ROLE_PAGES[role] || ROLE_PAGES.STUDENT;
      if (stored && allowed.includes(stored)) return stored;
    } catch {
      // Ignore storage errors
    }
    return initialPage;
  });

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleNavigate = useCallback(
    (nextPage) => {
      const resolved = resolveValidPage(nextPage);
      setPageState(resolved);
      try {
        localStorage.setItem(`ju_erp_active_page_${role}`, resolved);
        const pathname = window.location.pathname || "";
        const isDedicatedRoute =
          pathname.startsWith("/faculty/academic") ||
          pathname.startsWith("/hod/academic");
        if (!isDedicatedRoute && window.location.hash !== `#${resolved}`) {
          window.history.replaceState(null, "", `#${resolved}`);
        }
      } catch {
        // Ignore storage errors
      }
    },
    [resolveValidPage, role]
  );

  // Keep URL hash, browser navigation (Back/Forward), and localStorage in sync
  useEffect(() => {
    try {
      localStorage.setItem(`ju_erp_active_page_${role}`, page);
      const pathname = window.location.pathname || "";
      const isDedicatedRoute =
        pathname.startsWith("/faculty/academic") ||
        pathname.startsWith("/hod/academic");
      if (!isDedicatedRoute && window.location.hash !== `#${page}`) {
        window.history.replaceState(null, "", `#${page}`);
      }
    } catch {
      // Ignore storage errors
    }

    const onHashChange = () => {
      const hash = window.location.hash.replace(/^#[/]?/, "").split("?")[0].trim();
      const allowed = ROLE_PAGES[role] || ROLE_PAGES.STUDENT;
      if (allowed.includes(hash)) {
        setPageState(hash);
        try {
          localStorage.setItem(`ju_erp_active_page_${role}`, hash);
        } catch {
          // Ignore storage errors
        }
      }
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [page, role]);

  const renderContent = () => {
    switch (page) {
      // Student routes
      case "dashboard":
        return (
          <StudentDashboardOverview
            token={token}
            user={user}
            onNavigate={handleNavigate}
          />
        );

      case "academic-hub":
        return (
          <StudentAcademicHubView
            token={token}
            user={user}
          />
        );

      case "timetable":
        if (role === "FACULTY") {
          return <FacultyTimetableView token={token} />;
        }
        return <StudentTimetableView token={token} />;

      case "summary":
        return <AttendanceSummaryView token={token} />;

      case "attendance-logs":
        return <AttendanceHistoryView token={token} initialFilter="ALL" />;

      case "absent-details":
        return <AttendanceHistoryView token={token} initialFilter="ABSENT" />;

      case "courses":
        return <StudentCoursesView token={token} onNavigate={handleNavigate} />;

      // Admin routes
      case "admin-dashboard":
        return (
          <AdminDashboardOverview
            token={token}
            user={user}
            onNavigate={handleNavigate}
          />
        );

      case "students":
        return <StudentManagementView token={token} />;

      case "faculty":
        return <FacultyManagementView token={token} />;

      case "departments":
        return <DepartmentManagementView token={token} />;

      case "infrastructure":
        return <InfrastructureManagementView token={token} />;

      case "academics":
        return <AcademicsManagementView token={token} refreshTrigger={refreshTrigger} />;

      case "admin-academic-oversight":
        return <AdminAcademicOversightView token={token} />;

      case "sessions":
        if (role === "FACULTY") {
          return <FacultySessionsView token={token} />;
        }
        return <AttendanceSessionsView token={token} user={user} refreshTrigger={refreshTrigger} />;

      // Faculty routes
      case "faculty-dashboard":
        return (
          <FacultyDashboardOverview
            token={token}
            user={user}
            onNavigate={handleNavigate}
          />
        );

      case "faculty-academics":
        return <FacultyAcademicManagerView token={token} user={user} />;

      case "faculty-quiz-analytics":
        return <FacultyQuizAnalyticsView token={token} user={user} />;

      case "faculty-attendance":
        return <FacultyAttendanceLogsView token={token} />;

      default:
        return (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xs">
            <h3 className="text-lg font-bold text-gray-900">
              {PAGE_TITLES[page] || "Academic Portal"}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              The selected view is active and ready.
            </p>
            <button
              type="button"
              onClick={() => handleNavigate(initialPage)}
              className="mt-6 inline-flex items-center rounded-xl bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-900"
            >
              Return to Dashboard
            </button>
          </div>
        );
    }
  };

  return (
    <AppLayout
      user={user}
      activePage={page}
      onNavigate={handleNavigate}
      onLogout={onLogout}
      onRefresh={handleRefresh}
      pageTitle={PAGE_TITLES[page] || "Joy University ERP"}
      pageSubtitle={PAGE_SUBTITLES[page] || "Joy University Smart Campus Enterprise Portal"}
    >
      <div key={page}>
        <Suspense fallback={<LoadingSpinner message="Loading module..." />}>
          {renderContent()}
        </Suspense>
      </div>
    </AppLayout>
  );
}

export default Dashboard;
