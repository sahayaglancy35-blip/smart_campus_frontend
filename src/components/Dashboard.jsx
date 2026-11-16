import { useState, useMemo, useCallback, useEffect } from "react";
import AppLayout from "./layout/AppLayout";

// Student Views
import StudentDashboardOverview from "./student/StudentDashboardOverview";
import StudentTimetableView from "./student/StudentTimetableView";
import AttendanceSummaryView from "./student/AttendanceSummaryView";
import AttendanceHistoryView from "./student/AttendanceHistoryView";
import StudentCoursesView from "./student/StudentCoursesView";
import StudentAcademicHubView from "./student/StudentAcademicHubView";

// Admin Views
import AdminDashboardOverview from "./admin/AdminDashboardOverview";
import StudentManagementView from "./admin/StudentManagementView";
import FacultyManagementView from "./admin/FacultyManagementView";
import DepartmentManagementView from "./admin/DepartmentManagementView";
import InfrastructureManagementView from "./admin/InfrastructureManagementView";
import AttendanceSessionsView from "./admin/AttendanceSessionsView";
import AcademicsManagementView from "./admin/AcademicsManagementView";
import AdminAcademicOversightView from "./admin/AdminAcademicOversightView";

// Faculty Views
import FacultyDashboardOverview from "./faculty/FacultyDashboardOverview";
import { FacultyTimetableView } from "./faculty/FacultyTimetableView";
import { FacultySessionsView } from "./faculty/FacultySessionsView";
import { FacultyAttendanceLogsView } from "./faculty/FacultyAttendanceLogsView";
import FacultyAcademicManagerView from "./faculty/FacultyAcademicManagerView";
import FacultyQuizAnalyticsView from "./faculty/FacultyQuizAnalyticsView";

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
  "admin-academic-oversight": "Faculty Quizzes, Materials & Student Activities",
  sessions: "Attendance Session Management",

  // Faculty Titles
  "faculty-dashboard": "Faculty Member Portal",
  "faculty-academics": "Academic Courseware & Quiz Builder",
  "faculty-quiz-analytics": "Quiz Results & Integrity Analytics",
  "faculty-attendance": "Teaching Attendance Logs",
};

const PAGE_SUBTITLES = {
  // Student Subtitles
  dashboard: "Personalized academic performance and daily schedule overview.",
  "academic-hub": "Topic courseware, in-page document/slides viewer, and proctored unit quizzes.",
  timetable: "Weekly class timetable and lecture hall assignments.",
  summary: "Institutional attendance compliance and course-wise percentages.",
  "attendance-logs": "Granular attendance audit logs and session history.",
  "absent-details": "Records of missed class sessions and attendance alerts.",
  courses: "Active enrolled curriculum, course coordinators, and academic credits.",

  // Admin Subtitles
  "admin-dashboard": "Institutional statistics, registry metrics, and operational control.",
  students: "Manage student enrollments, academic cohorts, and profiles.",
  faculty: "Manage academic faculty, staff designations, and departmental affiliations.",
  departments: "Configure institutional faculties, academic departments, codes, and operational status.",
  infrastructure: "Manage campus blocks, lecture halls, smart classrooms, and labs.",
  academics: "Manage constituent schools, programs, batches, course offerings, and section schedules.",
  "admin-academic-oversight": "College-wide monitoring of all faculty-authored quizzes, learning materials, and student quiz activities.",
  sessions: "Oversee institutional class attendance sessions and roster records.",

  // Faculty Subtitles
  "faculty-dashboard": "Teaching assignments, upcoming lectures, and attendance operations.",
  "faculty-academics": "Upload curriculum resources, manage question banks, and configure quiz schedules.",
  "faculty-quiz-analytics": "Class score registries, accuracy analytics, anti-cheat detection, and score corrections.",
  "faculty-attendance": "Audit logs and verified attendance history for your assigned classes.",
};

const ROLE_PAGES = {
  STUDENT: ["dashboard", "academic-hub", "timetable", "summary", "attendance-logs", "absent-details", "courses"],
  ADMIN: ["admin-dashboard", "students", "faculty", "departments", "infrastructure", "academics", "admin-academic-oversight", "sessions"],
  FACULTY: ["faculty-dashboard", "faculty-academics", "faculty-quiz-analytics", "timetable", "sessions", "faculty-attendance"],
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

  // Initialize page state from URL hash -> localStorage -> initialPage
  const [page, setPageState] = useState(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.replace(/^#[/]?/, "").split("?")[0].trim();
      const allowed = ROLE_PAGES[role] || ROLE_PAGES.STUDENT;
      if (allowed.includes(hash)) return hash;
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
        if (window.location.hash !== `#${resolved}`) {
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
      if (window.location.hash !== `#${page}`) {
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
      <div key={page}>{renderContent()}</div>
    </AppLayout>
  );
}

export default Dashboard;
