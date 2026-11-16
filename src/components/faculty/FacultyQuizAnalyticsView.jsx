import { useState, useEffect, useCallback } from "react";
import {
  fetchSubjects,
  fetchSubjectResults,
  exportResultsCsv,
  toggleCheatingFlag,
  correctAttemptScore,
} from "../../api/academic";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  AcademicCapIcon,
  ShieldExclamationIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  ClockIcon,
  FlagIcon,
} from "@heroicons/react/24/outline";
import { FlagIcon as FlagIconSolid } from "@heroicons/react/24/solid";

export default function FacultyQuizAnalyticsView({ token, user }) {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Cheating Flag Modal
  const [flagModalTarget, setFlagModalTarget] = useState(null);
  const [flagReason, setFlagReason] = useState("");

  // Score Correction Modal
  const [scoreCorrectionTarget, setScoreCorrectionTarget] = useState(null);
  const [newScore, setNewScore] = useState("");
  const [reasonCode, setReasonCode] = useState("TYPO_IN_KEY");
  const [justification, setJustification] = useState("");

  // Filter student attempts
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | PASSED | FAILED | CHEATING

  // Load Subjects
  const loadSubjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchSubjects(token);
      const list = Array.isArray(res?.data) ? res.data : [];
      setSubjects(list);
      if (list.length > 0) {
        setSelectedSubject(list[0]);
      }
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to load subjects" });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  // Load Analytics Data for Selected Subject
  const loadAnalytics = useCallback(async () => {
    if (!selectedSubject) return;
    try {
      const res = await fetchSubjectResults(token, selectedSubject.subject_id);
      setAnalytics(res.data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    }
  }, [token, selectedSubject]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Cheating Toggle Handler
  const handleSaveCheatingFlag = async () => {
    if (!flagModalTarget) return;
    try {
      const isCurrentlyFlagged = flagModalTarget.is_flagged_cheating === 1;
      const nextFlag = !isCurrentlyFlagged;
      await toggleCheatingFlag(token, flagModalTarget.attempt_id, nextFlag, flagReason);
      setFeedback({
        type: "success",
        message: nextFlag
          ? `Candidate ${flagModalTarget.student_name} (${flagModalTarget.register_no}) has been flagged for cheating.`
          : `Integrity violation cleared for ${flagModalTarget.student_name}.`,
      });
      setFlagModalTarget(null);
      setFlagReason("");
      loadAnalytics();
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  // Score Correction Handler
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
      loadAnalytics();
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      await exportResultsCsv(token, selectedSubject.subject_id);
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading quiz analytics and student performance data..." />;
  }

  const attempts = analytics?.attempts || [];
  const filteredAttempts = attempts.filter((a) => {
    if (statusFilter === "PASSED") return a.result === "PASSED";
    if (statusFilter === "FAILED") return a.result === "FAILED";
    if (statusFilter === "CHEATING") return a.is_flagged_cheating === 1 || a.status === "CANCELLED";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {feedback.message && (
        <Alert
          type={feedback.type}
          message={feedback.message}
          onClose={() => setFeedback({ type: "", message: "" })}
        />
      )}

      {/* HOD Department Oversight Banner */}
      {user?.is_hod && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              HOD
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Department Head Analytics & Integrity Audit
              </h3>
              <p className="text-xs text-indigo-700 mt-0.5">
                Overview of quiz performance, attendance, anti-cheat audit flags, and score modifications for all faculties and courses in your department.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block rounded-full bg-indigo-100 border border-indigo-300 px-3 py-1 text-xs font-bold text-indigo-800 shrink-0">
            {user?.department_name || user?.department || "Department Oversight"}
          </span>
        </div>
      )}

      {/* ================= Subject Selector & Export ================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {subjects.map((sub) => {
            const isSelected = selectedSubject?.subject_id === sub.subject_id;
            return (
              <button
                key={sub.subject_id}
                type="button"
                onClick={() => setSelectedSubject(sub)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <AcademicCapIcon className="h-4 w-4" />
                <span>{sub.code || sub.subject_code}</span>
                <span className="hidden sm:inline font-normal opacity-80">&bull; {sub.name}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
        >
          <ArrowDownTrayIcon className="h-4 w-4 text-emerald-700" /> Export CSV Ledger
        </button>
      </div>

      {/* ================= 4 Metric Stat Cards ================= */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Enrolled</span>
            <UserGroupIcon className="h-5 w-5 text-slate-400" />
          </div>
          <span className="mt-2 block text-2xl font-black text-slate-900">
            {analytics?.total_enrolled || 45}
          </span>
          <span className="text-[11px] text-slate-500">Registered Students</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Pass Rate</span>
            <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
          </div>
          <span className="mt-2 block text-2xl font-black text-emerald-700">
            {analytics?.pass_rate || 0}%
          </span>
          <span className="text-[11px] text-emerald-600/80">Cutoff threshold &ge; 60%</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Average Score</span>
            <ChartBarIcon className="h-5 w-5 text-slate-400" />
          </div>
          <span className="mt-2 block text-2xl font-black text-slate-900">
            {analytics?.average_percentage || 0}%
          </span>
          <span className="text-[11px] text-slate-500">Mean accuracy percentage</span>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-800">Integrity Flags</span>
            <ShieldExclamationIcon className="h-5 w-5 text-red-600" />
          </div>
          <span className="mt-2 block text-2xl font-black text-red-600">
            {analytics?.flagged_cheating_count || 0}
          </span>
          <span className="text-[11px] text-red-700/80">Cheating / window exits</span>
        </div>
      </div>

      {/* ================= Topic Completion Funnel & Question Accuracy ================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Completion Funnel */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Unit Completion Funnel</h3>
          <p className="text-xs text-slate-500">
            Tracking student progression from study materials to final passed assessments.
          </p>

          <div className="space-y-4 pt-2">
            {(analytics?.funnel || []).map((fn) => (
              <div key={fn.topic_id} className="space-y-2 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <span className="text-xs font-bold text-slate-900">{fn.topic_title}</span>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-white p-2 border border-slate-200">
                    <span className="block font-bold text-slate-900">{fn.students_enrolled}</span>
                    <span className="text-[10px] text-slate-500">Enrolled</span>
                  </div>
                  <div className="rounded-xl bg-white p-2 border border-slate-200">
                    <span className="block font-bold text-emerald-700">{fn.students_started_materials}</span>
                    <span className="text-[10px] text-slate-500">Materials</span>
                  </div>
                  <div className="rounded-xl bg-white p-2 border border-slate-200">
                    <span className="block font-bold text-slate-800">{fn.students_attempted_quiz}</span>
                    <span className="text-[10px] text-slate-500">Attempted</span>
                  </div>
                  <div className="rounded-xl bg-white p-2 border border-slate-200">
                    <span className="block font-bold text-emerald-800">{fn.students_passed_quiz}</span>
                    <span className="text-[10px] text-slate-500">Passed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Question Correctness Breakdown */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Question Accuracy & Item Discrimination</h3>
          <p className="text-xs text-slate-500">
            Per-question accuracy rates to detect ambiguous or difficult questions.
          </p>

          <div className="space-y-3 pt-2 max-h-[360px] overflow-y-auto pr-1">
            {(analytics?.question_accuracy || []).map((q) => (
              <div key={q.question_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate max-w-xs">{q.text}</span>
                  <span
                    className={`font-mono font-bold text-xs ${
                      q.accuracy_percentage >= 70
                        ? "text-emerald-700"
                        : q.accuracy_percentage >= 50
                        ? "text-amber-700"
                        : "text-rose-700"
                    }`}
                  >
                    {q.accuracy_percentage}% Accuracy
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full ${
                      q.accuracy_percentage >= 70
                        ? "bg-emerald-600"
                        : q.accuracy_percentage >= 50
                        ? "bg-amber-500"
                        : "bg-rose-600"
                    }`}
                    style={{ width: `${q.accuracy_percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Type: {q.type} &bull; Difficulty: {q.difficulty}</span>
                  <span>{q.total_answers} submissions evaluated</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= All Student Scores & Cheating Flags Table ================= */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Student Quiz Sittings & Score Registry</h3>
            <p className="text-xs text-slate-500">
              Complete class attempts with real-time academic integrity flags and manual score corrections.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
              }`}
            >
              All ({attempts.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("PASSED")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === "PASSED" ? "bg-emerald-700 text-white shadow-xs" : "text-slate-600"
              }`}
            >
              Passed
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("FAILED")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === "FAILED" ? "bg-amber-600 text-white shadow-xs" : "text-slate-600"
              }`}
            >
              Failed
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("CHEATING")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === "CHEATING" ? "bg-red-700 text-white shadow-xs" : "text-slate-600"
              }`}
            >
              Cheating Flagged ({analytics?.flagged_cheating_count || 0})
            </button>
          </div>
        </div>

        {/* Attempts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Register No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Attempt #</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Percentage</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Integrity Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAttempts.map((att) => {
                const isCheating = att.is_flagged_cheating === 1 || att.status === "CANCELLED";

                return (
                  <tr
                    key={att.attempt_id}
                    className={`transition hover:bg-slate-50/70 ${isCheating ? "bg-red-50/40" : ""}`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{att.register_no}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{att.student_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">#{att.attempt_number}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {att.score !== null ? `${att.score} / ${att.max_score}` : "—"}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {att.percentage !== null ? `${att.percentage}%` : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          att.result === "PASSED"
                            ? "bg-emerald-100 text-emerald-800"
                            : isCheating
                            ? "bg-red-100 text-red-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {isCheating ? "DISQUALIFIED" : att.result || att.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {isCheating ? (
                        <div className="flex items-center gap-1.5 text-red-700 font-bold">
                          <ShieldExclamationIcon className="h-4 w-4 shrink-0" />
                          <span className="truncate max-w-[140px]" title={att.cheating_reason || "Flagged for Cheating"}>
                            {att.cheating_reason || "Cheating Detected"}
                          </span>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                          Verified Normal Sitting
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {/* Flag as cheating button */}
                      <button
                        type="button"
                        onClick={() => {
                          setFlagModalTarget(att);
                          setFlagReason(att.cheating_reason || "Screen exit / communication observed during quiz");
                        }}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                          isCheating
                            ? "bg-red-100 text-red-900 border border-red-300 hover:bg-red-200"
                            : "border border-slate-300 text-slate-600 hover:bg-slate-100"
                        }`}
                        title={isCheating ? "Manage Cheating Flag" : "Flag Candidate as Cheating"}
                      >
                        {isCheating ? "Flagged ✕" : "Flag Cheat"}
                      </button>

                      {/* Manual score correction button */}
                      <button
                        type="button"
                        onClick={() => {
                          setScoreCorrectionTarget(att);
                          setNewScore(String(att.score || 0));
                          setJustification("");
                        }}
                        className="rounded-lg border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-100"
                        title="Score Correction with Audit Trail"
                      >
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: Flag Cheating ================= */}
      <Modal
        isOpen={Boolean(flagModalTarget)}
        onClose={() => setFlagModalTarget(null)}
        title="Academic Integrity: Cheating Flag Management"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-3 text-red-900 border border-red-200">
            <ShieldExclamationIcon className="h-8 w-8 text-red-600 shrink-0" />
            <div>
              <h4 className="font-bold text-xs">
                Candidate: {flagModalTarget?.student_name} ({flagModalTarget?.register_no})
              </h4>
              <p className="text-[11px] text-red-800">
                Current status:{" "}
                {flagModalTarget?.is_flagged_cheating ? "FLAGGED AS CHEATING" : "NORMAL SITTING"}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Integrity Violation Justification</label>
            <textarea
              rows={3}
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="e.g. Switched browser tabs, left exam viewport, or external collaboration detected."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
            />
          </div>

          <p className="text-[11px] text-slate-500">
            Flagging candidate disqualifies the attempt, marks score as 0, and records the event in the audit trail.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setFlagModalTarget(null)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveCheatingFlag}
              className={`rounded-xl px-5 py-2 text-xs font-bold text-white shadow-xs ${
                flagModalTarget?.is_flagged_cheating ? "bg-slate-900 hover:bg-black" : "bg-red-700 hover:bg-red-800"
              }`}
            >
              {flagModalTarget?.is_flagged_cheating ? "Remove Cheating Flag" : "Confirm Flag as Cheating"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: Manual Score Correction ================= */}
      <Modal
        isOpen={Boolean(scoreCorrectionTarget)}
        onClose={() => setScoreCorrectionTarget(null)}
        title="Manual Score Correction (Audit Ledger)"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-50 p-3 text-xs border border-slate-200">
            <span className="font-bold text-slate-800">Student:</span> {scoreCorrectionTarget?.student_name} (
            {scoreCorrectionTarget?.register_no}) &bull; Current Score: {scoreCorrectionTarget?.score} /{" "}
            {scoreCorrectionTarget?.max_score}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">New Score (Numeric)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max={scoreCorrectionTarget?.max_score || 100}
              value={newScore}
              onChange={(e) => setNewScore(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Reason Code</label>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
            >
              <option value="TYPO_IN_KEY">Typo in Question Answer Key</option>
              <option value="TECHNICAL_GLITCH">Network / Browser Disconnect</option>
              <option value="ALTERNATIVE_VALID_ANSWER">Alternative Interpretation Accepted</option>
              <option value="HOD_DIRECTIVE">HOD Score Correction Directive</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Audit Justification</label>
            <textarea
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Detailed justification recorded into append-only immutable ledger..."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setScoreCorrectionTarget(null)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveScoreCorrection}
              className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
            >
              Commit Correction
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
