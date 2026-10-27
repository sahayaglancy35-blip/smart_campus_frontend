import { useState, useEffect, useMemo } from "react";
import { fetchStudentTimetable } from "../../api/student";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import { CalendarDaysIcon, ClockIcon, MapPinIcon, UserIcon } from "@heroicons/react/24/outline";

const WEEK_DAYS = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
];

const formatTime = (time) => {
  if (!time) return "--";
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
};

/* Today's id (1 = Monday ... 6 = Saturday); null on Sunday */
const getTodayId = () => {
  const day = new Date().getDay(); // 0 is Sunday
  return day >= 1 && day <= 6 ? day : null;
};

export function StudentTimetableView({ token }) {
  const todayId = getTodayId();

  const [selectedDay, setSelectedDay] = useState(todayId ?? 1);
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState(token ? "" : "Please log in to view timetable.");

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    async function loadTimetable() {
      try {
        setLoading(true);
        setError("");
        const result = await fetchStudentTimetable(token, controller.signal);
        setTimetable(Array.isArray(result?.data) ? result.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to load timetable schedule.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadTimetable();
    return () => controller.abort();
  }, [token]);

  // Classes for the selected day, in time order
  const daySlots = useMemo(
    () =>
      timetable
        .filter((item) => Number(item.day_of_week) === selectedDay)
        .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))),
    [timetable, selectedDay]
  );

  const currentDayName =
    WEEK_DAYS.find((d) => d.id === selectedDay)?.name || "Monday";

  return (
    <div className="space-y-6">
      {/* Day Selector Toolbar */}
      <div className="flex flex-col gap-3 border-b border-gray-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Showing Schedule for:{" "}
          <strong className="text-sm font-bold normal-case text-green-800">
            {currentDayName}
            {selectedDay === todayId && " (Today)"}
          </strong>
        </div>

        {/* Day Selector */}
        <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
          {WEEK_DAYS.map((day) => {
            const isSelected = selectedDay === day.id;
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => setSelectedDay(day.id)}
                aria-pressed={isSelected}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-white text-green-800 shadow-xs ring-1 ring-black/5"
                    : "text-gray-600 hover:bg-white/50 hover:text-gray-900"
                }`}
              >
                {day.name.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedule Content */}
      {loading ? (
        <LoadingSpinner message="Loading your weekly schedule..." />
      ) : error ? (
        <Alert type="error" message={error} />
      ) : timetable.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-xs">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-base font-semibold text-gray-900">
            No scheduled classes
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Your timetable has no active class slots scheduled for this academic term.
          </p>
        </div>
      ) : daySlots.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-xs">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-base font-bold text-gray-900">
            No Classes Scheduled for {currentDayName}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            You have no timetable slots on this day. Pick another day above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {daySlots.map((item) => (
            <article
              key={item.slot_id}
              className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition hover:border-green-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-md bg-green-50 px-2.5 py-1 font-mono text-xs font-bold text-green-800">
                    {item.subject_code}
                  </span>

                  <div className="flex shrink-0 items-center gap-1 rounded-lg bg-green-800 px-3 py-1.5 text-xs font-semibold text-white shadow-xs">
                    <ClockIcon className="h-3.5 w-3.5" />
                    <span>
                      {formatTime(item.start_time)} – {formatTime(item.end_time)}
                    </span>
                  </div>
                </div>

                <h4 className="mt-3 text-base font-bold text-gray-900">
                  {item.subject_name}
                </h4>
              </div>

              <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Faculty:</span>
                  <span className="font-semibold text-gray-800">
                    {item.faculty_name || "Unassigned"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPinIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Room / Hall:</span>
                  <span className="font-semibold text-gray-800">
                    {item.classroom || "Unassigned"}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentTimetableView;