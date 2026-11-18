import { useState, useEffect } from "react";
import { fetchStudentAttendanceSummary } from "../../api/student";
import Alert from "../common/Alert";
import { deliveryStyleOf } from "../common/deliveryStyle";
import { DeliveryLegend } from "../common/DeliveryLegend";
import {
  ChartPieIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

/* ----------------------------------------------------------------
   Status helpers — one place that decides color/label/icon from a
   percentage, so the rest of the component just reads the result.
   Four tiers instead of three: a distinct "Excellent" tier gives
   strong performers something to notice, not just "pass/fail".
---------------------------------------------------------------- */
function getStatus(pct) {
  if (pct === null) return { tone: "gray", label: "No data" };
  if (pct >= 90) return { tone: "emerald", label: "Excellent" };
  if (pct >= 75) return { tone: "green", label: "On track" };
  if (pct >= 65) return { tone: "amber", label: "Borderline" };
  return { tone: "red", label: "Below requirement" };
}

const TONE = {
  emerald: {
    text: "text-emerald-600",
    bar: "bg-gradient-to-r from-emerald-400 to-teal-300",
    chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    border: "border-l-emerald-400",
    avatar: "bg-gradient-to-br from-emerald-500 to-teal-400",
  },
  green: {
    text: "text-green-700",
    bar: "bg-gradient-to-r from-green-500 to-emerald-400",
    chip: "bg-green-50 text-green-700 ring-1 ring-green-200",
    border: "border-l-green-500",
    avatar: "bg-gradient-to-br from-green-600 to-emerald-500",
  },
  amber: {
    text: "text-amber-600",
    bar: "bg-gradient-to-r from-amber-500 to-yellow-400",
    chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    border: "border-l-amber-500",
    avatar: "bg-gradient-to-br from-amber-500 to-yellow-400",
  },
  red: {
    text: "text-red-600",
    bar: "bg-gradient-to-r from-red-500 to-rose-400",
    chip: "bg-red-50 text-red-700 ring-1 ring-red-200",
    border: "border-l-red-500",
    avatar: "bg-gradient-to-br from-red-500 to-rose-400",
  },
  gray: {
    text: "text-gray-400",
    bar: "bg-gray-300",
    chip: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
    border: "border-l-gray-300",
    avatar: "bg-gradient-to-br from-gray-400 to-gray-300",
  },
};

/* ----------------------------------------------------------------
   Loader colors — only two schemes:
   - ok  (75% and above): dark green fill on a light green base
   - low (below 75%):     dark red fill on a red base
---------------------------------------------------------------- */
const LOADER = {
  ok: {
    bg: "bg-green-900",
    base: "bg-gradient-to-r from-green-400/35 to-green-300/50",
    fill: "bg-gradient-to-br from-green-950 via-green-900 to-green-800",
  },
  low: {
    bg: "bg-red-950",
    base: "bg-gradient-to-r from-red-500/35 to-rose-400/55",
    fill: "bg-gradient-to-br from-red-950 via-red-900 to-red-800",
  },
};

/* Initials for the subject avatar, e.g. "Data Structures" -> "DS" */
function initialsOf(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function AttendanceSummaryView({ token }) {
  // null = data hasn't arrived yet (no separate loading flag needed)
  const [subjects, setSubjects] = useState(null);
  const [error, setError] = useState(token ? "" : "Please log in to view attendance.");

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    async function loadAttendance() {
      try {
        setError("");
        const result = await fetchStudentAttendanceSummary(token, controller.signal);
        setSubjects(Array.isArray(result?.data) ? result.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to load attendance summary.");
        }
      }
    }

    loadAttendance();
    return () => controller.abort();
  }, [token]);

  const list = subjects ?? [];
  const total = list.reduce((sum, s) => sum + Number(s.total_classes || 0), 0);
  const attended = list.reduce((sum, s) => sum + Number(s.attended_classes || 0), 0);
  const absent = list.reduce((sum, s) => sum + Number(s.absent_classes || 0), 0);
  const overall = total ? (attended / total) * 100 : 0;

  if (error) {
    return <Alert type="error" message={error} />;
  }

  // Nothing to show until the data arrives
  if (subjects === null) {
    return null;
  }

  if (subjects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-green-200 bg-gradient-to-br from-green-50 to-white p-12 text-center">
        <ChartPieIcon className="mx-auto h-10 w-10 text-green-700/60" />
        <h3 className="mt-4 text-base font-semibold text-gray-900">
          No attendance records yet
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Your attendance will show up here once classes are logged.
        </p>
      </div>
    );
  }

  const overallStatus = getStatus(overall);
  const loader = overall >= 75 ? LOADER.ok : LOADER.low; // below 75% -> red
  const clampedOverall = Math.min(100, Math.max(0, overall));

  return (
    <div className="space-y-7">
      {/* ---------- Hero: card that fills with dark green (red below 75%) up to the overall %, inline stat pills ---------- */}
      <section className={`relative overflow-hidden rounded-3xl ${loader.bg} p-6 text-white shadow-xl shadow-green-900/20 sm:p-8`}>
        {/* Card base: light green (or red below 75%) */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${loader.base}`}
        />
        {/* Progress fill: dark green (or dark red below 75%), covers the card from the left up to the overall % */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 ${loader.fill} ${
            clampedOverall > 0 ? "border-r border-white/25" : ""
          }`}
          style={{ width: `${clampedOverall}%` }}
        />
        {/* decorative background blobs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-green-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative flex flex-col items-center gap-7 [text-shadow:0_1px_2px_rgba(0,0,0,0.35)] sm:flex-row sm:items-center">
          {/* Overall percentage */}
          <div className="flex shrink-0 flex-col items-center justify-center sm:px-2">
            <span className="whitespace-nowrap text-[52px] font-extrabold leading-none tracking-tight text-white tabular-nums">
              {overall.toFixed(1)}
              <span className="ml-1 text-2xl font-bold text-white">%</span>
            </span>
            <span className="mt-2 text-sm font-medium text-green-100">overall</span>
          </div>

          {/* Summary + inline pills */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              {overallStatus.tone === "red" || overallStatus.tone === "amber" ? (
                <ExclamationTriangleIcon className="h-6 w-6 text-amber-300" />
              ) : (
                <CheckCircleIcon className="h-6 w-6 text-emerald-300" />
              )}
              <h2 className="text-xl font-bold">{overallStatus.label}</h2>
            </div>
            <p className="mt-1.5 text-sm text-green-50">
              You've attended <span className="font-semibold text-white">{attended}</span> of{" "}
              <span className="font-semibold text-white">{total}</span> classes this semester.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2.5 sm:justify-start">
              <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/15">
                {total} conducted
              </span>
              <span className="rounded-full bg-emerald-400/15 px-4 py-1.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/20 backdrop-blur-sm transition hover:bg-emerald-400/25">
                {attended} present
              </span>
              <span className="rounded-full bg-rose-400/15 px-4 py-1.5 text-xs font-semibold text-rose-200 ring-1 ring-rose-400/20 backdrop-blur-sm transition hover:bg-rose-400/25">
                {absent} absent
              </span>
              <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-green-100/80 ring-1 ring-white/15 backdrop-blur-sm">
                75% required
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Subject list: elevated cards with initials avatar + accent ---------- */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-gray-900">By subject</h3>
          <DeliveryLegend />
        </div>
        <div className="space-y-3">
          {subjects.map((subject) => {
            const pct =
              subject.attendance_percentage == null
                ? null
                : Number(subject.attendance_percentage);
            const status = getStatus(pct);
            const tone = TONE[status.tone];
            const delivery = deliveryStyleOf(subject);
            const clampedPct = pct !== null ? Math.min(100, Math.max(0, pct)) : 0;

            return (
              <article
                key={subject.subject_id}
                className={`group flex flex-col gap-4 rounded-2xl border border-gray-200 border-l-4 ${tone.border} bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:flex-row sm:items-center sm:gap-5`}
              >
                {/* Initials avatar instead of a generic icon */}
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm ${delivery.avatar}`}
                >
                  {initialsOf(subject.subject_name)}
                </span>

                {/* Name + code + raw counts */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {subject.subject_name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    <span
                      className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${delivery.chip}`}
                    >
                      {delivery.label}
                    </span>
                    {subject.subject_code} &middot; {subject.attended_classes}/{subject.total_classes} classes
                    {Number(subject.absent_classes) > 0 && (
                      <> &middot; {subject.absent_classes} absent</>
                    )}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 sm:w-36">
                  <div
                    className={`h-full rounded-full ${tone.bar} transition-all duration-700 ease-out`}
                    style={{ width: `${clampedPct}%` }}
                  />
                </div>

                {/* Percentage + status chip */}
                <div className="flex items-center justify-between gap-3 sm:w-44 sm:justify-end">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone.chip}`}>
                    {status.label}
                  </span>
                  <span className={`w-14 text-right text-lg font-extrabold tabular-nums ${tone.text}`}>
                    {pct !== null ? `${pct.toFixed(1)}%` : "N/A"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default AttendanceSummaryView;