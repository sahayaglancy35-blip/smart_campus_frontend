import { useState, useEffect, useCallback } from "react";
import { fetchAdminAcademicOversight } from "../../api/academic";
import { getDepartments } from "../../api/admin";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import MaterialViewerModal from "../academic/MaterialViewerModal";
import {
  BookOpenIcon,
  AcademicCapIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

export default function AdminAcademicOversightView({ token }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [oversightData, setOversightData] = useState(null);
  const [departments, setDepartments] = useState([]);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState("materials"); // "materials" | "quizzes" | "activities" | "faculty"
  const [selectedDept, setSelectedDept] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Material Viewer Modal
  const [viewingMaterial, setViewingMaterial] = useState(null);

  // Reactive refresh trigger
  const [refreshKey, setRefreshKey] = useState(0);
  const loadData = useCallback(() => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchAdminAcademicOversight(token, {
        department_id: selectedDept || undefined,
        search: searchTerm || undefined,
      }).catch(() => ({
        data: {
          summary: { total_faculty: 0, total_materials: 0, total_quizzes: 0, total_attempts: 0 },
          materials: [],
          quizzes: [],
          student_activities: [],
          faculty_summary: [],
        },
      })),
      getDepartments(token).catch(() => ({ data: [] })),
    ])
      .then(([res, deptRes]) => {
        if (!active) return;
        setOversightData(res.data);
        if (Array.isArray(deptRes?.data)) {
          setDepartments(deptRes.data);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Failed to load academic oversight data");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, selectedDept, searchTerm, refreshKey]);

  const summary = oversightData?.summary || {};
  const materials = oversightData?.materials || [];
  const quizzes = oversightData?.quizzes || [];
  const studentActivities = oversightData?.student_activities || [];
  const facultySummary = oversightData?.faculty_summary || [];

  if (loading) {
    return <LoadingSpinner message="Loading college-wide academic courseware and quiz oversight..." />;
  }

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} onClose={() => setError("")} />}

      {/* ================= Header Title & Banner ================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              College-Wide Faculty Quizzes & Courseware
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Curriculum study materials, evaluation quizzes, and candidate assessment activities across departments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Top KPI Metrics */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Active Faculty
            </span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">
              {summary.total_faculty || 0}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Across all schools</span>
          </div>

          <div className="rounded-2xl bg-emerald-50/60 p-4 border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Study Materials
            </span>
            <span className="text-2xl font-black text-emerald-950 mt-1 block">
              {summary.total_materials || materials.length || 0}
            </span>
            <span className="text-[11px] text-emerald-700 mt-0.5 block">PDF, Slides, Video, Notes</span>
          </div>

          <div className="rounded-2xl bg-indigo-50/60 p-4 border border-indigo-200">
            <span className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider block">
              Quizzes Configured
            </span>
            <span className="text-2xl font-black text-indigo-950 mt-1 block">
              {summary.total_quizzes || quizzes.length || 0}
            </span>
            <span className="text-[11px] text-indigo-700 mt-0.5 block">Course unit evaluations</span>
          </div>

          <div className="rounded-2xl bg-amber-50/60 p-4 border border-amber-200">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
              Student Attempts
            </span>
            <span className="text-2xl font-black text-amber-950 mt-1 block">
              {summary.total_attempts || studentActivities.length || 0}
            </span>
            <span className="text-[11px] text-amber-700 mt-0.5 block">
              Avg score: {summary.average_quiz_score ? `${summary.average_quiz_score}%` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ================= Filter Controls & Search Bar ================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <FunnelIcon className="h-4 w-4 text-emerald-700" />
            <span>Filter Department:</span>
          </div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.department_id} value={d.department_id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search material, quiz, or faculty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>

      {/* ================= Navigation Tabs ================= */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("materials")}
          className={`pb-3 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === "materials"
              ? "border-emerald-700 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <BookOpenIcon className="h-4 w-4" />
          Study Materials ({materials.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("quizzes")}
          className={`pb-3 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === "quizzes"
              ? "border-emerald-700 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <AcademicCapIcon className="h-4 w-4" />
          Faculty Quizzes ({quizzes.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("activities")}
          className={`pb-3 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === "activities"
              ? "border-emerald-700 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <ClipboardDocumentCheckIcon className="h-4 w-4" />
          Student Quiz Sittings ({studentActivities.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("faculty")}
          className={`pb-3 transition border-b-2 flex items-center gap-1.5 ${
            activeTab === "faculty"
              ? "border-emerald-700 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <UserGroupIcon className="h-4 w-4" />
          Faculty Breakdown ({facultySummary.length})
        </button>
      </div>

      {/* ================= TAB 1: Study Materials ================= */}
      {activeTab === "materials" && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Material & Type</th>
                  <th className="px-4 py-3.5">Course & Unit</th>
                  <th className="px-4 py-3.5">Faculty Author</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="px-3 py-3.5">Required</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No study materials found matching filters.
                    </td>
                  </tr>
                ) : (
                  materials.map((mat) => (
                    <tr key={mat.material_id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{mat.title}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600 font-semibold">
                            {mat.type}
                          </span>
                          <span>v{mat.version}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{mat.subject_code}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{mat.topic_title}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{mat.faculty_name || "Faculty Member"}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{mat.employee_code || "—"}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {mat.department_name || "—"}
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            mat.status === "Published"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {mat.status}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            mat.required_flag ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {mat.required_flag ? "Required" : "Optional"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setViewingMaterial(mat)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                        >
                          <EyeIcon className="h-3.5 w-3.5 text-emerald-700" /> Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 2: Faculty Quizzes ================= */}
      {activeTab === "quizzes" && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Quiz Title</th>
                  <th className="px-4 py-3.5">Course & Unit</th>
                  <th className="px-4 py-3.5">Faculty Creator</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-3 py-3.5">Questions</th>
                  <th className="px-3 py-3.5">Pass Mark</th>
                  <th className="px-3 py-3.5">Time Limit</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Attempts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {quizzes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      No quizzes found matching filters.
                    </td>
                  </tr>
                ) : (
                  quizzes.map((q) => (
                    <tr key={q.quiz_id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {q.title}
                        <div className="text-[11px] font-normal text-slate-400 mt-0.5">
                          Max attempts: {q.max_attempts}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{q.subject_code}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">{q.topic_title}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{q.faculty_name || "Faculty Member"}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{q.employee_code || "—"}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {q.department_name || "—"}
                      </td>
                      <td className="px-3 py-3.5 font-mono font-bold text-slate-800">
                        {q.total_questions || 0}
                      </td>
                      <td className="px-3 py-3.5 font-mono text-emerald-800 font-bold">
                        {q.pass_mark}%
                      </td>
                      <td className="px-3 py-3.5 text-slate-600">
                        {q.time_limit} mins
                      </td>
                      <td className="px-3 py-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            q.status === "Published"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-700">
                        {q.total_attempts || 0} sitting{q.total_attempts === 1 ? "" : "s"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: Student Activities ================= */}
      {activeTab === "activities" && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Student Details</th>
                  <th className="px-4 py-3.5">Quiz / Assessment</th>
                  <th className="px-4 py-3.5">Course</th>
                  <th className="px-3 py-3.5">Score</th>
                  <th className="px-3 py-3.5">Percentage</th>
                  <th className="px-3 py-3.5">Result</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Attempt Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {studentActivities.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                      No student quiz activities recorded yet.
                    </td>
                  </tr>
                ) : (
                  studentActivities.map((act) => (
                    <tr key={act.attempt_id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{act.student_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{act.register_no}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{act.quiz_title}</div>
                        <div className="text-[11px] text-slate-500">Attempt #{act.attempt_number}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {act.subject_code} - {act.subject_name}
                      </td>
                      <td className="px-3 py-3.5 font-mono font-bold text-slate-800">
                        {act.score !== null ? `${act.score} / ${act.max_score}` : "—"}
                      </td>
                      <td className="px-3 py-3.5 font-mono font-bold text-slate-800">
                        {act.percentage !== null ? `${act.percentage}%` : "—"}
                      </td>
                      <td className="px-3 py-3.5">
                        {act.result === "PASSED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircleIcon className="h-3 w-3" /> Passed
                          </span>
                        ) : act.result === "FAILED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-200">
                            <XCircleIcon className="h-3 w-3" /> Failed
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 font-mono text-[11px] text-slate-600">
                        {act.status}
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-400 font-mono text-[11px]">
                        {act.submitted_at ? new Date(act.submitted_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : act.started_at ? new Date(act.started_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: Faculty Summary ================= */}
      {activeTab === "faculty" && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Faculty Name</th>
                  <th className="px-4 py-3.5">Employee Code</th>
                  <th className="px-4 py-3.5">Designation</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5 text-center">Study Materials Uploaded</th>
                  <th className="px-4 py-3.5 text-center">Quizzes Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {facultySummary.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No faculty records found.
                    </td>
                  </tr>
                ) : (
                  facultySummary.map((fac) => (
                    <tr key={fac.faculty_id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {fac.full_name}
                        <div className="text-[11px] font-normal text-slate-400">{fac.email}</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600">
                        {fac.employee_code}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {fac.designation || "Faculty"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        {fac.department_name} ({fac.department_code})
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-emerald-800">
                        {fac.total_materials}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-indigo-800">
                        {fac.total_quizzes}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Material Modal for Admin inspection */}
      <MaterialViewerModal
        isOpen={Boolean(viewingMaterial)}
        onClose={() => setViewingMaterial(null)}
        material={viewingMaterial}
        token={token}
      />
    </div>
  );
}
