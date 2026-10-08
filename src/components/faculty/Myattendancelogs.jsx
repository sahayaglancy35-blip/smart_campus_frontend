import { useState, useEffect, useMemo } from "react";
import { getAttendanceSessions } from "../../api/attendance";
import StatCard from "../common/StatCard";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

// TODO: confirm the real field names once you've checked how a
// CLOSED session's attendance counts are actually returned by the
// API (present/absent counts could live on the session object
// itself, or need a second endpoint per session — adjust here once
// confirmed).
const getStart = (s) => s.start_time || s.scheduled_at || s.date || null;
const getSubject = (s) => s.subject_name || s.subject || s.course_name || "Untitled Session";
const getRoom = (s) => s.room || s.classroom || s.venue || "—";
const getSection = (s) => s.section || s.batch || "";
const getPresentCount = (s) => s.present_count ?? s.presentCount ?? s?.stats?.present ?? null;
const getAbsentCount = (s) => s.absent_count ?? s.absentCount ?? s?.stats?.absent ?? null;
const getTotalCount = (s) => {
  const total = s.total_students ?? s.totalStudents ?? s?.stats?.total;
  if (total != null) return total;
  const present = getPresentCount(s);
  const absent = getAbsentCount(s);
  return present != null && absent != null ? present + absent : null;
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MyAttendanceLogs({ token, user }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadLogs() {
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
          setError(err.message || "Failed to load your attendance logs.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadLogs();
    return () => controller.abort();
  }, [token, user]);

  // Only conducted (CLOSED) sessions belong in a historical log,
  // most recent first.
  const conductedSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.status === "CLOSED")
        .sort((a, b) => new Date(getStart(b) || 0) - new Date(getStart(a) || 0)),
    [sessions]
  );

  const totalConducted = conductedSessions.length;

  const totalStudentsMarked = conductedSessions.reduce((sum, s) => {
    const total = getTotalCount(s);
    return sum + (total || 0);
  }, 0);

  const averageAttendancePct = useMemo(() => {
    const withStats = conductedSessions.filter(
      (s) => getPresentCount(s) != null && getTotalCount(s)
    );
    if (withStats.length === 0) return null;

    const avg =
      withStats.reduce((sum, s) => sum + (getPresentCount(s) / getTotalCount(s)) * 100, 0) /
      withStats.length;

    return Math.round(avg);
  }, [conductedSessions]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-950 via-green-900 to-emerald-900 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
            <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-green-300" />
            My Attendance Logs
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Your conducted sessions
          </h2>
          <p className="mt-1 max-w-xl text-sm text-green-100">
            A record of lectures you've taken and the attendance marked for each.
          </p>
        </div>
      </div>

      {loading && <LoadingSpinner message="Loading your attendance logs..." />}
      {error && <Alert type="error" message={error} />}

      {!loading && !error && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Sessions Conducted"
              value={totalConducted}
              color="gray"
              icon={ClipboardDocumentCheckIcon}
            />
            <StatCard
              label="Average Attendance"
              value={averageAttendancePct != null ? `${averageAttendancePct}%` : "—"}
              color="green"
              icon={ChartBarIcon}
            />
            <StatCard
              label="Total Students Marked"
              value={totalStudentsMarked}
              color="emerald"
              icon={UserGroupIcon}
            />
          </div>

          {/* Log list */}
          <div className="space-y-3">
            {conductedSessions.length === 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                No conducted sessions yet.
              </div>
            )}

            {conductedSessions.map((session, index) => {
              const present = getPresentCount(session);
              const total = getTotalCount(session);
              const pct = present != null && total ? Math.round((present / total) * 100) : null;

              return (
                <div
                  key={session.id ?? index}
                  className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-700 to-green-900 text-white">
                      <ClipboardDocumentCheckIcon className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-gray-900">{getSubject(session)}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDaysIcon className="h-3.5 w-3.5" />
                          {formatDate(getStart(session))}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPinIcon className="h-3.5 w-3.5" />
                          {getRoom(session)}
                        </span>
                        {getSection(session) && <span>Section {getSection(session)}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                    {present != null && total ? (
                      <>
                        <span className="text-sm font-bold text-gray-900">
                          {present}/{total} present
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            pct >= 75 ? "text-green-700" : pct >= 50 ? "text-amber-600" : "text-red-600"
                          }`}
                        >
                          {pct}% attendance
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">Attendance data unavailable</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default MyAttendanceLogs;