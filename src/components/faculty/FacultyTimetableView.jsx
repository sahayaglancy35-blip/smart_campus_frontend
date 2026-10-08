import { useState, useEffect } from "react";
import { fetchFacultyTimetable } from "../../api/faculty";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  AcademicCapIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

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

export function FacultyTimetableView({ token }) {
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().getDay(); // 0 is Sunday, 1 is Monday...
    return today >= 1 && today <= 6 ? today : 1;
  });
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadSchedule() {
      try {
        setLoading(true);
        setError("");
        const res = await fetchFacultyTimetable(
          token,
          { day_of_week: selectedDay },
          controller.signal,
        );
        setSlots(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load teaching schedule.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadSchedule();
    return () => controller.abort();
  }, [token, selectedDay]);

  const currentDayName =
    WEEK_DAYS.find((d) => d.id === selectedDay)?.name || "Monday";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
            My Teaching Schedule
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            View assigned lectures, tutorial slots, and designated classroom facilities.
          </p>
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
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-white text-green-800 shadow-xs ring-1 ring-black/5"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                }`}
              >
                {day.name.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Schedule Content */}
      {loading ? (
        <LoadingSpinner message={`Loading ${currentDayName} schedule...`} />
      ) : slots.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-xs">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-base font-bold text-gray-900">
            No Classes Scheduled for {currentDayName}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            You do not have any timetable slots assigned for this day.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot) => (
            <div
              key={slot.slot_id}
              className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition hover:border-green-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-bold text-green-800 ring-1 ring-green-600/20">
                    <AcademicCapIcon className="h-3.5 w-3.5" />
                    {slot.subject_code}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500">
                    <ClockIcon className="h-3.5 w-3.5 text-gray-400" />
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                  </span>
                </div>

                <h3 className="mt-3 text-base font-bold text-gray-900">
                  {slot.subject_name}
                </h3>

                <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <UserGroupIcon className="h-4 w-4 text-gray-400" />
                    <span>
                      Section:{" "}
                      <strong className="text-gray-900">{slot.section_code}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <MapPinIcon className="h-4 w-4 text-gray-400" />
                    <span>
                      Room:{" "}
                      <strong className="text-gray-900">
                        {slot.room_no} {slot.block_name ? `(${slot.block_name})` : ""}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {slot.credits !== undefined && (
                <div className="mt-4 border-t border-gray-100 pt-3 text-right text-xs font-semibold text-gray-400">
                  {slot.credits} Credits
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FacultyTimetableView;
