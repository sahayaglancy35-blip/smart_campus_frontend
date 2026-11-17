import { useState, useEffect, useCallback } from "react";
import {
  fetchSubjectResults,
  exportResultsCsv,
  toggleCheatingFlag,
  correctAttemptScore,
} from "../../api/academic";
import { CoursePicker } from "../academic/AcademicShared";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  ShieldExclamationIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";

// The server may send 1/0 or true/false
const isFlagged = (a) => a.is_flagged_cheating === 1 || a.is_flagged_cheating === true || a.status === "CANCELLED";
const num = (v) => (v === null || v === undefined ? "-" : v);

/** Analytics for ONE opened course (CoursePicker shows the course list first). */
function AnalyticsWorkspace({ token, user, subject, header }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Cheating flag modal
  const [flagModalTarget, setFlagModalTarget] = useState(null);
  const [flagReason, setFlagReason] = useState("");

  // Score correction modal
  const [scoreCorrectionTarget, setScoreCorrectionTarget] = useState(null);
  const [newScore, setNewScore] = useState("");
  const [reasonCode, setReasonCode] = useState("TYPO_IN_KEY");
  const [justification, setJustification] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | PASSED | FAILED | CHEATING

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchSubjectResults(token, subject.subject_id);
      setAnalytics(res.data || null);
    } catch (err) {
      setAnalytics(null);
      setFeedback({ type: "error", message: err.message || "Failed to load quiz analytics" });
    } finally {
      setLoading(false);
    }
  }, [token, subject]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleSaveCheatingFlag = async () => {
    if (!flagModalTarget) return;
    try {
      const nextFlag = !isFlagged(flagModalTarget);
      await toggleCheatingFlag(token, flagModalTarget.attempt_id, nextFlag, flagReason);
      setFeedback({
        type: "success",
        message: nextFlag
          ? `${flagModalTarget.student_name} (${flagModalTarget.register_no}) has been flagged for cheating.`
          : `Integrity flag cleared for ${flagModalTarget.student_name}.`,
      });
      setFlagModalTarget(null);
      setFlagReason("");
      loadAnalytics();
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  const handleSaveScoreCorrection = async () => {
    if (!scoreCorrectionTarget) return;
    if (newScore === "" || isNaN(parseFloat(newScore))) {
      return setFeedback({ type: "error", message: "Please enter a valid numeric score" });
    }
    if (!justification.trim()) {
      return setFeedback({ type: "error", message: "Please enter a justification for the audit log" });
    }
    try {
      await correctAttemptScore(token, scoreCorrectionTarget.attempt_id, newScore, reasonCode, justification);
      setFeedback({
        type: "success",
        message: `Score updated for ${scoreCorrectionTarget.student_name}. Recorded in the audit trail.`,
      });
      setScoreCorrectionTarget(null);
      setNewScore("");
      setJustification("");
      loadAnalytics();
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    }
  };

  const handleExportCsv = async () => {
    try {
      await exportResultsCsv(token, subject.subject_id);
    } catch (err) {
      setFeedback({ type: "error", message: "Export failed: " + err.message });
    }
  };

  const attempts = analytics?.attempts || [];
  const filteredAttempts = attempts.filter((a) => {
    if (statusFilter === "PASSED") return a.result === "PASSED";
    if (statusFilter === "FAILED") return a.result === "FAILED";
    if (statusFilter === "CHEATING") return isFlagged(a);
    return true;
  });

  return (
    <div className="space-y-6">
      {feedback.message && (
        <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback({ type: "", message: "" })} />
      )}

      {/* The opened course header (only this course is shown) */}
      {header}

      {user?.is_hod && (
        <div className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-700 text-xs font-bold text-white shadow-xs">
              HOD
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Department Head Analytics & Integrity Audit
              </h3>
              <p className="mt-0.5 text-xs text-indigo-700">
                Quiz performance, anti-cheat flags and score changes for this course in your department.
              </p>
            </div>
          </div>
          <span className="hidden shrink-0 rounded-full border border-indigo-300 bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800 sm:inline-block">
            {user?.department_name || user?.department || "Department Oversight"}
          </span>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
        >
          <ArrowDownTrayIcon className="h-4 w-4 text-emerald-700" /> Export CSV Ledger
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading quiz analytics and student performance data..." />
      ) : !analytics ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          No analytics are available for this course yet.
        </div>
      ) : (
        <>
          {/* ================= Metric cards (real values from the database) ================= */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Enrolled</span>
                <UserGroupIcon className="h-5 w-5 text-slate-400" />
              </div>
              <span className="mt-2 block text-2xl font-black text-slate-900">{num(analytics.total_enrolled)}</span>
              <span className="text-[11px] text-slate-500">Registered students</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Pass Rate</span>
                <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="mt-2 block text-2xl font-black text-emerald-700">
                {analytics.pass_rate == null ? "-" : `${analytics.pass_rate}%`}
              </span>
              <span className="text-[11px] text-emerald-600/80">Of submitted attempts</span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Average Score</span>
                <ChartBarIcon className="h-5 w-5 text-slate-400" />
              </div>
              <span className="mt-2 block text-2xl font-black text-slate-900">
                {analytics.average_percentage == null ? "-" : `${analytics.average_percentage}%`}
              </span>
              <span className="text-[11px] text-slate-500">Mean accuracy</span>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-red-800">Integrity Flags</span>
                <ShieldExclamationIcon className="h-5 w-5 text-red-600" />
              </div>
              <span className="mt-2 block text-2xl font-black text-red-600">{analytics.flagged_cheating_count ?? 0}</span>
              <span className="text-[11px] text-red-700/80">Cheating / left the quiz screen</span>
            </div>
          </div>

          {/* ================= Funnel & question accuracy ================= */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">Unit Completion Funnel</h3>
              <p className="text-xs text-slate-500">From study materials to passed assessments, per unit.</p>

              {(analytics.funnel || []).length === 0 && <p className="text-xs text-slate-400">No units yet.</p>}
              <div className="space-y-4 pt-2">
                {(analytics.funnel || []).map((fn) => (
                  <div key={fn.topic_id} className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <span className="text-xs font-bold text-slate-900">{fn.topic_title}</span>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      {[
                        ["Enrolled", fn.students_enrolled, "text-slate-900"],
                        ["Materials", fn.students_started_materials, "text-emerald-700"],
                        ["Attempted", fn.students_attempted_quiz, "text-slate-800"],
                        ["Passed", fn.students_passed_quiz, "text-emerald-800"],
                      ].map(([label, value, color]) => (
                        <div key={label} className="rounded-xl border border-slate-200 bg-white p-2">
                          <span className={`block font-bold ${color}`}>{num(value)}</span>
                          <span className="text-[10px] text-slate-500">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">Question Accuracy</h3>
              <p className="text-xs text-slate-500">Per-question accuracy to spot ambiguous or mis-keyed questions.</p>

              {(analytics.question_accuracy || []).length === 0 && (
                <p className="text-xs text-slate-400">No submissions have been evaluated yet.</p>
              )}
              <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1 pt-2">
                {(analytics.question_accuracy || []).map((q) => {
                  const acc = q.accuracy_percentage ?? 0;
                  return (
                    <div key={q.question_id} className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="max-w-xs truncate font-bold text-slate-900">{q.text}</span>
                        <span className={`font-mono text-xs font-bold ${acc >= 70 ? "text-emerald-700" : acc >= 50 ? "text-amber-700" : "text-rose-700"}`}>
                          {acc}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full ${acc >= 70 ? "bg-emerald-600" : acc >= 50 ? "bg-amber-500" : "bg-rose-600"}`}
                          style={{ width: `${acc}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>
                          {q.type} &bull; {q.difficulty}
                        </span>
                        <span>{q.total_answers ?? 0} answers</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ================= Student scores & integrity table ================= */}
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Student Quiz Sittings & Score Registry</h3>
                <p className="text-xs text-slate-500">
                  Every attempt with its integrity status. Flag cheating or correct a score (logged in the audit trail).
                </p>
              </div>

              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                {[
                  ["ALL", `All (${attempts.length})`, "bg-white text-slate-900 shadow-xs"],
                  ["PASSED", "Passed", "bg-emerald-700 text-white shadow-xs"],
                  ["FAILED", "Failed", "bg-amber-600 text-white shadow-xs"],
                  ["CHEATING", `Cheating Flagged (${analytics.flagged_cheating_count ?? 0})`, "bg-red-700 text-white shadow-xs"],
                ].map(([key, label, active]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    className={`rounded-lg px-3 py-1.5 transition ${statusFilter === key ? active : "text-slate-600"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {filteredAttempts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                No attempts match this filter.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Register No</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Attempt #</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Percentage</th>
                      <th className="px-4 py-3">Result</th>
                      <th className="px-4 py-3">Integrity Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAttempts.map((att) => {
                      const cheating = isFlagged(att);
                      return (
                        <tr key={att.attempt_id} className={`transition hover:bg-slate-50/70 ${cheating ? "bg-red-50/40" : ""}`}>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">{att.register_no}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{att.student_name}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">#{att.attempt_number}</td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">
                            {att.score !== null && att.score !== undefined ? `${att.score} / ${att.max_score}` : "-"}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold">
                            {att.percentage !== null && att.percentage !== undefined ? `${att.percentage}%` : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                att.result === "PASSED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : cheating
                                  ? "bg-red-100 text-red-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {cheating ? "DISQUALIFIED" : att.result || att.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {cheating ? (
                              <div className="flex items-center gap-1.5 font-bold text-red-700">
                                <ShieldExclamationIcon className="h-4 w-4 shrink-0" />
                                <span className="max-w-[160px] truncate" title={att.cheating_reason || "Flagged for cheating"}>
                                  {att.cheating_reason || "Cheating detected"}
                                </span>
                              </div>
                            ) : (
                              <span className="flex items-center gap-1 font-medium text-emerald-700">
                                <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                                Normal sitting
                              </span>
                            )}
                          </td>
                          <td className="space-x-2 px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setFlagModalTarget(att);
                                setFlagReason(att.cheating_reason || "Left the exam screen / switched tabs during the quiz");
                              }}
                              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                cheating
                                  ? "border border-red-300 bg-red-100 text-red-900 hover:bg-red-200"
                                  : "border border-slate-300 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              {cheating ? "Flagged" : "Flag Cheat"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setScoreCorrectionTarget(att);
                                setNewScore(String(att.score ?? 0));
                                setJustification("");
                              }}
                              className="rounded-lg border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-100"
                              title="Correct score (audit logged)"
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
            )}
          </div>
        </>
      )}

      {/* ================= MODAL: Flag cheating ================= */}
      <Modal
        isOpen={Boolean(flagModalTarget)}
        onClose={() => setFlagModalTarget(null)}
        title="Academic Integrity: Cheating Flag"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-red-900">
            <ShieldExclamationIcon className="h-8 w-8 shrink-0 text-red-600" />
            <div>
              <h4 className="text-xs font-bold">
                Candidate: {flagModalTarget?.student_name} ({flagModalTarget?.register_no})
              </h4>
              <p className="text-[11px] text-red-800">
                Current status: {flagModalTarget && isFlagged(flagModalTarget) ? "FLAGGED AS CHEATING" : "NORMAL SITTING"}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Reason</label>
            <textarea
              rows={3}
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="e.g. Switched browser tabs, left the exam screen, or external help observed."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
            />
          </div>

          <p className="text-[11px] text-slate-500">
            Flagging disqualifies the attempt, sets the score to 0 and records the event in the audit trail.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setFlagModalTarget(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveCheatingFlag}
              className={`rounded-xl px-5 py-2 text-xs font-bold text-white shadow-xs ${
                flagModalTarget && isFlagged(flagModalTarget) ? "bg-slate-900 hover:bg-black" : "bg-red-700 hover:bg-red-800"
              }`}
            >
              {flagModalTarget && isFlagged(flagModalTarget) ? "Remove Cheating Flag" : "Confirm Flag as Cheating"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: Manual score correction ================= */}
      <Modal
        isOpen={Boolean(scoreCorrectionTarget)}
        onClose={() => setScoreCorrectionTarget(null)}
        title="Manual Score Correction (Audit Ledger)"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <span className="font-bold text-slate-800">Student:</span> {scoreCorrectionTarget?.student_name} (
            {scoreCorrectionTarget?.register_no}) &bull; Current score: {scoreCorrectionTarget?.score} /{" "}
            {scoreCorrectionTarget?.max_score}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">New Score</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max={scoreCorrectionTarget?.max_score || 100}
              value={newScore}
              onChange={(e) => setNewScore(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Reason Code</label>
            <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium">
              <option value="TYPO_IN_KEY">Typo in question answer key</option>
              <option value="TECHNICAL_GLITCH">Network / browser disconnect</option>
              <option value="ALTERNATIVE_VALID_ANSWER">Alternative interpretation accepted</option>
              <option value="HOD_DIRECTIVE">HOD score correction directive</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Audit Justification</label>
            <textarea
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Recorded in the append-only audit ledger..."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setScoreCorrectionTarget(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">
              Cancel
            </button>
            <button type="button" onClick={handleSaveScoreCorrection} className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800">
              Commit Correction
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function FacultyQuizAnalyticsView({ token, user }) {
  return (
    <CoursePicker
      token={token}
      heading={user?.is_hod ? "Department Quiz Results" : "Quiz Results & Integrity"}
      subheading="Choose a course to see its quiz scores, analytics and cheating flags."
      emptyText="No courses are assigned to you yet."
    >
      {(subject, header) => (
        <AnalyticsWorkspace key={subject.subject_id} token={token} user={user} subject={subject} header={header} />
      )}
    </CoursePicker>
  );
}