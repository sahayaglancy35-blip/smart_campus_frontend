import { useState, useEffect } from "react";
import { fetchStudentAttendanceSummary } from "../../api/student";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import StatCard from "../common/StatCard";
import { ChartPieIcon } from "@heroicons/react/24/outline";

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

  if (loading) {
    return <LoadingSpinner message="Calculating attendance metrics..." />;
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  if (subjects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-xs">
        <ChartPieIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-base font-semibold text-gray-900">
          No attendance records
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Attendance records have not yet been logged for your enrolled courses.
        </p>
      </div>
    );
  }

  const total = subjects.reduce((sum, s) => sum + Number(s.total_classes || 0), 0);
  const attended = subjects.reduce((sum, s) => sum + Number(s.attended_classes || 0), 0);
  const absent = subjects.reduce((sum, s) => sum + Number(s.absent_classes || 0), 0);
  const overall = total ? (attended / total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Conducted Classes" value={total} color="gray" />
        <StatCard label="Classes Attended" value={attended} color="green" />
        <StatCard label="Classes Absent" value={absent} color="red" />
      </div>

      {/* Overall Progress Gauge */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Institutional Overall Attendance
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Aggregated across all registered subjects for this semester.
            </p>
          </div>
          <span
            className={`text-3xl font-extrabold ${
              overall >= 75
                ? "text-green-800"
                : overall >= 65
                ? "text-amber-600"
                : "text-red-600"
            }`}
          >
            {overall.toFixed(1)}%
          </span>
        </div>

        <div className="mt-4 h-3.5 overflow-hidden rounded-full bg-gray-100 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              overall >= 75
                ? "bg-green-700"
                : overall >= 65
                ? "bg-amber-500"
                : "bg-red-600"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, overall))}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 font-medium">
          <span>0%</span>
          <span className="font-semibold text-gray-700">75% Minimum Required</span>
          <span>100%</span>
        </div>
      </section>

      {/* Subject-wise Cards */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-gray-900">Subject-wise Breakdown</h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {subjects.map((subject) => {
            const pct =
              subject.attendance_percentage == null
                ? null
                : Number(subject.attendance_percentage);

            return (
              <article
                key={subject.subject_id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-md bg-green-50 px-2.5 py-1 font-mono text-xs font-bold text-green-800">
                      {subject.subject_code}
                    </span>
                    <h4 className="mt-2 text-base font-bold text-gray-900">
                      {subject.subject_name}
                    </h4>
                  </div>
                  <span
                    className={`text-xl font-bold ${
                      pct === null
                        ? "text-gray-400"
                        : pct >= 75
                        ? "text-green-700"
                        : pct >= 65
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {pct !== null ? `${pct.toFixed(1)}%` : "N/A"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-gray-50/80 p-3 text-center text-xs">
                  <div>
                    <p className="text-gray-400 font-medium">Conducted</p>
                    <p className="mt-0.5 font-bold text-gray-800">
                      {subject.total_classes}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Present</p>
                    <p className="mt-0.5 font-bold text-green-700">
                      {subject.attended_classes}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Absent</p>
                    <p className="mt-0.5 font-bold text-red-600">
                      {subject.absent_classes}
                    </p>
                  </div>
                </div>

                {pct !== null && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${
                        pct >= 75
                          ? "bg-green-600"
                          : pct >= 65
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AttendanceSummaryView;
