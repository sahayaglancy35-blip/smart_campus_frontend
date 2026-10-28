import { useState, useEffect, useMemo } from "react";
import { fetchFacultyTimetable } from "../../api/faculty";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import { deliveryStyleOf } from "../common/deliveryStyle";
import { DeliveryLegend } from "../common/DeliveryLegend";
import {
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  TableCellsIcon,
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

/* Today's id (1 = Monday ... 6 = Saturday); null on Sunday */
const getTodayId = () => {
  const day = new Date().getDay(); // 0 is Sunday
  return day >= 1 && day <= 6 ? day : null;
};

/* ----------------------------------------------------------------
   Full-week grid: one row per time slot, one column per day
---------------------------------------------------------------- */
function WeeklyTimetable({ slots, todayId }) {
  // Distinct time ranges, earliest first
  const rows = useMemo(() => {
    const map = new Map();
    slots.forEach((slot) => {
      const key = `${slot.start_time}|${slot.end_time}`;
      if (!map.has(key)) {
        map.set(key, { key, start: slot.start_time, end: slot.end_time });
      }
    });
    return [...map.values()].sort((a, b) =>
      String(a.start).localeCompare(String(b.start))
    );
  }, [slots]);

  // Classes grouped by "day|start|end"
  const cells = useMemo(() => {
    const grouped = {};
    slots.forEach((slot) => {
      const key = `${slot.day_of_week}|${slot.start_time}|${slot.end_time}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(slot);
    });
    return grouped;
  }, [slots]);

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-xs">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="w-32 bg-green-900 px-3 py-3 text-left text-xs font-semibold text-green-100"
            >
              Time
            </th>
            {WEEK_DAYS.map((day) => {
              const isToday = day.id === todayId;
              return (
                <th
                  key={day.id}
                  scope="col"
                  className={`border-l border-green-800 px-3 py-3 text-left text-xs font-semibold text-white ${
                    isToday ? "bg-green-700" : "bg-green-900"
                  }`}
                >
                  {day.name}
                  {isToday && (
                    <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                      Today
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={row.key}>
              <th
                scope="row"
                className="whitespace-nowrap border-t border-gray-200 bg-gray-50 px-3 py-3 text-left align-top"
              >
                <span className="block text-[11px] font-medium text-gray-400">
                  Period {index + 1}
                </span>
                <span className="text-xs font-semibold text-gray-800">
                  {formatTime(row.start)} – {formatTime(row.end)}
                </span>
              </th>

              {WEEK_DAYS.map((day) => {
                const items = cells[`${day.id}|${row.start}|${row.end}`] || [];
                return (
                  <td
                    key={day.id}
                    className="min-w-[150px] border-l border-t border-gray-200 p-1.5 align-top"
                  >
                    {items.length === 0 ? (
                      <span className="block py-3 text-center text-gray-300">—</span>
                    ) : (
                      <div className="space-y-1.5">
                        {items.map((slot) => {
                          const style = deliveryStyleOf(slot);
                          return (
                            <div
                              key={`${slot.day_of_week}-${slot.slot_id}`}
                              className={`rounded-lg border ${style.card} p-2`}
                            >
                              <span
                                className={`inline-block rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${style.code}`}
                              >
                                {slot.subject_code}
                              </span>
                              <p className="mt-1 text-xs font-semibold leading-snug text-gray-900">
                                {slot.subject_name}
                              </p>
                              <p className="mt-0.5 text-[11px] text-gray-500">
                                Sec {slot.section_code || "—"} •{" "}
                                {slot.room_no || "—"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FacultyTimetableView({ token }) {
  const todayId = getTodayId();

  const [view, setView] = useState("day"); // "day" | "week"
  const [selectedDay, setSelectedDay] = useState(todayId ?? 1);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  // Load the whole week once (one request per day, in parallel), so
  // switching days or opening the full-week grid needs no extra requests.
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadWeek() {
      try {
        setLoading(true);
        setError("");

        const results = await Promise.all(
          WEEK_DAYS.map((day) =>
            fetchFacultyTimetable(
              token,
              { day_of_week: day.id },
              controller.signal,
            ),
          ),
        );

        // Tag every slot with the day it was requested for
        const merged = results.flatMap((res, index) =>
          (Array.isArray(res?.data) ? res.data : []).map((slot) => ({
            ...slot,
            day_of_week: WEEK_DAYS[index].id,
          })),
        );
        setSlots(merged);
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

    loadWeek();
    return () => controller.abort();
  }, [token]);

  const currentDayName =
    WEEK_DAYS.find((d) => d.id === selectedDay)?.name || "Monday";

  // Classes for the selected day, in time order
  const daySlots = useMemo(
    () =>
      slots
        .filter((slot) => slot.day_of_week === selectedDay)
        .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))),
    [slots, selectedDay]
  );

  const viewButtonClass = (active) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
      active
        ? "bg-green-800 text-white shadow-xs"
        : "text-gray-600 hover:bg-white/60 hover:text-gray-900"
    }`;

  return (
    <div className="space-y-6">
      {/* Toolbar: view switch + (day picker | legend) */}
      <div className="flex flex-col gap-3 border-b border-gray-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        {/* View switch */}
        <div className="inline-flex self-start rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setView("day")}
            aria-pressed={view === "day"}
            className={viewButtonClass(view === "day")}
          >
            <CalendarDaysIcon className="h-4 w-4" />
            By Day
          </button>
          <button
            type="button"
            onClick={() => setView("week")}
            aria-pressed={view === "week"}
            className={viewButtonClass(view === "week")}
          >
            <TableCellsIcon className="h-4 w-4" />
            Full Week
          </button>
        </div>

        {view === "day" ? (
          /* Day Selector */
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
        ) : (
          <DeliveryLegend />
        )}
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Content */}
      {loading ? (
        <LoadingSpinner message="Loading your teaching schedule..." />
      ) : slots.length === 0 && !error ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-xs">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-base font-bold text-gray-900">
            No Classes Scheduled
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            You do not have any timetable slots assigned yet.
          </p>
        </div>
      ) : view === "week" ? (
        <WeeklyTimetable slots={slots} todayId={todayId} />
      ) : daySlots.length === 0 ? (
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
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Showing Schedule for:{" "}
              <strong className="text-sm font-bold normal-case text-green-800">
                {currentDayName}
                {selectedDay === todayId && " (Today)"}
              </strong>
            </div>
            <DeliveryLegend />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {daySlots.map((slot) => {
              const style = deliveryStyleOf(slot);

              return (
                <div
                  key={`${slot.day_of_week}-${slot.slot_id}`}
                  className={`flex flex-col justify-between rounded-2xl border ${style.card} p-5 shadow-xs transition hover:shadow-md`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-black/5 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md px-2.5 py-1 font-mono text-xs font-bold ${style.code}`}
                        >
                          {slot.subject_code}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${style.chip}`}
                        >
                          {style.label}
                        </span>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-gray-500">
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
                          {slot.batch_label && (
                            <span className="ml-1 text-gray-500">
                              (
                              {slot.programme_code || slot.programme_name
                                ? `${slot.programme_code || slot.programme_name} • `
                                : ""}
                              Batch {slot.batch_label})
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <MapPinIcon className="h-4 w-4 text-gray-400" />
                        <span>
                          Room:{" "}
                          <strong className="text-gray-900">
                            {slot.room_no}{" "}
                            {slot.block_name ? `(${slot.block_name})` : ""}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {slot.credits !== undefined && (
                    <div className="mt-4 border-t border-black/5 pt-3 text-right text-xs font-semibold text-gray-400">
                      {slot.credits} Credits
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default FacultyTimetableView;