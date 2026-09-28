import { useState, useEffect } from "react";
import {
  CalendarDaysIcon,
  ChartPieIcon,
  UserMinusIcon,
  BriefcaseIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import {
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

const QUICK_LINKS = [
  { key: "timetable", label: "Today's Timetable", icon: CalendarDaysIcon },
  { key: "summary", label: "Attendance Summary", icon: ChartPieIcon },
  { key: "absent", label: "Absent Details", icon: UserMinusIcon },
  { key: "onduty", label: "On Duty", icon: BriefcaseIcon },
];

function StatCard({ label, value, color = "gray" }) {
  const colors = {
    gray: "bg-gray-50 text-gray-900",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div
      className={`rounded-lg p-3 text-center ${colors[color] || colors.gray}`}
    >
      <p className="text-xl font-semibold">{value ?? 0}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}

function AttendanceSummary({ token }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Please log in to view attendance.");
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();

    async function fetchAttendance() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE_URL}/student/me/attendance/summary`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to load attendance summary.",
          );
        }

        setSubjects(Array.isArray(result.data) ? result.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load attendance.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchAttendance();
    return () => controller.abort();
  }, [token]);

  if (loading) {
    return (
      <p className="rounded-xl bg-white p-6 text-gray-500 shadow-sm">
        Loading attendance summary...
      </p>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
      >
        {error}
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 text-gray-600 shadow-sm">
        No attendance records available yet.
      </div>
    );
  }

  const total = subjects.reduce(
    (sum, s) => sum + Number(s.total_classes || 0),
    0,
  );
  const attended = subjects.reduce(
    (sum, s) => sum + Number(s.attended_classes || 0),
    0,
  );
  const absent = subjects.reduce(
    (sum, s) => sum + Number(s.absent_classes || 0),
    0,
  );
  const overall = total ? (attended / total) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Classes" value={total} />
        <StatCard label="Classes Attended" value={attended} color="green" />
        <StatCard label="Classes Absent" value={absent} color="red" />
      </div>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-green-200/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-green-950">
              Overall Attendance
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Calculated from recorded classes.
            </p>
          </div>
          <span className="text-2xl font-bold text-green-800">
            {overall.toFixed(2)}%
          </span>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-green-600"
            style={{ width: `${Math.min(100, overall)}%` }}
          />
        </div>
      </section>

      <h2 className="text-lg font-semibold text-green-950">
        Subject-wise Attendance
      </h2>
      {subjects.map((subject) => {
        const percentage =
          subject.attendance_percentage == null
            ? null
            : Number(subject.attendance_percentage);

        return (
          <section
            key={subject.subject_id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {subject.subject_name}
                </h3>
                <p className="text-sm text-gray-500">{subject.subject_code}</p>
              </div>
              <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
                {percentage == null ? "N/A" : `${percentage.toFixed(2)}%`}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <StatCard label="Total" value={subject.total_classes} />
              <StatCard
                label="Attended"
                value={subject.attended_classes}
                color="green"
              />
              <StatCard
                label="Absent"
                value={subject.absent_classes}
                color="red"
              />
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-green-500"
                style={{
                  width: `${Math.min(100, Math.max(0, percentage || 0))}%`,
                }}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* Avatar — inline SVG bust illustration */
function Avatar({ gender = "male", size = 96 }) {
  const isFemale = gender === "female";

  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-100 ring-4 ring-white shadow-sm"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full"
        role="img"
        aria-label={isFemale ? "Female avatar" : "Male avatar"}
      >
        <circle cx="50" cy="50" r="50" fill="#DCFCE7" />
        <path
          d={
            isFemale
              ? "M14 100 Q14 70 50 70 Q86 70 86 100 Z"
              : "M12 100 Q12 72 50 72 Q88 72 88 100 Z"
          }
          fill={isFemale ? "#15803D" : "#166534"}
        />
        <rect x="42" y="58" width="16" height="16" fill="#E8B08A" />
        <circle cx="50" cy="45" r="20" fill="#F1C09A" />
        {isFemale ? (
          <path
            d="M27 50 Q23 20 50 18 Q77 20 73 50 Q73 34 64 30 Q58 40 50 32 Q42 40 36 30 Q27 34 27 50 Z M28 46 Q22 62 27 78 Q30 64 32 50 Z M72 46 Q78 62 73 78 Q70 64 68 50 Z"
            fill="#3F2A1D"
          />
        ) : (
          <path
            d="M28 42 Q26 22 50 21 Q74 22 72 42 Q71 30 50 29 Q29 30 28 42 Z"
            fill="#2B2119"
          />
        )}
      </svg>
    </div>
  );
}

function Sidebar({ user, onLogoutClick }) {
  return (
    <aside className="flex w-full shrink-0 flex-col bg-green-900 px-6 py-8 md:w-[302px] md:py-10">
      <div className="flex flex-col items-center text-center">
        <Avatar gender={user?.gender} size={88} />
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-white">
            Welcome, {user?.name || "User"}
          </h3>
          <p className="text-sm text-green-200">{user?.role || "Student"}</p>
        </div>
      </div>

      <dl className="mt-8 space-y-4 text-center text-sm">
        <div>
          <dt className="text-green-300">Register No</dt>
          <dd className="mt-0.5 font-medium text-white">
            {user?.registerNo || "N/A"}
          </dd>
        </div>
        {user?.role === "Student" && user?.department && (
          <div>
            <dt className="text-green-300">Department</dt>
            <dd className="mt-0.5 font-medium text-white">{user.department}</dd>
          </div>
        )}
        <div>
          <dt className="text-green-300">Email</dt>
          <dd className="mt-0.5 break-all font-medium text-white">
            {user?.email || "N/A"}
          </dd>
        </div>
      </dl>

      <div className="mt-8 border-t border-green-800 pt-6 text-center md:mt-auto">
        <button
          type="button"
          onClick={onLogoutClick}
          className="inline-flex items-center gap-2 text-sm font-medium text-green-100 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}

function DashboardHeader() {
  return <header className="h-14 shrink-0 border-b border-gray-200 bg-white" />;
}

function DashboardFooter() {
  return <footer className="h-14 shrink-0 border-t border-gray-200 bg-white" />;
}

function DashboardHome({ onNavigate }) {
  return (
    <div className="grid grid-cols-1 justify-items-center gap-8 sm:grid-cols-2">
      {QUICK_LINKS.map(({ key, label, icon: Icon }) => (
        <div
          key={key}
          className="flex h-[220px] w-full max-w-[300px] flex-col items-center justify-center gap-5 rounded-xl bg-white px-5 py-6 text-center shadow-lg ring-1 ring-green-200/50 transition hover:-translate-y-1 hover:shadow-xl"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-green-800 text-white shadow-inner ring-4 ring-green-100">
            <Icon className="h-10 w-10" />
          </span>
          <button
            type="button"
            onClick={() => onNavigate(key)}
            className="text-base font-semibold text-green-800 hover:text-green-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            {label}
          </button>
        </div>
      ))}
    </div>
  );
}

function PlaceholderSection({ title, onBack }) {
  return (
    <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-green-200">
      <p className="text-gray-600">{title} content will appear here.</p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 inline-flex items-center gap-2 text-base font-medium text-green-800 hover:text-green-950 hover:underline"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        Back to dashboard
      </button>
    </div>
  );
}

function LogoutModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm scale-100 transform rounded-2xl bg-green-50 p-6 shadow-2xl ring-1 ring-green-200 transition-all">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-200 text-green-800">
            <ExclamationTriangleIcon className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-green-950">
            Are you sure?
          </h3>
          <p className="mt-2 text-sm text-green-800">
            Do you really want to log out of your session?
          </p>
          <div className="mt-6 flex w-full items-center justify-center gap-3">
            <button
              type="button"
              onClick={onConfirm}
              className="w-1/2 rounded-lg bg-green-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-1/2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-green-800 ring-1 ring-green-300 transition hover:bg-green-100"
            >
              No
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PAGE_TITLES = {
  dashboard: "Attendance",
  timetable: "Today's Timetable",
  summary: "Attendance Summary",
  absent: "Absent Details",
  onduty: "On Duty",
  courses: "My Courses",
};

const WEEK_DAYS = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
  { id: 7, name: "Sunday" },
];

const formatTime = (time) => {
  if (!time) return "--";

  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
};

function StudentTimetable({ token }) {
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Please log in to view your timetable.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchTimetable = async () => {
      try {
        setLoading(true);
        setError("");

        const API_BASE_URL =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

        const response = await fetch(`${API_BASE_URL}/student/me/timetable`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load timetable.");
        }

        const entries = Array.isArray(result.data) ? result.data : [];

        entries.sort(
          (a, b) =>
            a.day_of_week - b.day_of_week ||
            a.start_time.localeCompare(b.start_time),
        );

        setTimetable(entries);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to load timetable.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchTimetable();

    return () => controller.abort();
  }, [token]);

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 text-gray-600 shadow-sm">
        Loading your timetable...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        {error}
      </div>
    );
  }

  if (timetable.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800">
          No timetable available
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Your scheduled classes will appear here when available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">My Timetable</h2>
        <p className="mt-1 text-sm text-gray-500">
          View your scheduled classes, faculty, and classrooms.
        </p>
      </div>

      {WEEK_DAYS.map((day) => {
        const classes = timetable.filter(
          (item) => Number(item.day_of_week) === day.id,
        );

        if (classes.length === 0) return null;

        return (
          <section key={day.id} className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">
              {day.name}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({classes.length} {classes.length === 1 ? "class" : "classes"})
              </span>
            </h3>

            <div className="space-y-3">
              {classes.map((item) => (
                <article
                  key={item.slot_id}
                  className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">
                        {item.subject_code}
                      </p>

                      <h4 className="mt-1 text-lg font-semibold text-gray-800">
                        {item.subject_name}
                      </h4>

                      <p className="mt-2 text-sm text-gray-600">
                        Faculty: {item.faculty_name || "Not assigned"}
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        Classroom: {item.classroom || "Not assigned"}
                      </p>
                    </div>

                    <div className="shrink-0 rounded-lg bg-green-50 px-4 py-3">
                      <p className="text-sm font-semibold text-green-800">
                        {formatTime(item.start_time)}
                      </p>
                      <p className="text-xs text-green-700">
                        to {formatTime(item.end_time)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function StudentCourses({ token }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Please log in to view your courses.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError("");

        const API_BASE_URL =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

        const response = await fetch(`${API_BASE_URL}/student/me/courses`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load courses.");
        }

        setCourses(Array.isArray(result.data) ? result.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to load courses.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchCourses();

    return () => controller.abort();
  }, [token]);

  const totalCredits = courses.reduce(
    (total, course) => total + Number(course.credits || 0),
    0,
  );

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 text-gray-600 shadow-sm">
        Loading your courses...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        {error}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800">
          No courses found
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Your registered courses will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">My Courses</h2>
        <p className="mt-1 text-sm text-gray-500">
          View your registered subjects and credit details.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-green-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Registered Courses</p>
          <p className="mt-2 text-3xl font-bold text-green-800">
            {courses.length}
          </p>
        </div>

        <div className="rounded-xl border border-green-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Credits</p>
          <p className="mt-2 text-3xl font-bold text-green-800">
            {totalCredits}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {courses.map((course) => (
          <article
            key={course.enrollment_id}
            className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-md bg-green-50 px-3 py-1 text-sm font-semibold text-green-800">
                {course.subject_code}
              </span>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {course.enrollment_status}
              </span>
            </div>

            <h3 className="mt-4 text-lg font-semibold text-gray-800">
              {course.subject_name}
            </h3>

            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium text-gray-700">Credits:</span>{" "}
                {Number(course.credits)}
              </p>

              <p>
                <span className="font-medium text-gray-700">Type:</span>{" "}
                {course.delivery_type}
              </p>

              <p>
                <span className="font-medium text-gray-700">Registration:</span>{" "}
                {course.registration_type}
              </p>

              <p>
                <span className="font-medium text-gray-700">Section:</span>{" "}
                {course.section_code}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
function Dashboard({ user, token, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const goDashboard = () => setPage("dashboard");

  const renderContent = () => {
    // Dashboard Home
    if (page === "dashboard") {
      return <DashboardHome onNavigate={setPage} />;
    }

    // Attendance Summary
    if (page === "summary") {
      return (
        <div className="space-y-5">
          <AttendanceSummary token={token} />

          <div className="text-center">
            <button
              type="button"
              onClick={goDashboard}
              className="inline-flex items-center gap-2 text-base font-medium text-green-800 hover:text-green-950 hover:underline"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              Back to dashboard
            </button>
          </div>
        </div>
      );
    }

    // Student Timetable
    if (page === "timetable") {
      return (
        <div className="space-y-5">
          <StudentTimetable token={token} />

          <div className="text-center">
            <button
              type="button"
              onClick={goDashboard}
              className="inline-flex items-center gap-2 text-base font-medium text-green-800 hover:text-green-950 hover:underline"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              Back to dashboard
            </button>
          </div>
        </div>
      );
    }
    // Student Courses
    if (page === "courses") {
      return (
        <div className="space-y-5">
          <StudentCourses token={token} />

          <div className="text-center">
            <button
              type="button"
              onClick={goDashboard}
              className="inline-flex items-center gap-2 text-base font-medium text-green-800 hover:text-green-950 hover:underline"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              Back to dashboard
            </button>
          </div>
        </div>
      );
    }
    // Other pages
    return (
      <PlaceholderSection title={PAGE_TITLES[page]} onBack={goDashboard} />
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-green-100">
      <DashboardHeader />

      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar user={user} onLogoutClick={() => setShowLogoutModal(true)} />

        <main className="flex-1 px-6 py-6 sm:px-10 sm:py-8">
          <h1 className="text-3xl font-bold tracking-tight text-green-950">
            {PAGE_TITLES[page]}
          </h1>

          <div className="mt-6">{renderContent()}</div>
        </main>
      </div>

      <DashboardFooter />

      <LogoutModal
        isOpen={showLogoutModal}
        onConfirm={onLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  );
}
export default Dashboard;
