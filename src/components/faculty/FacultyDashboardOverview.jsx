import { useState, useEffect } from "react";
import { fetchFacultyDashboard } from "../../api/faculty";
import StatCard from "../common/StatCard";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import Badge from "../common/Badge";
import {
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  SparklesIcon,
  ChartBarIcon,
  BookOpenIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";

export function FacultyDashboardOverview({ token, user, onNavigate }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadFacultyData() {
      try {
        setLoading(true);
        setError("");
        const res = await fetchFacultyDashboard(token, controller.signal);
        setDashboard(res?.data || null);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load faculty portal data.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadFacultyData();
    return () => controller.abort();
  }, [token]);

  const metrics = dashboard?.metrics || {};
  const activeSessions = dashboard?.active_sessions || [];
  const todayTimetable = dashboard?.today_timetable || [];

  const quickLinks = [
    {
      key: "faculty-academics",
      label: "Courseware & Quiz Builder",
      description: "Manage curriculum courseware, question banks, and quizzes",
      icon: BookOpenIcon,
      color: "from-emerald-800 to-green-900",
    },
    {
      key: "faculty-quiz-analytics",
      label: "Assessment Analytics",
      description: "Candidate scores, item accuracy, and integrity monitoring",
      icon: ShieldExclamationIcon,
      color: "from-teal-800 to-emerald-950",
    },
    {
      key: "sessions",
      label: "Class Attendance Sessions",
      description: "Initiate lecture sessions and verify student presence",
      icon: ClipboardDocumentCheckIcon,
      color: "from-green-700 to-emerald-900",
    },
    {
      key: "timetable",
      label: "Teaching Schedule",
      description: "Assigned lecture slots and classroom venues",
      icon: CalendarDaysIcon,
      color: "from-emerald-700 to-teal-900",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-green-900 to-teal-900 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
            <SparklesIcon className="h-3.5 w-3.5 text-green-300" />
            Faculty Portal Console
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome, Professor {user?.name || dashboard?.faculty?.full_name || ""}
          </h2>
          <p className="mt-1 text-sm text-green-100 max-w-xl">
            {dashboard?.faculty?.designation || "Faculty Member"} •{" "}
            {dashboard?.faculty?.department_name || user?.department || "Joy University"}
          </p>
        </div>
      </div>

      {loading && <LoadingSpinner message="Loading assigned sessions..." />}
      {error && <Alert type="error" message={error} />}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard
          label="Today's Classes"
          value={todayTimetable.length}
          color="gray"
          icon={CalendarDaysIcon}
        />
        <StatCard
          label="Active / Open Sessions"
          value={activeSessions.length}
          color="green"
          icon={ClipboardDocumentCheckIcon}
        />
        <StatCard
          label="Conducted Sessions"
          value={metrics.completed_sessions || 0}
          color="emerald"
          icon={ClockIcon}
        />
        <StatCard
          label="Attendance Rate"
          value={`${metrics.attendance_percentage ?? 0}%`}
          color="blue"
          icon={ChartBarIcon}
        />
      </div>

      {/* Active Session Notification */}
      {activeSessions.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="success">IN PROGRESS</Badge>
                <h4 className="text-sm font-bold text-gray-900">
                  You have {activeSessions.length} active class session(s) open
                </h4>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                {activeSessions.map((s) => `${s.subject_code} (${s.room_no || "Online"})`).join(", ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("sessions")}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition"
            >
              Resume Session &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Teaching Management Modules
          </h3>
          <p className="text-xs text-gray-500">
            Quick links to common instructor workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className="group flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md"
              >
                <div>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white shadow-sm transition group-hover:scale-105`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h4 className="mt-4 text-base font-bold text-gray-900 group-hover:text-green-800">
                    {item.label}
                  </h4>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 border-t border-gray-100 pt-3 text-xs font-semibold text-green-700">
                  Open Console &rarr;
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FacultyDashboardOverview;
