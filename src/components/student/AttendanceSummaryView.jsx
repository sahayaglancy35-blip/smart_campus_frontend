import { useState, useEffect, useRef } from "react";
import { fetchStudentAttendanceSummary } from "../../api/student";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import { deliveryStyleOf } from "../common/deliveryStyle";
import { DeliveryLegend } from "../common/DeliveryLegend";
import {
  ChartPieIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
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
    ring: "#2DD4BF",
    chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    border: "border-l-emerald-400",
    avatar: "bg-gradient-to-br from-emerald-500 to-teal-400",
  },
  green: {
    text: "text-green-700",
    bar: "bg-gradient-to-r from-green-500 to-emerald-400",
    ring: "#34D399",
    chip: "bg-green-50 text-green-700 ring-1 ring-green-200",
    border: "border-l-green-500",
    avatar: "bg-gradient-to-br from-green-600 to-emerald-500",
  },
  amber: {
    text: "text-amber-600",
    bar: "bg-gradient-to-r from-amber-500 to-yellow-400",
    ring: "#FBBF24",
    chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    border: "border-l-amber-500",
    avatar: "bg-gradient-to-br from-amber-500 to-yellow-400",
  },
  red: {
    text: "text-red-600",
    bar: "bg-gradient-to-r from-red-500 to-rose-400",
    ring: "#F87171",
    chip: "bg-red-50 text-red-700 ring-1 ring-red-200",
    border: "border-l-red-500",
    avatar: "bg-gradient-to-br from-red-500 to-rose-400",
  },
  gray: {
    text: "text-gray-400",
    bar: "bg-gray-300",
    ring: "#D1D5DB",
    chip: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
    border: "border-l-gray-300",
    avatar: "bg-gradient-to-br from-gray-400 to-gray-300",
  },
};

/* ----------------------------------------------------------------
   useCountUp — animates a number from 0 to `target` once, on mount
   or whenever target changes. Pure visual polish, no logic change.
---------------------------------------------------------------- */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const frame = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      }
    }

    frame.current = requestAnimationFrame(tick);
    return () => frame.current && cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

/* Initials for the subject avatar, e.g. "Data Structures" -> "DS" */
function initialsOf(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function AttendanceSummaryView({ token }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState(token ? "" : "Please log in to view attendance.");

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    async function loadAttendance() {
      try {
        setLoading(true);
        setError("");
        const result = await fetchStudentAttendanceSummary(token, controller.signal);
        setSubjects(Array.isArray(result?.data) ? result.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to load attendance summary.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadAttendance();
    return () => controller.abort();
  }, [token]);

  const total = subjects.reduce((sum, s) => sum + Number(s.total_classes || 0), 0);
  const attended = subjects.reduce((sum, s) => sum + Number(s.attended_classes || 0), 0);
  const absent = subjects.reduce((sum, s) => sum + Number(s.absent_classes || 0), 0);
  const overall = total ? (attended / total) * 100 : 0;
  const animatedOverall = useCountUp(overall);

  if (loading) {
    return <LoadingSpinner message="Calculating attendance metrics..." />;
  }

  if (error) {
    return <Alert type="error" message={error} />;
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
  const overallTone = TONE[overallStatus.tone];
  const clampedOverall = Math.min(100, Math.max(0, animatedOverall));

  return (
    <div className="space-y-7">
      {/* ---------- Hero: dark gradient panel, glowing animated ring, inline stat pills ---------- */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-950 via-green-900 to-green-800 p-6 text-white shadow-xl shadow-green-900/20 sm:p-8">
        {/* decorative glow blobs + faint concentric rings */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-green-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute right-6 top-6 h-28 w-28 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute right-10 top-10 h-20 w-20 rounded-full border border-white/10" />

        <div className="relative flex flex-col items-center gap-7 sm:flex-row sm:items-center">
          {/* Donut ring with glow, animated fill + count-up number */}
          <div
            className="relative flex h-[148px] w-[148px] shrink-0 items-center justify-center rounded-full transition-[background] duration-300"
            style={{
              background: `conic-gradient(${overallTone.ring} ${clampedOverall * 3.6}deg, rgba(255,255,255,0.12) 0deg)`,
              boxShadow: `0 0 22px ${overallTone.ring}99, 0 0 48px ${overallTone.ring}55`,
            }}
          >
            <div className="flex h-[112px] w-[112px] flex-col items-center justify-center pt-3 rounded-full bg-green-950 ring-1 ring-white/10 shadow-[inset_0_0_18px_rgba(0,0,0,0.5)]">
              <span
                className={`whitespace-nowrap font-extrabold leading-none tracking-tight text-white tabular-nums ${
                  overall.toFixed(1).length >= 5 ? "text-[30px]" : "text-[36px]"
                }`}
              >
                {animatedOverall.toFixed(1)}
                <span className="ml-0.5 text-lg font-bold text-green-200/80">%</span>
              </span>
              <span className="mt-1 text-[11px] text-green-200/70">overall</span>
            </div>
            {overallStatus.tone === "emerald" && (
              <SparklesIcon className="absolute -right-1 -top-1 h-7 w-7 text-emerald-300 drop-shadow" />
            )}
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
            <p className="mt-1.5 text-sm text-green-100/80">
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