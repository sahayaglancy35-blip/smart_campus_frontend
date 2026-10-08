import { useState, useEffect, useMemo } from "react";
import { getAttendanceSessions } from "../../api/attendance";
import StatCard from "../common/StatCard";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  AcademicCapIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

const STATUS_STYLES = {
  OPEN: "bg-green-100 text-green-800",
  SCHEDULED: "bg-amber-100 text-amber-800",
  CLOSED: "bg-gray-100 text-gray-600",
};

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(value) {
  if (!value) return "Unscheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

// TODO: confirm the real field names once the sessions API response
// shape is finalized for schedule data (date/time, subject, room).
// These getters fall back across a few likely names so the page
// still renders sensibly either way, but should be tightened once
// the backend contract is locked in.
const getStart = (s) => s.start_time || s.scheduled_at || s.date || null;
const getSubject = (s) => s.subject_name || s.subject || s.course_name || "Untitled Session";
const getRoom = (s) => s.room || s.classroom || s.venue || "—";
const getSection = (s) => s.section || s.batch || "";

export function MySchedule({ token, user, onBack }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadSchedule() {
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
          setError(err.message || "Failed to load your schedule.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadSchedule();
    return () => controller.abort();
  }, [token, user]);

  const sorted = useMemo(
    () =>
      [...sessions].sort((a, b) => new Date(getStart(a) || 0) - new Date(getStart(b) || 0)),
    [sessions]
  );

  const todayKey = new Date().toDateString();

  const todaysSessions = sorted.filter((s) => {
    const start = getStart(s);
    return start && new Date(start).toDateString() === todayKey;
  });

  const upcomingSessions = sorted.filter((s) => {
    const start = getStart(s);
    return start && new Date(start) > new Date() && new Date(start).toDateString() !== todayKey;
  });

  // Group everything chronologically by day for the list view below.
  const grouped = sorted.reduce((acc, session) => {
    const label = formatDayLabel(getStart(session));
    if (!acc[label]) acc[label] = [];
    acc[label].push(session);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-green-900 to-teal-900 p-6 text-white shadow-lg">
        <div className="relative z-10">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-green-100 hover:text-white"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Back to overview
            </button>
          )}

          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
            <CalendarDaysIcon className="h-3.5 w-3.5 text-green-300" />
            My Schedule
          </span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Your teaching schedule</h2>
          <p className="mt-1 max-w-xl text-sm text-green-100">
            Assigned lecture slots and classrooms, grouped by day.
          </p>
        </div>
      </div>

      {loading && <LoadingSpinner message="Loading your schedule..." />}
      {error && <Alert type="error" message={error} />}

      {!loading && !error && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Classes Today" value={todaysSessions.length} color="green" icon={CalendarDaysIcon} />
            <StatCard label="Upcoming Classes" value={upcomingSessions.length} color="emerald" icon={ClockIcon} />
            <StatCard label="Total Assigned" value={sessions.length} color="gray" icon={AcademicCapIcon} />
          </div>

          {/* Schedule list, grouped by day */}
          <div className="space-y-6">
            {Object.keys(grouped).length === 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                No sessions are assigned to you yet.
              </div>
            )}

            {Object.entries(grouped).map(([day, daySessions]) => (
              <div key={day}>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">{day}</h3>

                <div className="space-y-3">
                  {daySessions.map((session, index) => (
                    <div
                      key={session.id ?? `${day}-${index}`}
                      className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-700 to-emerald-900 text-white">
                          <ClockIcon className="h-5 w-5" />
                        </div>

                        <div>
                          <p className="text-sm font-bold text-gray-900">{getSubject(session)}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <ClockIcon className="h-3.5 w-3.5" />
                              {formatTime(getStart(session))}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPinIcon className="h-3.5 w-3.5" />
                              {getRoom(session)}
                            </span>
                            {getSection(session) && <span>Section {getSection(session)}</span>}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          STATUS_STYLES[session.status] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {session.status || "UNKNOWN"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default MySchedule;