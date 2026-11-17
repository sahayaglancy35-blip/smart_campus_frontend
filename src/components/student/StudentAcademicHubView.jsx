import { useState, useEffect, useCallback } from "react";
import {
  fetchSubjects,
  fetchSubjectTopics,
  fetchTopicMaterials,
  fetchTopicQuiz,
  fetchMyAttemptResult,
  fetchQuizStatus,
  updateMaterialProgress,
  startQuizAttempt,
} from "../../api/academic";
import { fmtDateTime } from "../../utils/datetime";
import MaterialViewerModal from "../academic/MaterialViewerModal";
import QuizAttemptView from "../academic/QuizAttemptView";
import QuizResultView from "../academic/QuizResultView";
import LoadingSpinner from "../common/LoadingSpinner";
import Alert from "../common/Alert";
import {
  AcademicCapIcon,
  BookOpenIcon,
  DocumentTextIcon,
  PlayIcon,
  PresentationChartBarIcon,
  CheckCircleIcon,
  LockClosedIcon,
  ClockIcon,
  ChevronRightIcon,
  ShieldExclamationIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const STATUS_LABEL = {
  OPEN: "Quiz Unlocked & Open",
  IN_PROGRESS: "Sitting In Progress",
  LOCKED: "Quiz Locked",
  COMPLETED: "Quiz Completed",
  MISSED: "Quiz Window Closed",
  DISQUALIFIED: "Disqualified",
  HIDDEN: "Hidden",
};

export default function StudentAcademicHubView({ token, initialSubjectId = null }) {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [myAttempt, setMyAttempt] = useState(null);
  const [serverQuizStatus, setServerQuizStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals & active quiz flow state
  const [viewingMaterial, setViewingMaterial] = useState(null);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [integrityAlert, setIntegrityAlert] = useState("");

  // Reactive refresh triggers
  const [refreshTopicsKey] = useState(0);
  const [refreshDetailsKey, setRefreshDetailsKey] = useState(0);

  const reloadTopicDetails = useCallback(() => setRefreshDetailsKey((k) => k + 1), []);

  // -------------------------------------------------------------
  // Data Fetching: Subjects on Mount
  // -------------------------------------------------------------
  useEffect(() => {
    let active = true;
    async function loadInitialSubjects() {
      try {
        const res = await fetchSubjects(token);
        if (!active) return;
        const subs = Array.isArray(res?.data) ? res.data : [];
        setSubjects(subs);

        if (subs.length > 0) {
          const found = initialSubjectId
            ? subs.find((s) => String(s.subject_id) === String(initialSubjectId)) || subs[0]
            : subs[0];
          setSelectedSubject(found);
        }
      } catch (err) {
        if (active) setError(err.message || "Failed to load academic subjects");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadInitialSubjects();
    return () => {
      active = false;
    };
  }, [token, initialSubjectId]);

  // -------------------------------------------------------------
  // Data Fetching: Topics for Selected Subject
  // -------------------------------------------------------------
  useEffect(() => {
    if (!selectedSubject?.subject_id) return;
    let active = true;
    fetchSubjectTopics(token, selectedSubject.subject_id)
      .then((res) => {
        if (!active) return;
        const topicList = Array.isArray(res?.data) ? res.data : [];
        setTopics(topicList);
        if (topicList.length > 0) {
          setSelectedTopic(topicList[0]);
        } else {
          setSelectedTopic(null);
          setMaterials([]);
          setQuiz(null);
          setMyAttempt(null);
          setServerQuizStatus(null);
        }
      })
      .catch((err) => {
        if (active) setError(err.message || "Failed to load topics");
      });
    return () => {
      active = false;
    };
  }, [token, selectedSubject, refreshTopicsKey]);

  // -------------------------------------------------------------
  // Data Fetching: Topic Materials, Quiz, and Authoritative Unlock Status
  // -------------------------------------------------------------
  useEffect(() => {
    if (!selectedTopic?.topic_id) return;
    let active = true;

    Promise.all([
      fetchTopicMaterials(token, selectedTopic.topic_id),
      fetchTopicQuiz(token, selectedTopic.topic_id),
    ])
      .then(async ([matRes, quizRes]) => {
        if (!active) return;
        const mats = Array.isArray(matRes?.data) ? matRes.data : [];
        setMaterials(mats);

        const q = quizRes?.data || null;
        setQuiz(q);

        if (q && q.status === "Published") {
          try {
            const [attRes, statusRes] = await Promise.all([
              fetchMyAttemptResult(token, q.quiz_id).catch(() => null),
              fetchQuizStatus(token, q.quiz_id).catch(() => null),
            ]);
            if (!active) return;
            setMyAttempt(attRes?.data || null);
            setServerQuizStatus(statusRes?.data || null);
          } catch (e) {
            console.warn("Could not load attempt/status details:", e.message);
          }
        } else {
          setMyAttempt(null);
          setServerQuizStatus(null);
        }
      })
      .catch((err) => {
        if (active) setError(err.message || "Failed to load topic details");
      });

    return () => {
      active = false;
    };
  }, [token, selectedTopic, refreshDetailsKey]);

  // Material completion: save on the server, then reload so the server stays source of truth
  const handleMaterialComplete = async (materialId, percent = 100) => {
    await updateMaterialProgress(token, materialId, percent);
    reloadTopicDetails();
  };

  // -------------------------------------------------------------
  // Authoritative Server-Driven Quiz Status Evaluation
  // -------------------------------------------------------------
  let computedQuizStatus = { status: "HIDDEN", reason: "" };

  if (quiz && quiz.status === "Published" && selectedTopic?.quiz_enabled) {
    if (myAttempt && (myAttempt.status === "CANCELLED" || myAttempt.is_flagged_cheating)) {
      computedQuizStatus = {
        status: "DISQUALIFIED",
        reason:
          "Your attempt was terminated for leaving the quiz screen or an integrity violation. Further retakes are prohibited.",
      };
    } else if (serverQuizStatus?.active_attempt) {
      const remainingMins = Math.floor(serverQuizStatus.active_attempt.remaining_seconds / 60);
      const remainingSecs = serverQuizStatus.active_attempt.remaining_seconds % 60;
      computedQuizStatus = {
        status: "IN_PROGRESS",
        reason: `Active exam sitting in progress! Time remaining: ${remainingMins}m ${remainingSecs}s`,
        active_attempt: serverQuizStatus.active_attempt,
      };
    } else if (serverQuizStatus?.is_unlocked) {
      computedQuizStatus = {
        status: "OPEN",
        reason: `All prerequisites met. Ready for assessment sitting. Remaining attempts: ${serverQuizStatus.remaining_attempts}`,
      };
    } else if (serverQuizStatus) {
      if (serverQuizStatus.remaining_attempts === 0 && myAttempt) {
        computedQuizStatus = {
          status: "COMPLETED",
          reason: `Assessment completed. Score: ${myAttempt.score} / ${myAttempt.max_score} (${myAttempt.percentage}%)`,
        };
      } else {
        const lockMsg =
          serverQuizStatus.lock_reasons && serverQuizStatus.lock_reasons.length > 0
            ? serverQuizStatus.lock_reasons[0]
            : "Quiz is currently locked.";
        const isClosed = !serverQuizStatus.is_window_open && lockMsg.toLowerCase().includes("closed");
        computedQuizStatus = {
          status: isClosed ? "MISSED" : "LOCKED",
          reason: lockMsg,
          missing: serverQuizStatus.incomplete_required_materials || [],
        };
      }
    }
  }

  // Start / Resume Quiz Attempt
  const handleStartQuiz = async () => {
    if (!quiz) return;
    try {
      setError("");
      setIntegrityAlert("");
      document.documentElement.requestFullscreen?.().catch(() => {});
      const res = await startQuizAttempt(token, quiz.quiz_id);
      if (res?.success && res.data) {
        setActiveAttempt(res.data);
        setResultData(null);
      }
    } catch (err) {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      if (err.code === "INTEGRITY_VIOLATION" || /integrity|violation|disqualif/i.test(err.message)) {
        setIntegrityAlert(err.message);
      } else {
        setError(err.message || "Failed to start quiz attempt");
      }
      reloadTopicDetails();
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading course study materials and quizzes..." />;
  }

  // Active quiz screen
  if (activeAttempt) {
    return (
      <QuizAttemptView
        token={token}
        attemptData={activeAttempt}
        onFinished={(data) => {
          setActiveAttempt(null);
          setResultData(data);
          reloadTopicDetails();
        }}
        onViolated={(reason) => {
          setActiveAttempt(null);
          setIntegrityAlert(`Academic Integrity Violation: ${reason}. Quiz attempt has been terminated.`);
          reloadTopicDetails();
        }}
      />
    );
  }

  // Result screen
  if (resultData) {
    return (
      <QuizResultView
        resultData={resultData}
        onReturnToTopic={() => setResultData(null)}
        onRetry={resultData?.remediation?.retry_allowed ? handleStartQuiz : null}
        onOpenMaterial={(mat) => {
          setResultData(null);
          setViewingMaterial(mat);
        }}
      />
    );
  }

  const completedCount = materials.filter((m) => m.user_progress?.status === "COMPLETED").length;
  const totalCount = materials.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const qStatus = computedQuizStatus.status;

  return (
    <div className="space-y-7">
      {/* ================= Error / Integrity Banner ================= */}
      {integrityAlert && (
        <div className="rounded-2xl border-2 border-red-500 bg-red-50 p-4 shadow-sm flex items-start gap-3">
          <ShieldExclamationIcon className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-red-900">Academic Integrity Restriction</h4>
            <p className="text-xs text-red-800 mt-0.5">{integrityAlert}</p>
          </div>
        </div>
      )}

      {error && <Alert type="error" message={error} onClose={() => setError("")} />}

      {/* ================= Subject Selector Tabs ================= */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {subjects.length === 0 && (
          <p className="text-xs text-slate-500">You are not enrolled in any subject yet.</p>
        )}
        {subjects.map((sub) => {
          const isSelected = selectedSubject?.subject_id === sub.subject_id;
          return (
            <button
              key={sub.subject_id}
              type="button"
              onClick={() => setSelectedSubject(sub)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                isSelected
                  ? "bg-emerald-800 text-white shadow-xs"
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

      {/* ================= Main Split Stage: Topics & Content ================= */}
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-4">
        {/* Left Topics Nav */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Course Topics & Units
          </h3>
          <div className="space-y-1.5">
            {topics.map((t) => {
              const isSelected = selectedTopic?.topic_id === t.topic_id;
              return (
                <button
                  key={t.topic_id}
                  type="button"
                  onClick={() => setSelectedTopic(t)}
                  className={`w-full text-left rounded-2xl p-3.5 transition flex items-center justify-between gap-2 border ${
                    isSelected
                      ? "bg-white border-emerald-600 shadow-sm ring-1 ring-emerald-600/30 text-emerald-950 font-bold"
                      : "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-white"
                  }`}
                >
                  <div className="truncate">
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-emerald-800">
                      Unit {t.position}
                    </span>
                    <span className="block text-xs leading-snug truncate mt-0.5">{t.title}</span>
                  </div>
                  <ChevronRightIcon
                    className={`h-4 w-4 shrink-0 ${isSelected ? "text-emerald-700" : "text-slate-400"}`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Stage: Topic Materials & Quiz Card */}
        <div className="lg:col-span-3 space-y-6">
          {selectedTopic ? (
            <>
              {/* Topic Header Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 font-mono">
                      Unit {selectedTopic.position}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 mt-1">{selectedTopic.title}</h2>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      {selectedTopic.description}
                    </p>
                  </div>

                  {/* Progress tracker badge */}
                  <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 border border-slate-200 shrink-0">
                    <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                      {progressPercent}%
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-800">
                        {completedCount} of {totalCount} completed
                      </span>
                      <span className="block text-[11px] text-slate-500">Prerequisite progress</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Study Materials List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <BookOpenIcon className="h-4 w-4 text-emerald-800" />
                    Topic Study Materials & Courseware
                  </h3>
                  <span className="text-xs text-slate-500">
                    {materials.length} resource{materials.length === 1 ? "" : "s"}
                  </span>
                </div>

                {materials.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                    No published study materials available for this unit yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {materials.map((mat) => {
                      const isComplete = mat.user_progress?.status === "COMPLETED";

                      let Icon = DocumentTextIcon;
                      if (mat.type === "Video") Icon = PlayIcon;
                      if (mat.type === "Slide") Icon = PresentationChartBarIcon;

                      return (
                        <div
                          key={mat.material_id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-emerald-300 hover:shadow-md"
                        >
                          <div className="flex items-start gap-3.5">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs ${
                                isComplete
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              <Icon className="h-6 w-6" />
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    mat.required_flag
                                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {mat.required_flag ? "★ Required" : "Optional"}
                                </span>
                                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                                  {mat.type}
                                </span>
                                <span className="text-[11px] text-slate-400">v{mat.version}</span>
                              </div>

                              <h4 className="text-sm font-bold text-slate-900 mt-1">{mat.title}</h4>
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                {mat.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 sm:self-center">
                            {isComplete ? (
                              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                                <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                                Completed
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                <ClockIcon className="h-4 w-4 text-slate-400" />
                                Pending
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => setViewingMaterial(mat)}
                              className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-black transition shadow-xs"
                            >
                              Open Viewer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* End-of-Topic Quiz Card: Authoritative State Engine */}
              {qStatus !== "HIDDEN" && (
                <div
                  className={`rounded-3xl border p-6 shadow-sm transition ${
                    qStatus === "OPEN" || qStatus === "IN_PROGRESS"
                      ? "border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-green-50"
                      : qStatus === "DISQUALIFIED"
                      ? "border-red-300 bg-red-50/60"
                      : "border-slate-200 bg-slate-50/60"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
                          qStatus === "OPEN" || qStatus === "IN_PROGRESS" || qStatus === "COMPLETED"
                            ? "bg-emerald-600 text-white"
                            : qStatus === "DISQUALIFIED"
                            ? "bg-red-600 text-white"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {qStatus === "OPEN" || qStatus === "IN_PROGRESS" || qStatus === "COMPLETED" ? (
                          <AcademicCapIcon className="h-7 w-7" />
                        ) : qStatus === "DISQUALIFIED" ? (
                          <ShieldExclamationIcon className="h-6 w-6" />
                        ) : (
                          <LockClosedIcon className="h-6 w-6" />
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              qStatus === "OPEN" || qStatus === "IN_PROGRESS" || qStatus === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-800"
                                : qStatus === "DISQUALIFIED"
                                ? "bg-red-100 text-red-800"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {STATUS_LABEL[qStatus]}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            {quiz.time_limit} mins &bull; Cutoff: {quiz.pass_mark}%
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mt-1">{quiz.title}</h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {quiz.description || "End-of-unit comprehensive knowledge evaluation."}
                        </p>
                        {(quiz.open_at || quiz.close_at) && (
                          <p className="mt-1 text-[11px] text-slate-500">
                            Scheduled Window: {fmtDateTime(quiz.open_at)} to {fmtDateTime(quiz.close_at)}
                          </p>
                        )}

                        {/* Reason / diagnostics line */}
                        <div className="mt-2 text-xs">
                          {qStatus === "OPEN" ? (
                            <span className="font-semibold text-emerald-700">
                              ✓ Prerequisites completed. You may begin your sitting.
                            </span>
                          ) : qStatus === "IN_PROGRESS" ? (
                            <span className="font-semibold text-indigo-700 flex items-center gap-1">
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                              {computedQuizStatus.reason}
                            </span>
                          ) : (
                            <span
                              className={`font-semibold flex items-center gap-1 ${
                                qStatus === "COMPLETED"
                                  ? "text-emerald-800"
                                  : qStatus === "DISQUALIFIED"
                                  ? "text-red-800"
                                  : "text-amber-800"
                              }`}
                            >
                              <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
                              {computedQuizStatus.reason}
                            </span>
                          )}
                        </div>

                        {/* Incomplete Required Materials Alert */}
                        {computedQuizStatus.missing && computedQuizStatus.missing.length > 0 && (
                          <div className="mt-2 text-[11px] text-amber-900 bg-amber-100/70 p-2.5 rounded-xl border border-amber-300/80">
                            <span className="font-bold">Required items to complete:</span>
                            <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                              {computedQuizStatus.missing.map((m) => (
                                <li key={m.material_id}>
                                  {m.title} ({m.type})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="sm:self-center">
                      {qStatus === "OPEN" ? (
                        <button
                          type="button"
                          onClick={handleStartQuiz}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-800 transition"
                        >
                          <AcademicCapIcon className="h-4 w-4" />
                          Start Quiz Sitting
                        </button>
                      ) : qStatus === "IN_PROGRESS" ? (
                        <button
                          type="button"
                          onClick={handleStartQuiz}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-indigo-800 transition animate-pulse"
                        >
                          <ArrowPathIcon className="h-4 w-4" />
                          Resume Sitting
                        </button>
                      ) : qStatus === "COMPLETED" ? (
                        <button
                          type="button"
                          onClick={() => setResultData(myAttempt)}
                          className="w-full sm:w-auto rounded-xl bg-slate-900 px-6 py-3 text-xs font-bold text-white hover:bg-black transition"
                        >
                          View My Score
                        </button>
                      ) : (
                        <span className="inline-block rounded-xl border border-slate-200 bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-500">
                          {qStatus === "MISSED"
                            ? "Closed"
                            : qStatus === "DISQUALIFIED"
                            ? "Disqualified"
                            : "Locked"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 text-sm">
              Please select a unit topic to view study materials and quizzes.
            </div>
          )}
        </div>
      </div>

      {/* Material In-Page Viewer Modal */}
      <MaterialViewerModal
        isOpen={Boolean(viewingMaterial)}
        onClose={() => setViewingMaterial(null)}
        material={viewingMaterial}
        onComplete={handleMaterialComplete}
        token={token}
      />
    </div>
  );
}
