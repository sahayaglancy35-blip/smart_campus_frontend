import { useState, useEffect } from "react";
import { fetchStudentCourses } from "../../api/student";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import Badge from "../common/Badge";
import { BookOpenIcon, AcademicCapIcon } from "@heroicons/react/24/outline";

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

  if (loading) {
    return <LoadingSpinner message="Loading your registered courses..." />;
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-xs">
        <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
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
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">
              Registered Courses
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-700">
              <BookOpenIcon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-green-900">{courses.length}</p>
        </div>

        <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">
              Total Credits Enrolled
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-700">
              <AcademicCapIcon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-green-900">{totalCredits}</p>
        </div>
      </div>

      {/* Courses List Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {courses.map((course) => (
          <article
            key={course.enrollment_id}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-lg bg-green-50 px-3 py-1 font-mono text-sm font-bold text-green-800">
                {course.subject_code}
              </span>
              <Badge status={course.enrollment_status} />
            </div>

            <h3 className="mt-3 text-lg font-bold text-gray-900">
              {course.subject_name}
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600 border-t border-gray-100 pt-3">
              <div>
                <span className="text-gray-400">Credits:</span>{" "}
                <span className="font-semibold text-gray-800">
                  {Number(course.credits)}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Section:</span>{" "}
                <span className="font-semibold text-gray-800">
                  {course.section_code || "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Delivery:</span>{" "}
                <span className="font-semibold text-gray-800">
                  {course.delivery_type || "THEORY"}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Type:</span>{" "}
                <span className="font-semibold text-gray-800">
                  {course.registration_type || "REGULAR"}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default StudentCoursesView;
