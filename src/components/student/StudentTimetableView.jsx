import { useState, useEffect, useMemo } from "react";
import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  SparklesIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/solid";
import { fetchStudentTimetable } from "../../api/student";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";

const WEEKDAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

function normalizeDayOfWeek(value) {
  if (value == null) return null;

  if (typeof value === "number") {
    const byJsIndex = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    return byJsIndex[value] || null;
  }

  return String(value).trim().toUpperCase();
}

function dayLabel(dayKey) {
  if (!dayKey) return "Unknown";
  return dayKey.charAt(0) + dayKey.slice(1).toLowerCase();
}

function formatTimeRange(startTime, endTime) {
  const fmt = (t) => {
    if (!t) return "";
    const [h, m] = String(t).split(":");
    const date = new Date();
    date.setHours(Number(h), Number(m), 0, 0);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  return `${fmt(startTime)} - ${fmt(endTime)}`;
}

function getSlotState(startTime, endTime, now) {
  if (!startTime || !endTime) return "upcoming";

  const toMinutes = (t) => {
    const [h, m] = String(t).split(":").map(Number);
    return h * 60 + m;
  };

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  if (nowMinutes >= start && nowMinutes < end) return "ongoing";
  if (nowMinutes >= end) return "completed";
  return "upcoming";
}

const SECTION_GAP = "space-y-4";

export function StudentTimetableView({ token }) {
  const [activeTab, setActiveTab] = useState("today");
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  const now = new Date();
  const todayKey = WEEKDAY_ORDER[(now.getDay() + 6) % 7];
  const [selectedDay, setSelectedDay] = useState(todayKey);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    async function loadTimetable() {
      try {
        setLoading(true);
        setError("");

        const res = await fetchStudentTimetable(token, controller.signal);

        if (res?.success) {
          setSlots(Array.isArray(res.data) ? res.data : []);
        } else {
          throw new Error(res?.message || "Failed to load timetable");
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load your timetable.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadTimetable();
    return () => controller.abort();
  }, [token]);

  const byDay = useMemo(() => {
    const grouped = {};

    for (const slot of slots) {
      const key = normalizeDayOfWeek(slot.day_of_week);
      if (!key) continue;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(slot);
    }

    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
    }

    return grouped;
  }, [slots]);

  const daysWithClasses = WEEKDAY_ORDER.filter((day) => byDay[day]?.length);
  const todaySchedule = byDay[todayKey] || [];
  const ongoingSlot = todaySchedule.find(
    (slot) => getSlotState(slot.start_time, slot.end_time, now) === "ongoing"
  );

  return (
    <div className={SECTION_GAP}>
      {/* Header section combining the Title/Subtitle and View Switcher Tabs on the right */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-green-950">
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500 font-medium">
            
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="inline-flex self-start sm:self-auto rounded-xl bg-green-200/60 p-1 ring-1 ring-green-300">
          <button
            type="button"
            onClick={() => setActiveTab("today")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "today"
                ? "bg-green-800 text-white shadow-sm"
                : "text-green-900 hover:bg-green-200/80"
            }`}
          >
            <ClockIcon className="h-4 w-4" />
            Today's Schedule
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("overall")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "overall"
                ? "bg-green-800 text-white shadow-sm"
                : "text-green-900 hover:bg-green-200/80"
            }`}
          >
            <CalendarDaysIcon className="h-4 w-4" />
            Overall Timetable
          </button>
        </div>
      </div>

      {loading && <LoadingSpinner message="Loading your timetable..." />}
      {error && <Alert type="error" message={error} />}

      {!loading && !error && (
        <>
          {/* TODAY'S VIEW */}
          {activeTab === "today" && (
            <div className={SECTION_GAP}>
              {/* Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-900 via-green-800 to-green-950 p-6 text-white shadow-xl ring-1 ring-green-700/50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-green-300">
                      <SparklesIcon className="h-4 w-4 text-green-400" />
                      Today
                    </div>
                    <h2 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                      {dayLabel(todayKey)}
                    </h2>
                    <p className="mt-0.5 text-sm text-green-200">
                      {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-md ring-1 ring-white/20 sm:text-right">
                    <span className="text-xs uppercase tracking-wider text-green-200">Current Status</span>
                    <p className="text-base font-bold text-white">
                      {ongoingSlot ? ongoingSlot.subject_name : "No class right now"}
                    </p>
                    {ongoingSlot && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-300">
                        <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                        In Progress ({formatTimeRange(ongoingSlot.start_time, ongoingSlot.end_time)})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Periods list */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-green-950">Periods Overview</h3>

                <div className="grid gap-3">
                  {todaySchedule.length === 0 && (
                    <div className="rounded-xl bg-white p-6 text-center text-sm text-gray-500 ring-1 ring-green-200">
                      No classes scheduled for today.
                    </div>
                  )}

                  {todaySchedule.map((slot, idx) => {
                    const state = getSlotState(slot.start_time, slot.end_time, now);
                    const isOngoing = state === "ongoing";
                    const isCompleted = state === "completed";

                    return (
                      <div
                        key={slot.slot_id ?? idx}
                        className={`relative flex flex-col sm:flex-row sm:items-center justify-between rounded-xl p-4 transition-all ${
                          isOngoing
                            ? "bg-white ring-2 ring-green-600 shadow-md translate-x-1"
                            : isCompleted
                            ? "bg-white/60 ring-1 ring-green-200 opacity-80"
                            : "bg-white ring-1 ring-green-200/80 shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                              isOngoing
                                ? "bg-green-800 text-white ring-2 ring-green-300 shadow-md"
                                : isCompleted
                                ? "bg-green-200 text-green-900"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            P{idx + 1}
                          </div>

                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-green-800">
                              {slot.subject_code}
                            </span>
                            <h4 className="text-base font-bold text-green-950">{slot.subject_name}</h4>
                          </div>
                        </div>

                        <div className="mt-3 sm:mt-0 flex flex-wrap items-center gap-4 text-xs font-medium text-gray-600 border-t sm:border-t-0 border-green-100 pt-2 sm:pt-0">
                          <div className="flex items-center gap-1 text-green-900">
                            <ClockIcon className="h-4 w-4 text-green-700" />
                            {formatTimeRange(slot.start_time, slot.end_time)}
                          </div>

                          <div className="flex items-center gap-1 text-green-900">
                            <BuildingOfficeIcon className="h-4 w-4 text-green-700" />
                            {slot.classroom || "—"}
                          </div>

                          <div className="flex items-center gap-1 text-gray-700">
                            <UserIcon className="h-4 w-4 text-gray-500" />
                            {slot.faculty_name || "—"}
                          </div>

                          {isOngoing && (
                            <span className="rounded-full bg-green-800 px-3 py-1 text-xs font-bold text-white shadow-sm">
                              Ongoing
                            </span>
                          )}
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                              <CheckCircleIcon className="h-4 w-4" />
                              Done
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* OVERALL TIMETABLE VIEW */}
          {activeTab === "overall" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-green-200">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                  {(daysWithClasses.length ? daysWithClasses : WEEKDAY_ORDER.slice(0, 6)).map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        selectedDay === day
                          ? "bg-green-800 text-white shadow"
                          : "bg-green-50 text-green-900 hover:bg-green-100"
                      }`}
                    >
                      {dayLabel(day)} {day === todayKey && "(Today)"}
                    </button>
                  ))}
                </div>

                <span className="text-xs font-semibold text-green-800 px-2">
                  Viewing: <span className="font-bold">{dayLabel(selectedDay)}</span>
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-green-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-green-950">
                    <thead className="bg-green-900 text-xs uppercase text-green-100">
                      <tr>
                        <th scope="col" className="px-5 py-3.5 font-bold">Period &amp; Time</th>
                        <th scope="col" className="px-5 py-3.5 font-bold">Course Code &amp; Subject</th>
                        <th scope="col" className="px-5 py-3.5 font-bold">Room / Location</th>
                        <th scope="col" className="px-5 py-3.5 font-bold">Faculty In-Charge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-green-100 bg-white">
                      {(byDay[selectedDay] || []).map((slot, idx) => (
                        <tr key={slot.slot_id ?? idx} className="hover:bg-green-50/60 transition">
                          <td className="whitespace-nowrap px-5 py-4 font-semibold text-green-900">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-100 text-xs font-bold text-green-800">
                                P{idx + 1}
                              </span>
                              <span className="text-xs text-gray-600">
                                {formatTimeRange(slot.start_time, slot.end_time)}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 font-medium">
                            <div className="font-bold text-green-950">{slot.subject_name}</div>
                            <div className="text-xs text-green-700">{slot.subject_code}</div>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-700">
                            {slot.classroom || "—"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                            {slot.faculty_name || "—"}
                          </td>
                        </tr>
                      ))}

                      {(!byDay[selectedDay] || byDay[selectedDay].length === 0) && (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-center text-gray-500">
                            No classes scheduled for {dayLabel(selectedDay)}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default StudentTimetableView;