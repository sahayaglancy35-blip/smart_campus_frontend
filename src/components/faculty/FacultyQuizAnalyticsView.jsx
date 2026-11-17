import { useState, useEffect, useMemo } from "react";
import {
  fetchSubjects,
  fetchSubjectResults,
  exportResultsCsv,
  toggleCheatingFlag,
  correctAttemptScore,
  fetchDepartmentTrends,
} from "../../api/academic";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  AcademicCapIcon,
  ShieldExclamationIcon,
  ArrowDownTrayIcon,
  UserGroupIcon,
  CheckCircleIcon,
  BuildingOffice2Icon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

export default function FacultyQuizAnalyticsView({ token, user }) {
  const isHOD = Boolean(
    user?.is_hod ||
      /head\s+of\s+department|\bhod/i.test(user?.designation || "") ||
      /head\s+of\s+department|\bhod/i.test(user?.designation_name || "") ||
      /head\s+of\s+department|\bhod/i.test(user?.in_charge_class || "") ||
      /head\s+of\s+department|\bhod/i.test(user?.name || "") ||
      /head\s+of\s+department|\bhod/i.test(user?.registerNo || "")
  );
  const isAdmin = user?.role === "ADMIN";

  // Subjects & Selection
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectQuery, setSubjectQuery] = useState("");
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState("ALL");

  // Analytics & State
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Tab: Course Assessment vs Department Trends (HOD/Admin)
  const [mainTab, setMainTab] = useState("course");
  const [deptTrends, setDeptTrends] = useState(null);
  const [deptTrendsLoading, setDeptTrendsLoading] = useState(false);

  // Table Filters & Pagination
  const [studentSearch, setStudentSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("ALL"); // ALL | PASSED | FAILED
  const [integrityFilter, setIntegrityFilter] = useState("ALL"); // ALL | CLEAN | FLAGGED
  const [sortField, setSortField] = useState("date"); // date | score | name
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals
  const [flagModalTarget, setFlagModalTarget] = useState(null);
  const [flagReason, setFlagReason] = useState("");
  const [scoreCorrectionTarget, setScoreCorrectionTarget] = useState(null);
  const [newScore, setNewScore] = useState("");
  const [reasonCode, setReasonCode] = useState("TYPO_IN_KEY");
  const [justification, setJustification] = useState("");
  const [inspectingViolation, setInspectingViolation] = useState(null);

  // 1. Fetch Subjects on Mount
  useEffect(() => {
    let active = true;

    async function loadSubjects() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchSubjects(token);
        if (!active) return;

        const list = Array.isArray(res?.data) ? res.data : [];
        setSubjects(list);
        if (list.length > 0) {
          setSelectedSubject((prev) => prev || list[0]);
        }
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to load subjects");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSubjects();
    return () => {
      active = false;
    };
  }, [token]);

  // 2. Fetch Analytics for Selected Subject
  useEffect(() => {
    if (!selectedSubject?.subject_id) return;
    let active = true;

    async function loadSubjectAnalytics() {
      try {
        setAnalyticsLoading(true);
        setError(null);
        const res = await fetchSubjectResults(token, selectedSubject.subject_id);
        if (!active) return;
        if (res?.success && res.data) {
          setAnalytics(res.data);
        } else {
          setAnalytics(null);
        }
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to load assessment analytics");
        setAnalytics(null);
      } finally {
        if (active) setAnalyticsLoading(false);
      }
    }

    loadSubjectAnalytics();
    return () => {
      active = false;
    };
  }, [token, selectedSubject?.subject_id, refreshKey]);

  // 3. Fetch Department Trends (HOD/Admin)
  const deptId =
    user?.department_id ||
    selectedSubject?.owner_department_id ||
    selectedSubject?.department_id ||
    5;

  useEffect(() => {
    if (mainTab !== "department" || (!isHOD && !isAdmin)) return;
    let active = true;

    async function loadDeptTrends() {
      try {
        setDeptTrendsLoading(true);
        const res = await fetchDepartmentTrends(token, deptId);
        if (!active) return;
        setDeptTrends(res?.data || null);
      } catch (err) {
        if (!active) return;
        console.warn("Could not load department trends:", err.message);
      } finally {
        if (active) setDeptTrendsLoading(false);
      }
    }

    loadDeptTrends();
    return () => {
      active = false;
    };
  }, [token, deptId, mainTab, isHOD, isAdmin]);

  // Filtered Subject List for Searchable Selector
  const filteredSubjects = useMemo(() => {
    if (!subjectQuery.trim()) return subjects;
    const q = subjectQuery.toLowerCase();
    return subjects.filter(
      (s) =>
        (s.code || s.subject_code || "").toLowerCase().includes(q) ||
        (s.name || "").toLowerCase().includes(q)
    );
  }, [subjects, subjectQuery]);

  // List of quizzes in current subject
  const availableQuizzes = useMemo(() => {
    return Array.isArray(analytics?.quizzes) ? analytics.quizzes : [];
  }, [analytics]);

  // Filtered and Sorted Candidate Attempts
  const processedAttempts = useMemo(() => {
    const rawAttempts = Array.isArray(analytics?.attempts) ? analytics.attempts : [];

    const filtered = rawAttempts.filter((att) => {
      // Quiz filter
      if (selectedQuizId !== "ALL" && String(att.quiz_id) !== String(selectedQuizId)) {
        return false;
      }
      // Result filter
      if (resultFilter === "PASSED" && att.result !== "PASSED") return false;
      if (resultFilter === "FAILED" && att.result !== "FAILED") return false;
      // Integrity filter
      if (integrityFilter === "CLEAN" && (att.is_flagged_cheating === 1 || att.status === "CANCELLED")) return false;
      if (integrityFilter === "FLAGGED" && att.is_flagged_cheating !== 1 && att.status !== "CANCELLED") return false;
      // Student search
      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        const nameMatch = (att.student_name || "").toLowerCase().includes(q);
        const regMatch = (att.register_no || "").toLowerCase().includes(q);
        const emailMatch = (att.email || "").toLowerCase().includes(q);
        if (!nameMatch && !regMatch && !emailMatch) return false;
      }
      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      let comparison;
      if (sortField === "score") {
        comparison = (parseFloat(a.percentage) || 0) - (parseFloat(b.percentage) || 0);
      } else if (sortField === "name") {
        comparison = (a.student_name || "").localeCompare(b.student_name || "");
      } else {
        const dateA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        const dateB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
        comparison = dateA - dateB;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [analytics, selectedQuizId, resultFilter, integrityFilter, studentSearch, sortField, sortOrder]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(processedAttempts.length / pageSize));
  const paginatedAttempts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedAttempts.slice(start, start + pageSize);
  }, [processedAttempts, currentPage, pageSize]);

  // Computed KPI Metrics (Distinguishes authentic zero, loading, error)
  const kpis = useMemo(() => {
    if (!analytics) {
      return {
        enrolled: null,
        attempts: null,
        passRate: null,
        avgScore: null,
        violations: null,
      };
    }
    return {
      enrolled: analytics.total_enrolled ?? 0,
      attempts: analytics.total_attempts ?? (Array.isArray(analytics.attempts) ? analytics.attempts.length : 0),
      passRate: analytics.pass_rate ?? 0,
      avgScore: analytics.average_score ?? 0,
      violations: analytics.cheating_flags_count ?? 0,
    };
  }, [analytics]);

  // Performance Distribution Buckets
  const scoreDistribution = useMemo(() => {
    const rawAttempts = Array.isArray(analytics?.attempts) ? analytics.attempts : [];
    const total = rawAttempts.length || 1;
    let dist = { excellent: 0, good: 0, marginal: 0, critical: 0 };

    rawAttempts.forEach((a) => {
      const p = parseFloat(a.percentage) || 0;
      if (p >= 80) dist.excellent += 1;
      else if (p >= 60) dist.good += 1;
      else if (p >= 40) dist.marginal += 1;
      else dist.critical += 1;
    });

    return {
      excellent: { count: dist.excellent, pct: Math.round((dist.excellent / total) * 100) },
      good: { count: dist.good, pct: Math.round((dist.good / total) * 100) },
      marginal: { count: dist.marginal, pct: Math.round((dist.marginal / total) * 100) },
      critical: { count: dist.critical, pct: Math.round((dist.critical / total) * 100) },
    };
  }, [analytics]);

  // Actions
  const handleExportCsv = async () => {
    if (!selectedSubject?.subject_id) return;
    try {
      await exportResultsCsv(token, selectedSubject.subject_id);
    } catch (err) {
      setFeedback({ type: "error", message: `Export failed: ${err.message}` });
    }
  };

  const handleSaveCheatingFlag = async () => {
    if (!flagModalTarget) return;
    try {
      const isCurrentlyFlagged = flagModalTarget.is_flagged_cheating === 1;
      const nextFlag = !isCurrentlyFlagged;
      await toggleCheatingFlag(token, flagModalTarget.attempt_id, nextFlag, flagReason);
      setFeedback({
        type: "success",
        message: nextFlag
          ? `Integrity violation recorded for candidate ${flagModalTarget.student_name}.`
          : `Integrity violation cleared for ${flagModalTarget.student_name}.`,
      });
      setFlagModalTarget(null);
      setFlagReason("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  const handleSaveScoreCorrection = async () => {
    if (!scoreCorrectionTarget) return;
    if (!newScore || isNaN(parseFloat(newScore))) {
      alert("Please provide a valid numeric score");
      return;
    }
    if (!justification.trim()) {
      alert("Please provide an audit justification");
      return;
    }

    try {
      await correctAttemptScore(
        token,
        scoreCorrectionTarget.attempt_id,
        newScore,
        reasonCode,
        justification
      );
      setFeedback({
        type: "success",
        message: `Score updated for ${scoreCorrectionTarget.student_name}. Logged into academic audit trail.`,
      });
      setScoreCorrectionTarget(null);
      setNewScore("");
      setJustification("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  if (loading && subjects.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-xs">
        <LoadingSpinner message="Loading assessment data..." size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Notifications */}
      {feedback && (
        <Alert
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Clean Assessment Analytics Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-xs shrink-0">
              <ChartBarIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                Assessment Analytics
              </h1>
              <span className="text-xs text-gray-500">
                {selectedSubject
                  ? `${selectedSubject.code || selectedSubject.subject_code} • ${selectedSubject.name}`
                  : "Performance Evaluation & Integrity Audit"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-xs"
              title="Refresh Assessment Analytics"
            >
              <ArrowPathIcon className="h-4 w-4 text-gray-500" />
              <span>Refresh</span>
            </button>

            {selectedSubject && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition shadow-xs"
                title="Export Assessment Ledger to CSV"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher for HOD / Admin */}
        {(isHOD || isAdmin) && (
          <div className="flex border-b border-gray-100 pt-4 mt-2 space-x-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMainTab("course")}
              className={`pb-2.5 transition border-b-2 flex items-center gap-2 ${
                mainTab === "course"
                  ? "border-emerald-700 text-emerald-800"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <AcademicCapIcon className="h-4 w-4" />
              <span>Course Assessment Analytics</span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab("department")}
              className={`pb-2.5 transition border-b-2 flex items-center gap-2 ${
                mainTab === "department"
                  ? "border-emerald-700 text-emerald-800"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <BuildingOffice2Icon className="h-4 w-4" />
              <span>Department Overview & Early Warning</span>
            </button>
          </div>
        )}
      </div>

      {/* ================= VIEW 1: COURSE ASSESSMENT ANALYTICS ================= */}
      {mainTab === "course" && (
        <div className="space-y-6">
          {/* Compact Subject & Quiz Selector Toolbar */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Compact Searchable Subject Dropdown */}
              <div className="relative">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Academic Subject
                </label>
                <div
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-gray-300 bg-gray-50/50 cursor-pointer hover:border-emerald-600 transition text-xs"
                  onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
                >
                  {selectedSubject ? (
                    <span className="font-semibold text-gray-900 truncate">
                      <span className="font-bold text-emerald-800 mr-2">
                        {selectedSubject.code || selectedSubject.subject_code}
                      </span>
                      {selectedSubject.name}
                    </span>
                  ) : (
                    <span className="text-gray-400">Select a subject...</span>
                  )}
                  <FunnelIcon className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                </div>

                {/* Popover Subject List */}
                {showSubjectDropdown && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={subjectQuery}
                          onChange={(e) => setSubjectQuery(e.target.value)}
                          placeholder="Search code or name..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                      {filteredSubjects.length === 0 ? (
                        <p className="p-4 text-center text-xs text-gray-400 italic">
                          No matching subjects
                        </p>
                      ) : (
                        filteredSubjects.map((sub) => {
                          const isCur = selectedSubject?.subject_id === sub.subject_id;
                          return (
                            <button
                              key={sub.subject_id}
                              type="button"
                              onClick={() => {
                                setSelectedSubject(sub);
                                setSelectedQuizId("ALL");
                                setShowSubjectDropdown(false);
                                setCurrentPage(1);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition ${
                                isCur
                                  ? "bg-emerald-50 text-emerald-900 font-bold"
                                  : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <span className="truncate">
                                <span className="font-bold mr-2 text-emerald-800">
                                  {sub.code || sub.subject_code}
                                </span>
                                {sub.name}
                              </span>
                              {isCur && <CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quiz Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Assessment Quiz Unit
                </label>
                <select
                  value={selectedQuizId}
                  onChange={(e) => {
                    setSelectedQuizId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-gray-300 bg-white text-gray-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="ALL">All Course Quizzes & Sittings</option>
                  {availableQuizzes.map((q) => (
                    <option key={q.quiz_id} value={q.quiz_id}>
                      {q.title} (Pass Mark: {parseFloat(q.pass_mark) || 50}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                className="text-xs font-semibold text-rose-700 underline hover:text-rose-900"
              >
                Retry
              </button>
            </div>
          )}

          {/* 5 KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* 1. Total Enrolled */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Total Enrolled
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-gray-900">
                  {analyticsLoading ? "..." : (kpis.enrolled ?? "—")}
                </span>
                <UserGroupIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* 2. Total Attempts */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Total Attempts
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-gray-900">
                  {analyticsLoading ? "..." : (kpis.attempts ?? "—")}
                </span>
                <AcademicCapIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* 3. Pass Rate */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                Pass Rate
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-emerald-700">
                  {analyticsLoading ? "..." : kpis.passRate !== null ? `${kpis.passRate}%` : "—"}
                </span>
                <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
              </div>
            </div>

            {/* 4. Average Score */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Average Score
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-gray-900">
                  {analyticsLoading ? "..." : kpis.avgScore !== null ? `${kpis.avgScore}%` : "—"}
                </span>
                <ChartBarIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* 5. Integrity Violations */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">
                Integrity Violations
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-rose-700">
                  {analyticsLoading ? "..." : (kpis.violations ?? "—")}
                </span>
                <ShieldExclamationIcon className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </div>

          {/* Performance Visualizations Grid */}
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Candidate Score Distribution */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-gray-900">
                  Score Distribution
                </h3>

                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-emerald-800">High Distinction (80% – 100%)</span>
                      <span className="font-mono text-gray-700">
                        {scoreDistribution.excellent.count} ({scoreDistribution.excellent.pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${scoreDistribution.excellent.pct}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-teal-800">Pass / Competent (60% – 79%)</span>
                      <span className="font-mono text-gray-700">
                        {scoreDistribution.good.count} ({scoreDistribution.good.pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${scoreDistribution.good.pct}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-amber-800">Marginal (40% – 59%)</span>
                      <span className="font-mono text-gray-700">
                        {scoreDistribution.marginal.count} ({scoreDistribution.marginal.pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${scoreDistribution.marginal.pct}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-rose-800">Remediation Needed (&lt; 40%)</span>
                      <span className="font-mono text-gray-700">
                        {scoreDistribution.critical.count} ({scoreDistribution.critical.pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-rose-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${scoreDistribution.critical.pct}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart 2: Unit Learning Progress Funnel */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-gray-900">
                  Unit Learning & Completion Funnel
                </h3>

                {Array.isArray(analytics?.funnel) && analytics.funnel.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    {analytics.funnel.map((item) => {
                      const passPct = item.students_attempted_quiz > 0
                        ? Math.round((item.students_passed_quiz / item.students_attempted_quiz) * 100)
                        : 0;

                      return (
                        <div key={item.topic_id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-semibold text-gray-900">
                            <span className="truncate">{item.topic_title}</span>
                            <span className="text-emerald-700 font-mono text-[11px] shrink-0">
                              {passPct}% Pass Rate
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-600 text-center">
                            <span className="bg-white py-1 rounded-md border border-gray-200">
                              Started: {item.students_started_materials}
                            </span>
                            <span className="bg-white py-1 rounded-md border border-gray-200">
                              Attempted: {item.students_attempted_quiz}
                            </span>
                            <span className="bg-white py-1 rounded-md border border-gray-200 font-bold text-emerald-800">
                              Passed: {item.students_passed_quiz}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic py-6 text-center">
                    No unit funnel progress recorded yet.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Candidate Examination Submissions Table */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Candidate Examination Submissions
                </h3>
                <span className="text-xs text-gray-500">
                  Showing {processedAttempts.length} candidate sittings
                </span>
              </div>

              {/* Toolbar: Search, Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search candidate..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 w-44"
                  />
                </div>

                {/* Result Filter */}
                <select
                  value={resultFilter}
                  onChange={(e) => {
                    setResultFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                >
                  <option value="ALL">All Results</option>
                  <option value="PASSED">Passed</option>
                  <option value="FAILED">Failed</option>
                </select>

                {/* Integrity Filter */}
                <select
                  value={integrityFilter}
                  onChange={(e) => {
                    setIntegrityFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                >
                  <option value="ALL">All Integrity States</option>
                  <option value="CLEAN">Clean / Verified</option>
                  <option value="FLAGGED">Violations Only</option>
                </select>
              </div>
            </div>

            {/* Submissions Table */}
            {processedAttempts.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-xl">
                <AcademicCapIcon className="h-10 w-10 text-gray-300 mx-auto" />
                <h4 className="mt-2 text-sm font-semibold text-gray-700">No examination sittings found</h4>
                <p className="mt-1 text-xs text-gray-500">
                  {studentSearch || resultFilter !== "ALL" || integrityFilter !== "ALL"
                    ? "No sittings matched your current filter criteria."
                    : "No students have attempted quizzes in this subject yet."}
                </p>
                {(studentSearch || resultFilter !== "ALL" || integrityFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={() => {
                      setStudentSearch("");
                      setResultFilter("ALL");
                      setIntegrityFilter("ALL");
                      setCurrentPage(1);
                    }}
                    className="mt-3 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    Clear Filter Criteria
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <tr>
                      <th
                        className="py-3 px-3 cursor-pointer hover:text-gray-900"
                        onClick={() => handleSort("name")}
                      >
                        Student {sortField === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="py-3 px-3">Quiz Assessment</th>
                      <th
                        className="py-3 px-3 cursor-pointer hover:text-gray-900"
                        onClick={() => handleSort("score")}
                      >
                        Score {sortField === "score" && (sortOrder === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="py-3 px-3">Result</th>
                      <th
                        className="py-3 px-3 cursor-pointer hover:text-gray-900"
                        onClick={() => handleSort("date")}
                      >
                        Date {sortField === "date" && (sortOrder === "asc" ? "↑" : "↓")}
                      </th>
                      <th className="py-3 px-3">Integrity</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {paginatedAttempts.map((att) => {
                      const isViolation = att.is_flagged_cheating === 1 || att.status === "CANCELLED";
                      const isPassed = att.result === "PASSED";

                      return (
                        <tr key={att.attempt_id} className="hover:bg-gray-50/70 transition">
                          <td className="py-3 px-3">
                            <span className="font-bold text-gray-900 block">{att.student_name}</span>
                            <span className="text-[11px] text-gray-500 font-mono">
                              {att.register_no}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-gray-800 block">{att.quiz_title}</span>
                            <span className="text-[10px] text-gray-400">
                              Attempt #{att.attempt_number}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-gray-900 text-sm">
                              {att.score ?? "0.00"}
                            </span>
                            <span className="text-[11px] text-gray-500 font-mono block">
                              ({att.percentage ?? 0}%)
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isPassed
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : "bg-rose-100 text-rose-800 border border-rose-200"
                              }`}
                            >
                              {att.result || (isPassed ? "PASSED" : "FAILED")}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-500 text-[11px]">
                            {att.submitted_at
                              ? new Date(att.submitted_at).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="py-3 px-3">
                            {isViolation ? (
                              <button
                                type="button"
                                onClick={() => setInspectingViolation(att)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-300 hover:bg-rose-200 transition"
                              >
                                <ShieldExclamationIcon className="h-3 w-3 text-rose-600" />
                                <span>Violation</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <ShieldCheckIcon className="h-3 w-3 text-emerald-600" />
                                <span>Clean</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setScoreCorrectionTarget(att);
                                setNewScore(String(att.score ?? ""));
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                              title="Audit Score Correction"
                            >
                              Adjust Score
                            </button>

                            <button
                              type="button"
                              onClick={() => setFlagModalTarget(att)}
                              className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition ${
                                isViolation
                                  ? "text-gray-600 hover:text-gray-900 bg-gray-100"
                                  : "text-rose-700 hover:bg-rose-50"
                              }`}
                            >
                              {isViolation ? "Clear Flag" : "Flag Violation"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs">
                    <span className="text-gray-500">
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= VIEW 2: DEPARTMENT OVERVIEW & EARLY WARNING ================= */}
      {mainTab === "department" && (isHOD || isAdmin) && (
        <div className="space-y-6">
          {deptTrendsLoading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-xs">
              <LoadingSpinner message="Loading department academic trends..." size="lg" />
            </div>
          ) : (
            <>
              {/* Department Summary KPIs */}
              {deptTrends?.summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                      Department Subjects
                    </span>
                    <span className="text-2xl font-bold text-gray-900 mt-1 block">
                      {deptTrends.summary.total_subjects}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                      Enrolled Students
                    </span>
                    <span className="text-2xl font-bold text-gray-900 mt-1 block">
                      {deptTrends.summary.total_enrolled_students}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
                    <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                      Overall Pass Rate
                    </span>
                    <span className="text-2xl font-bold text-emerald-700 mt-1 block">
                      {deptTrends.summary.overall_pass_rate}%
                    </span>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                      Average Score
                    </span>
                    <span className="text-2xl font-bold text-gray-900 mt-1 block">
                      {deptTrends.summary.overall_average_score}%
                    </span>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
                    <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider block flex items-center gap-1">
                      <ExclamationCircleIcon className="h-4 w-4 text-amber-600" /> At-Risk Students
                    </span>
                    <span className="text-2xl font-bold text-amber-900 mt-1 block">
                      {deptTrends.summary.students_unstarted_topic1_count}
                    </span>
                  </div>
                </div>
              )}

              {/* Department Course Performance Matrix Table */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-gray-900">
                  Department Course Matrix
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-3">Subject</th>
                        <th className="py-3 px-3">Enrolled</th>
                        <th className="py-3 px-3">Attempts</th>
                        <th className="py-3 px-3">Pass Rate</th>
                        <th className="py-3 px-3">Avg Score</th>
                        <th className="py-3 px-3 text-right">At-Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {(deptTrends?.subject_trends || []).map((st) => (
                        <tr key={st.subject_id} className="hover:bg-gray-50/70 transition">
                          <td className="py-3 px-3">
                            <span className="font-bold text-gray-900 block">{st.subject_code}</span>
                            <span className="text-gray-500 text-[11px]">{st.name}</span>
                          </td>
                          <td className="py-3 px-3 font-mono">{st.enrolled_students}</td>
                          <td className="py-3 px-3 font-mono">{st.quiz_metrics.total_attempts}</td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                            {st.quiz_metrics.pass_rate_percentage}%
                          </td>
                          <td className="py-3 px-3 font-mono">{st.quiz_metrics.average_score_percentage}%</td>
                          <td className="py-3 px-3 text-right">
                            {st.topic1_unstarted_count > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                {st.topic1_unstarted_count} students
                              </span>
                            ) : (
                              <span className="text-emerald-700 text-xs">Active</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* At-Risk Students Early Intervention Table */}
              {Array.isArray(deptTrends?.unstarted_topic1_students) &&
                deptTrends.unstarted_topic1_students.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-5 shadow-xs space-y-3">
                    <div className="flex items-center gap-2">
                      <ExclamationCircleIcon className="h-5 w-5 text-amber-600 shrink-0" />
                      <h3 className="text-sm font-bold text-amber-950">
                        Early Intervention: Zero Progress Candidates ({deptTrends.unstarted_topic1_students.length})
                      </h3>
                    </div>

                    <div className="overflow-x-auto rounded-xl bg-white border border-amber-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-amber-50/70 text-[11px] font-bold uppercase tracking-wider text-amber-900 border-b border-amber-200">
                          <tr>
                            <th className="py-2.5 px-3">Register No</th>
                            <th className="py-2.5 px-3">Student Name</th>
                            <th className="py-2.5 px-3">Email</th>
                            <th className="py-2.5 px-3">Subject</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100 font-medium">
                          {deptTrends.unstarted_topic1_students.map((stu, idx) => (
                            <tr key={idx} className="hover:bg-amber-50/50">
                              <td className="py-2.5 px-3 font-mono font-bold text-gray-900">{stu.register_no}</td>
                              <td className="py-2.5 px-3 font-semibold text-gray-900">{stu.full_name}</td>
                              <td className="py-2.5 px-3 text-gray-500 text-[11px] font-mono">{stu.email}</td>
                              <td className="py-2.5 px-3 font-mono text-gray-800">{stu.subject_code}</td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  0% Activity
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      )}

      {/* ================= MODAL: Integrity Violation Flag ================= */}
      {flagModalTarget && (
        <Modal
          isOpen={Boolean(flagModalTarget)}
          onClose={() => setFlagModalTarget(null)}
          title="Integrity Violation Audit"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-600">
              {flagModalTarget.is_flagged_cheating === 1
                ? `Clear recorded integrity violation for ${flagModalTarget.student_name} (${flagModalTarget.register_no})?`
                : `Record integrity violation for ${flagModalTarget.student_name} (${flagModalTarget.register_no})? This will mark the attempt and record into the academic ledger.`}
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Audit Justification / Note</label>
              <textarea
                rows={3}
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="State the observed departure or justification..."
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFlagModalTarget(null)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCheatingFlag}
                className={`rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs ${
                  flagModalTarget.is_flagged_cheating === 1
                    ? "bg-emerald-700 hover:bg-emerald-800"
                    : "bg-rose-700 hover:bg-rose-800"
                }`}
              >
                {flagModalTarget.is_flagged_cheating === 1 ? "Clear Violation" : "Confirm Violation"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL: Score Correction ================= */}
      {scoreCorrectionTarget && (
        <Modal
          isOpen={Boolean(scoreCorrectionTarget)}
          onClose={() => setScoreCorrectionTarget(null)}
          title="Audit Score Correction"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-600">
              Adjust graded score for <strong>{scoreCorrectionTarget.student_name}</strong> ({scoreCorrectionTarget.quiz_title}). Every adjustment is logged to the four-field academic ledger.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">New Score</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Reason Code</label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2 text-xs bg-white"
              >
                <option value="TYPO_IN_KEY">Typo in Question Answer Key</option>
                <option value="RE_EVALUATION">Re-evaluation on Student Appeal</option>
                <option value="TECHNICAL_FAULT">Technical Fault / Disconnect</option>
                <option value="OTHER">Other Administrative Adjustment</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Audit Justification</label>
              <textarea
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="State reason for score modification..."
                className="w-full rounded-xl border border-gray-300 p-2 text-xs"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setScoreCorrectionTarget(null)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveScoreCorrection}
                className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-semibold text-white shadow-xs"
              >
                Commit Modification
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL: Violation Details Audit ================= */}
      {inspectingViolation && (
        <Modal
          isOpen={Boolean(inspectingViolation)}
          onClose={() => setInspectingViolation(null)}
          title="Proctor Integrity Record"
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldExclamationIcon className="h-4 w-4 text-rose-700" />
                <span>Three-Strike Integrity Cancellation Enforced</span>
              </div>
              <p className="text-[11px] text-rose-800">
                This examination attempt was authoritatively terminated by the examination engine for proctoring violations (focus departures / window blur).
              </p>
            </div>

            <div className="space-y-1 pt-1 text-gray-700">
              <p><strong>Candidate:</strong> {inspectingViolation.student_name} ({inspectingViolation.register_no})</p>
              <p><strong>Quiz:</strong> {inspectingViolation.quiz_title}</p>
              <p><strong>Sitting Date:</strong> {new Date(inspectingViolation.submitted_at || inspectingViolation.started_at).toLocaleString()}</p>
              <p><strong>Final Status:</strong> CANCELLED (0.00%)</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectingViolation(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
