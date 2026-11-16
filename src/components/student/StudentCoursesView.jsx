import { useState, useEffect, useMemo, useRef } from "react";
import { fetchStudentCourses } from "../../api/student";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import Badge from "../common/Badge";
import { deliveryStyleOf, getDeliveryType } from "../common/deliveryStyle";
import { DeliveryLegend } from "../common/DeliveryLegend";
import {
  BookOpenIcon,
  AcademicCapIcon,
  Squares2X2Icon,
  BeakerIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

/* Animates a number from 0 to `target` (visual polish only) */
function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const frame = useRef(null);

  useEffect(() => {
    const start = performance.now();

    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    }

    frame.current = requestAnimationFrame(tick);
    return () => frame.current && cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return value;
}

/* "Data Structures" -> "DS" */
function initialsOf(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function StudentCoursesView({ token, onNavigate }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState(token ? "" : "Please log in to view courses.");
  const [typeFilter, setTypeFilter] = useState("ALL"); // ALL | THEORY | LAB

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    async function loadCourses() {
      try {
        setLoading(true);
        setError("");
        const result = await fetchStudentCourses(token, controller.signal);
        setCourses(Array.isArray(result?.data) ? result.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to load courses.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadCourses();
    return () => controller.abort();
  }, [token]);

  const stats = useMemo(() => {
    let theoryCount = 0;
    let labCount = 0;
    let totalCredits = 0;

    courses.forEach((course) => {
      totalCredits += Number(course.credits || 0);
      if (getDeliveryType(course) === "LAB") {
        labCount += 1;
      } else {
        theoryCount += 1;
      }
    });

    return { theoryCount, labCount, totalCredits };
  }, [courses]);

  const visibleCourses = useMemo(
    () =>
      typeFilter === "ALL"
        ? courses
        : courses.filter((course) => getDeliveryType(course) === typeFilter),
    [courses, typeFilter]
  );

  const animatedCourses = useCountUp(courses.length);
  const animatedCredits = useCountUp(stats.totalCredits);

  if (loading) {
    return <LoadingSpinner message="Loading your registered courses..." />;
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-green-200 bg-gradient-to-br from-green-50 to-white p-12 text-center">
        <AcademicCapIcon className="mx-auto h-10 w-10 text-green-700/60" />
        <h3 className="mt-4 text-base font-semibold text-gray-900">
          No courses registered
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          You are not currently enrolled in any academic course offerings.
        </p>
      </div>
    );
  }

  const filterButtonClass = (active, activeClass) =>
    `rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
      active ? activeClass : "text-gray-600 hover:bg-white/70 hover:text-gray-900"
    }`;

  return (
    <div className="space-y-7">
      {/* ---------- Hero: course load at a glance ---------- */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-950 via-green-900 to-green-800 p-6 text-white shadow-xl shadow-green-900/20 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-green-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute right-8 top-8 h-24 w-24 rounded-full border border-white/10" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Your course load this semester</h2>
            <p className="mt-1 text-sm text-green-100/80">
              {stats.theoryCount} theory {stats.theoryCount === 1 ? "paper" : "papers"} and{" "}
              {stats.labCount} lab {stats.labCount === 1 ? "course" : "courses"} registered.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-200">
                <BookOpenIcon className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <span className="block text-2xl font-extrabold tabular-nums">
                  {Math.round(animatedCourses)}
                </span>
                <span className="block text-[11px] text-green-100/70">courses</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-200">
                <AcademicCapIcon className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <span className="block text-2xl font-extrabold tabular-nums">
                  {Math.round(animatedCredits)}
                </span>
                <span className="block text-[11px] text-green-100/70">credits</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Course list ---------- */}
      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex self-start rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setTypeFilter("ALL")}
              aria-pressed={typeFilter === "ALL"}
              className={filterButtonClass(typeFilter === "ALL", "bg-green-800 text-white shadow-xs")}
            >
              All ({courses.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("THEORY")}
              aria-pressed={typeFilter === "THEORY"}
              className={filterButtonClass(typeFilter === "THEORY", "bg-green-700 text-white shadow-xs")}
            >
              Theory ({stats.theoryCount})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("LAB")}
              aria-pressed={typeFilter === "LAB"}
              className={filterButtonClass(typeFilter === "LAB", "bg-yellow-300 text-yellow-950 shadow-xs")}
            >
              Lab ({stats.labCount})
            </button>
          </div>

          <DeliveryLegend />
        </div>

        {visibleCourses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            No {typeFilter === "LAB" ? "lab" : "theory"} courses registered.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleCourses.map((course) => {
              const style = deliveryStyleOf(course);
              const isLab = getDeliveryType(course) === "LAB";
              const DeliveryIcon = isLab ? BeakerIcon : BookOpenIcon;

              return (
                <article
                  key={course.enrollment_id}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border ${style.card} p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg`}
                >
                  {/* colored top accent */}
                  <div className={`absolute inset-x-0 top-0 h-1 ${style.dot}`} />

                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm ${style.avatar}`}
                    >
                      {initialsOf(course.subject_name)}
                    </span>
                    <Badge status={course.enrollment_status} />
                  </div>

                  <span
                    className={`mt-4 w-fit rounded-md px-2 py-0.5 font-mono text-xs font-bold ${style.code}`}
                  >
                    {course.subject_code}
                  </span>

                  <h3 className="mt-2 text-base font-bold leading-snug text-gray-900">
                    {course.subject_name}
                  </h3>

                  <div className="mt-auto flex flex-wrap gap-1.5 border-t border-black/5 pt-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-gray-700 ring-1 ring-black/5">
                      <AcademicCapIcon className="h-3.5 w-3.5 text-gray-400" />
                      {Number(course.credits)} credits
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-gray-700 ring-1 ring-black/5">
                      <Squares2X2Icon className="h-3.5 w-3.5 text-gray-400" />
                      Section {course.section_code || "—"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.chip}`}
                    >
                      <DeliveryIcon className="h-3.5 w-3.5" />
                      {course.delivery_type || style.label}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-gray-700 ring-1 ring-black/5">
                      <TagIcon className="h-3.5 w-3.5 text-gray-400" />
                      {course.registration_type || "REGULAR"}
                    </span>
                  </div>

                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate("academic-hub")}
                      className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-800 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-900 transition"
                    >
                      <BookOpenIcon className="h-4 w-4" /> Study Materials & Quizzes &rarr;
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default StudentCoursesView;