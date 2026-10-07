import { useState, useEffect } from "react";
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
  { id: 7, name: "Sunday" },
];

const formatTime = (time) => {
  if (!time) return "--";
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
};

export function StudentTimetableView({ token }) {
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

  if (loading) {
    return <LoadingSpinner message="Loading your weekly schedule..." />;
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  if (timetable.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-xs">
        <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-base font-semibold text-gray-900">
          No scheduled classes
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Your timetable has no active class slots scheduled for this academic term.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {WEEK_DAYS.map((day) => {
        const classes = timetable.filter(
          (item) => Number(item.day_of_week) === day.id
        );

        if (classes.length === 0) return null;

        return (
          <section key={day.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900">{day.name}</h3>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                {classes.length} {classes.length === 1 ? "class" : "classes"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {classes.map((item) => (
                <article
                  key={item.slot_id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="rounded-md bg-green-50 px-2.5 py-1 font-mono text-xs font-bold text-green-800">
                        {item.subject_code}
                      </span>
                      <h4 className="mt-2 text-base font-bold text-gray-900">
                        {item.subject_name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 rounded-lg bg-green-800 px-3 py-1.5 text-xs font-semibold text-white shadow-xs shrink-0">
                      <ClockIcon className="h-3.5 w-3.5" />
                      <span>
                        {formatTime(item.start_time)} – {formatTime(item.end_time)}
                      </span>
                    </div>
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
          </section>
        );
      })}
    </div>
  );
}

export default StudentTimetableView;
