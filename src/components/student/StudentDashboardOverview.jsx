import { useState, useEffect } from "react";
import { fetchStudentDashboard } from "../../api/student";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import StatCard from "../common/StatCard";
import {
  CalendarDaysIcon,
  ChartPieIcon,
  AcademicCapIcon,
  ClockIcon,
  UserMinusIcon,
  SparklesIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";

export function StudentDashboardOverview({ token, user, onNavigate }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");
        const result = await fetchStudentDashboard(token, controller.signal);
        setDashboardData(result?.data || null);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load student dashboard metrics.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => controller.abort();
  }, [token]);

  const quickLinks = [
    {
      key: "academic-hub",
      label: "Courseware & Quizzes",
      description: "Unit courseware and assessments",
      icon: BookOpenIcon,
      color: "from-emerald-800 to-green-900",
    },
    {
      key: "timetable",
      label: "Today's Timetable",
      description: "Class schedule and lecture halls",
      icon: CalendarDaysIcon,
      color: "from-emerald-700 to-green-800",
    },
    {
      key: "summary",
      label: "Attendance Summary",
      description: "Course-wise attendance compliance",
      icon: ChartPieIcon,
      color: "from-green-700 to-emerald-900",
    },
    {
      key: "courses",
      label: "Registered Courses",
      description: "Active courses and academic credits",
      icon: AcademicCapIcon,
      color: "from-teal-700 to-green-900",
    },
    {
      key: "attendance-logs",
      label: "Attendance History",
      description: "Session attendance records",
      icon: ClockIcon,
      color: "from-green-800 to-emerald-950",
    },
    {
      key: "absent-details",
      label: "Absent Records",
      description: "Missed classes and warnings",
      icon: UserMinusIcon,
      color: "from-emerald-800 to-teal-900",
    },
  ];

  const attendance = dashboardData?.attendance;
  const profile = dashboardData?.profile;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-900 via-green-800 to-emerald-900 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
            <SparklesIcon className="h-3.5 w-3.5 text-green-300" />
            Joy University Student Portal
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {user?.name || "Student"}!
          </h2>
          <p className="mt-1 text-sm text-green-100 max-w-xl">
            {profile?.programme_name
              ? `${profile.programme_name} • ${profile.degree_name || "Undergraduate"}`
              : "Access your lecture schedules, track your institutional attendance, and manage registered courses."}
          </p>
        </div>
      </div>

      {loading && <LoadingSpinner message="Updating dashboard metrics..." />}
      {error && <Alert type="error" message={error} />}

      {/* Aggregate Stats */}
      {attendance && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Overall Attendance"
            value={`${Number(attendance.attendance_percentage || 0).toFixed(1)}%`}
            color={attendance.attendance_percentage >= 75 ? "green" : "red"}
          />
          <StatCard
            label="Total Classes"
            value={attendance.total_classes || 0}
            color="gray"
          />
          <StatCard
            label="Attended"
            value={attendance.attended_classes || 0}
            color="emerald"
          />
          <StatCard
            label="Absent"
            value={attendance.absent_classes || 0}
            color="red"
          />
        </div>
      )}

      {/* Quick Links Section */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Quick Navigation Links
          </h3>
          <p className="text-xs text-gray-500">
            Frequently accessed student services and academic records.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className="group flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white shadow-sm transition group-hover:scale-105`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-semibold text-green-700 opacity-0 transition group-hover:opacity-100">
                    Open &rarr;
                  </span>
                </div>

                <div className="mt-4">
                  <h4 className="text-base font-bold text-gray-900 group-hover:text-green-800">
                    {item.label}
                  </h4>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default StudentDashboardOverview;
