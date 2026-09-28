import { useState, useEffect } from "react";
import { getAttendanceSessions } from "../../api/attendance";
import StatCard from "../common/StatCard";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

export function FacultyDashboardOverview({ token, user, onNavigate }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadFacultyData() {
      try {
        setLoading(true);
        setError("");
        const res = await getAttendanceSessions(token, controller.signal);
        const data = Array.isArray(res?.data) ? res.data : [];
        // Filter by user's faculty_id if present
        const filtered = user?.facultyId
          ? data.filter((s) => s.faculty_id === user.facultyId)
          : data;
        setSessions(filtered);
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
  }, [token, user]);

  const activeSessions = sessions.filter(
    (s) => s.status === "OPEN" || s.status === "SCHEDULED"
  );
  const completedSessions = sessions.filter((s) => s.status === "CLOSED");

  const quickLinks = [
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
      description: "Check your assigned lecture slots and classrooms",
      icon: CalendarDaysIcon,
      color: "from-emerald-700 to-teal-900",
    },
    {
      key: "faculty-attendance",
      label: "Attendance Audit Logs",
      description: "Review conducted lectures and historical session attendance",
      icon: ClockIcon,
      color: "from-teal-800 to-green-950",
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
            Welcome, Professor {user?.name || ""}
          </h2>
          <p className="mt-1 text-sm text-green-100 max-w-xl">
            Manage your daily course schedule, create and manage attendance sessions, and audit
            class rosters.
          </p>
        </div>
      </div>

      {loading && <LoadingSpinner message="Loading assigned sessions..." />}
      {error && <Alert type="error" message={error} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Scheduled Sessions"
          value={sessions.length}
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
          value={completedSessions.length}
          color="emerald"
          icon={ClockIcon}
        />
      </div>

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
