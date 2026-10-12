import { useState, useMemo } from "react";
import AppLayout from "./layout/AppLayout";

// Student Views
import StudentDashboardOverview from "./student/StudentDashboardOverview";
import StudentTimetableView from "./student/StudentTimetableView";
import AttendanceSummaryView from "./student/AttendanceSummaryView";
import AttendanceHistoryView from "./student/AttendanceHistoryView";
import StudentCoursesView from "./student/StudentCoursesView";

// Admin Views
import AdminDashboardOverview from "./admin/AdminDashboardOverview";
import StudentManagementView from "./admin/StudentManagementView";
import FacultyManagementView from "./admin/FacultyManagementView";
import DepartmentManagementView from "./admin/DepartmentManagementView";
import InfrastructureManagementView from "./admin/InfrastructureManagementView";
import AttendanceSessionsView from "./admin/AttendanceSessionsView";

// Faculty Views
import FacultyDashboardOverview from "./faculty/FacultyDashboardOverview";
import FacultySessionsView from "./faculty/FacultySessionsView";
import FacultyAttendanceLogsView from "./faculty/FacultyAttendanceLogsView";
import FacultyTimetableView from "./faculty/FacultyTimetableView";
import MySchedule from "./faculty/MySchedule";
import MyAttendanceLogs from "./faculty/Myattendancelogs";

const PAGE_TITLES = {
  // Student Titles
  dashboard: "Student Portal Dashboard",
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
  sessions: "Attendance Session Management",

  // Faculty Titles
  "faculty-dashboard": "Faculty Member Portal",
  "faculty-attendance": "Teaching Attendance Logs",
};

export function Dashboard({ user, token, onLogout }) {
  const role = user?.role || "STUDENT";

  const initialPage = useMemo(() => {
    if (role === "ADMIN") return "admin-dashboard";
    if (role === "FACULTY") return "faculty-dashboard";
    return "dashboard";
  }, [role]);

  const [page, setPage] = useState(initialPage);

  const renderContent = () => {
    switch (page) {
      // Student routes
      case "dashboard":
        return (
          <StudentDashboardOverview
            token={token}
            user={user}
            onNavigate={setPage}
          />
        );

      case "timetable":
        return role === "FACULTY" ? (
          <MySchedule token={token} user={user} />
        ) : (
          <StudentTimetableView token={token} />
        );
      case "summary":
        return <AttendanceSummaryView token={token} />;

      case "attendance-logs":
        return <AttendanceHistoryView token={token} initialFilter="ALL" />;

      case "absent-details":
        return <AttendanceHistoryView token={token} initialFilter="ABSENT" />;

      case "courses":
        return <StudentCoursesView token={token} />;

      // Admin routes
      case "admin-dashboard":
        return (
          <AdminDashboardOverview
            token={token}
            user={user}
            onNavigate={setPage}
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

      case "sessions":
        return <AttendanceSessionsView token={token} user={user} />;

      // Faculty routes
      case "faculty-dashboard":
        return (
          <FacultyDashboardOverview
            token={token}
            user={user}
            onNavigate={setPage}
          />
        );

      case "faculty-attendance":
         return <MyAttendanceLogs token={token} user={user} />;
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
              onClick={() => setPage(initialPage)}
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
      onNavigate={setPage}
      onLogout={onLogout}
      pageTitle={PAGE_TITLES[page] || "Joy University ERP"}
    >
      {renderContent()}
    </AppLayout>
  );
}

export default Dashboard;