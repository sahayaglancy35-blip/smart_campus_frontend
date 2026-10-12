import { useState, useEffect, useRef } from "react";
import { fetchStudentCourses } from "../../api/student";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import Badge from "../common/Badge";
import {
  BookOpenIcon,
  AcademicCapIcon,
  Squares2X2Icon,
  BeakerIcon,
  UserGroupIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

/* ----------------------------------------------------------------
   useCountUp — animates a number from 0 to `target` once, on mount
   or whenever target changes. Pure visual polish, no logic change.
---------------------------------------------------------------- */
function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const frame = useRef(null);

  useEffect(() => {
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
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

/* Delivery type decides the card's accent color + icon, so lab vs
   theory vs seminar are visually distinct at a glance. */
const DELIVERY_STYLE = {
  THEORY: {
    icon: BookOpenIcon,
    avatar: "bg-gradient-to-br from-green-600 to-emerald-500",
    border: "border-l-green-500",
  },
  LAB: {
    icon: BeakerIcon,
    avatar: "bg-gradient-to-br from-amber-500 to-yellow-400",
    border: "border-l-amber-500",
  },
  SEMINAR: {
    icon: UserGroupIcon,
    avatar: "bg-gradient-to-br from-violet-500 to-purple-400",
    border: "border-l-violet-500",
  },
};
function deliveryStyleOf(type) {
  const key = (type || "THEORY").toUpperCase();
  return DELIVERY_STYLE[key] || DELIVERY_STYLE.THEORY;
}

export function StudentCoursesView({ token }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState(token ? "" : "Please log in to view courses.");

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

  const totalCredits = courses.reduce(
    (total, course) => total + Number(course.credits || 0),
    0
  );
  const animatedCourseCount = useCountUp(courses.length);
  const animatedCredits = useCountUp(totalCredits);

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

  return (
    <div className="space-y-7">
      {/* ---------- Hero: compact gradient strip with two animated headline stats ---------- */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-950 via-green-900 to-green-800 px-6 py-5 text-white shadow-lg shadow-green-900/20 sm:px-7">
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-green-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-8 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Your course load this semester</h2>
            <p className="mt-1 text-sm text-green-100/80">
              A quick look at what you're registered for right now.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/20 text-emerald-200">
                <BookOpenIcon className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <span className="block text-2xl font-extrabold tabular-nums">
                  {Math.round(animatedCourseCount)}
                </span>
                <span className="block text-[11px] text-green-100/70">courses</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/20 text-emerald-200">
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

      {/* ---------- Course grid: narrower cards, 3 per row on wide screens ---------- */}
      <section>
        <h3 className="mb-3 text-base font-bold text-gray-900">Registered courses</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const style = deliveryStyleOf(course.delivery_type);
            const DeliveryIcon = style.icon;

            return (
              <article
                key={course.enrollment_id}
                className={`group flex flex-col rounded-2xl border border-gray-200 border-l-4 ${style.border} bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm ${style.avatar}`}
                  >
                    {initialsOf(course.subject_name)}
                  </span>
                  <Badge status={course.enrollment_status} />
                </div>

                <span className="mt-3 w-fit rounded-md bg-green-50 px-2 py-0.5 font-mono text-xs font-bold text-green-800">
                  {course.subject_code}
                </span>

                <h3 className="mt-2 text-base font-bold leading-snug text-gray-900">
                  {course.subject_name}
                </h3>

                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-gray-100 pt-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                    <AcademicCapIcon className="h-3.5 w-3.5 text-gray-400" />
                    {Number(course.credits)} credits
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                    <Squares2X2Icon className="h-3.5 w-3.5 text-gray-400" />
                    {course.section_code || "—"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                    <DeliveryIcon className="h-3.5 w-3.5 text-gray-400" />
                    {course.delivery_type || "THEORY"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                    <TagIcon className="h-3.5 w-3.5 text-gray-400" />
                    {course.registration_type || "REGULAR"}
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

export default StudentCoursesView;