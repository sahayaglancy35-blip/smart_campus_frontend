import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import ErrorBoundary from "../common/ErrorBoundary";
import { SubjectExplorer } from "./SubjectExplorer";
import {
  AcademicCapIcon,
  BookOpenIcon,
  DocumentTextIcon,
  PlayIcon,
  PresentationChartBarIcon,
  CheckCircleIcon,
  LockClosedIcon,
  ClockIcon,
  ShieldExclamationIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  FolderIcon,
  UserIcon,
  XMarkIcon,
  CheckBadgeIcon,
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
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [error, setError] = useState("");

  // Modals & active quiz flow state
  const [viewingMaterial, setViewingMaterial] = useState(null);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [integrityAlert, setIntegrityAlert] = useState("");

  // Mobile explorer modal/slide-over toggle
  const [mobileExplorerOpen, setMobileExplorerOpen] = useState(false);

  // Reactive refresh triggers
  const [refreshDetailsKey, setRefreshDetailsKey] = useState(0);
  const reloadTopicDetails = useCallback(() => setRefreshDetailsKey((k) => k + 1), []);

  // Track latest active subject ID to discard stale async subject requests
  const activeSubjectIdRef = useRef(null);
  const activeTopicIdRef = useRef(null);

  // -------------------------------------------------------------
  // Data Fetching: Enrolled Subjects on Mount
  // -------------------------------------------------------------
  useEffect(() => {
    let active = true;
    async function loadInitialSubjects() {
      try {
        setError("");
        setLoading(true);
        const res = await fetchSubjects(token);
        if (!active) return;
        const subs = Array.isArray(res?.data) ? res.data : [];
        setSubjects(subs);

        if (subs.length > 0) {
          const found = initialSubjectId
            ? subs.find((s) => String(s.subject_id) === String(initialSubjectId)) || subs[0]
            : subs[0];
          setSelectedSubject(found);
          activeSubjectIdRef.current = found.subject_id;
          setTopicsLoading(true);
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
  // Subject Selection Handler: Discards stale state & loads units
  // -------------------------------------------------------------
  const handleSelectSubject = useCallback((sub) => {
    if (!sub || (selectedSubject && String(sub.subject_id) === String(selectedSubject.subject_id))) {
      setMobileExplorerOpen(false);
      return;
    }

    setSelectedSubject(sub);
    activeSubjectIdRef.current = sub.subject_id;

    // Immediately reset child states to prevent stale cross-subject data display
    setSelectedTopic(null);
    activeTopicIdRef.current = null;
    setTopics([]);
    setMaterials([]);
    setQuiz(null);
    setMyAttempt(null);
    setServerQuizStatus(null);
    setError("");
    setTopicsLoading(true);
    setMobileExplorerOpen(false);
  }, [selectedSubject]);

  // -------------------------------------------------------------
  // Data Fetching: Topics for Selected Subject
  // -------------------------------------------------------------
  useEffect(() => {
    if (!selectedSubject?.subject_id) return;
    const subjectId = selectedSubject.subject_id;
    activeSubjectIdRef.current = subjectId;

    let active = true;

    fetchSubjectTopics(token, subjectId)
      .then((res) => {
        // Discard response if student switched to another subject while loading
        if (!active || activeSubjectIdRef.current !== subjectId) return;
        const topicList = Array.isArray(res?.data) ? res.data : [];
        setTopics(topicList);

        if (topicList.length > 0) {
          setSelectedTopic(topicList[0]);
          activeTopicIdRef.current = topicList[0].topic_id;
          setResourcesLoading(true);
        } else {
          setSelectedTopic(null);
          activeTopicIdRef.current = null;
          setMaterials([]);
          setQuiz(null);
          setMyAttempt(null);
          setServerQuizStatus(null);
        }
      })
      .catch((err) => {
        if (!active || activeSubjectIdRef.current !== subjectId) return;
        setError(err.message || "Failed to load course units");
      })
      .finally(() => {
        if (active && activeSubjectIdRef.current === subjectId) {
          setTopicsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token, selectedSubject]);

  // -------------------------------------------------------------
  // Unit (Topic) Selection Handler
  // -------------------------------------------------------------
  const handleSelectTopic = useCallback((topic) => {
    if (!topic || (selectedTopic && String(topic.topic_id) === String(selectedTopic.topic_id))) {
      return;
    }
    setSelectedTopic(topic);
    activeTopicIdRef.current = topic.topic_id;
    setResourcesLoading(true);
    setMaterials([]);
    setQuiz(null);
    setMyAttempt(null);
    setServerQuizStatus(null);
  }, [selectedTopic]);

  // -------------------------------------------------------------
  // Data Fetching: Topic Materials, Quiz, and Authoritative Unlock Status
  // -------------------------------------------------------------
  useEffect(() => {
    if (!selectedTopic?.topic_id) return;
    const topicId = selectedTopic.topic_id;
    activeTopicIdRef.current = topicId;

    let active = true;

    Promise.all([
      fetchTopicMaterials(token, topicId),
      fetchTopicQuiz(token, topicId),
    ])
      .then(async ([matRes, quizRes]) => {
        if (!active || activeTopicIdRef.current !== topicId) return;
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
            if (!active || activeTopicIdRef.current !== topicId) return;
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
        if (!active || activeTopicIdRef.current !== topicId) return;
        setError(err.message || "Failed to load topic learning resources");
      })
      .finally(() => {
        if (active && activeTopicIdRef.current === topicId) {
          setResourcesLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token, selectedTopic, refreshDetailsKey]);

  // Material completion callback
  const handleMaterialComplete = async (materialId, percent = 100) => {
    await updateMaterialProgress(token, materialId, percent);
    reloadTopicDetails();
  };

  // -------------------------------------------------------------
  // Authoritative Server-Driven Quiz Status Evaluation
  // -------------------------------------------------------------
  const computedQuizStatus = useMemo(() => {
    if (!quiz || quiz.status !== "Published" || !selectedTopic?.quiz_enabled) {
      return { status: "HIDDEN", reason: "" };
    }

    if (myAttempt && (myAttempt.status === "CANCELLED" || myAttempt.is_flagged_cheating)) {
      return {
        status: "DISQUALIFIED",
        reason:
          "Your attempt was terminated for leaving the quiz screen or an integrity violation. Further retakes are prohibited.",
      };
    }

    if (serverQuizStatus?.active_attempt) {
      const remainingMins = Math.floor(serverQuizStatus.active_attempt.remaining_seconds / 60);
      const remainingSecs = serverQuizStatus.active_attempt.remaining_seconds % 60;
      return {
        status: "IN_PROGRESS",
        reason: `Active exam sitting in progress! Time remaining: ${remainingMins}m ${remainingSecs}s`,
        active_attempt: serverQuizStatus.active_attempt,
      };
    }

    if (serverQuizStatus?.is_unlocked) {
      return {
        status: "OPEN",
        reason: `All prerequisites met. Ready for assessment sitting. Remaining attempts: ${serverQuizStatus.remaining_attempts}`,
      };
    }

    if (serverQuizStatus) {
      if (serverQuizStatus.remaining_attempts === 0 && myAttempt) {
        return {
          status: "COMPLETED",
          reason: `Assessment completed. Score: ${myAttempt.score} / ${myAttempt.max_score} (${myAttempt.percentage}%)`,
        };
      }
      const lockMsg =
        serverQuizStatus.lock_reasons && serverQuizStatus.lock_reasons.length > 0
          ? serverQuizStatus.lock_reasons[0]
          : "Quiz is currently locked.";
      const isClosed = !serverQuizStatus.is_window_open && lockMsg.toLowerCase().includes("closed");
      return {
        status: isClosed ? "MISSED" : "LOCKED",
        reason: lockMsg,
        missing: serverQuizStatus.incomplete_required_materials || [],
      };
    }

    return { status: "HIDDEN", reason: "" };
  }, [quiz, selectedTopic, myAttempt, serverQuizStatus]);

  // Start / Resume Quiz Attempt
  const handleStartQuiz = async () => {
    if (!quiz) return;
    try {
      setError("");
      setIntegrityAlert("");
      document.documentElement.requestFullscreen?.().catch(() => {});
      const res = await startQuizAttempt(token, quiz.quiz_id);
      if (res?.success && res.data) {
        const questionsList =
          Array.isArray(res.data.questions) && res.data.questions.length > 0
            ? res.data.questions
            : Array.isArray(res.data.question_set)
            ? res.data.question_set
            : [];
        const attempt = {
          ...res.data,
          questions: questionsList,
          question_set: questionsList,
        };
        setActiveAttempt(attempt);
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
      <ErrorBoundary
        title="Assessment Display Error"
        onReset={() => setActiveAttempt(null)}
        onReturn={() => {
          setActiveAttempt(null);
          reloadTopicDetails();
        }}
      >
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
            setIntegrityAlert(
              `Academic Integrity Violation: ${reason}. Quiz attempt has been terminated.`
            );
            reloadTopicDetails();
          }}
        />
      </ErrorBoundary>
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

  const completedCount = materials.filter(
    (m) => m.user_progress?.status === "COMPLETED"
  ).length;
  const totalCount = materials.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const qStatus = computedQuizStatus.status;

  return (
    <div className="space-y-4">
      {/* ================= A. Page Header ================= */}
      <div className="border-b border-slate-200/90 pb-3">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Study Materials & Quizzes
        </h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
          Access your enrolled course materials, unit resources and assessments.
        </p>
      </div>

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

      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError("")}
        />
      )}

      {/* ================= Mobile Selected Subject Switcher Bar ================= */}
      <div className="lg:hidden flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="min-w-0 flex-1 pr-2">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Selected Course
          </span>
          {selectedSubject ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-xs font-bold text-emerald-900">
                {selectedSubject.subject_code || selectedSubject.code}
              </span>
              <span className="text-slate-300">•</span>
              <span className="truncate text-xs font-semibold text-slate-900">
                {selectedSubject.name}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-500">No course selected</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMobileExplorerOpen(true)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition shrink-0"
        >
          <BookOpenIcon className="h-3.5 w-3.5" />
          <span>Explorer</span>
        </button>
      </div>

      {/* ================= Mobile Slide-Over / Modal ================= */}
      {mobileExplorerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 lg:hidden"
        >
          <div className="w-full max-w-md max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpenIcon className="h-4 w-4 text-emerald-800" />
                Select Enrolled Course
              </h3>
              <button
                type="button"
                onClick={() => setMobileExplorerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              <SubjectExplorer
                subjects={subjects}
                selectedSubject={selectedSubject}
                onSelectSubject={handleSelectSubject}
                className="border-0 shadow-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= Main Split Stage: Left Explorer + Right Workspace ================= */}
      <div className="flex flex-col lg:flex-row items-start gap-5">
        {/* B. Desktop Subject Explorer (Left Panel) */}
        <aside className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-4 self-start">
          <SubjectExplorer
            subjects={subjects}
            selectedSubject={selectedSubject}
            onSelectSubject={handleSelectSubject}
          />
        </aside>

        {/* C. Selected Subject Workspace (Right Panel) */}
        <main className="flex-1 min-w-0 w-full space-y-5">
          {selectedSubject ? (
            <>
              {/* Subject Context Header Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200">
                        {selectedSubject.subject_code || selectedSubject.code}
                      </span>
                      {selectedSubject.semester && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          Semester {selectedSubject.semester}
                        </span>
                      )}
                      {selectedSubject.credits && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {selectedSubject.credits} Credits
                        </span>
                      )}
                      {selectedSubject.delivery_type && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {selectedSubject.delivery_type}
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      {selectedSubject.name}
                    </h2>

                    {(selectedSubject.programme_name || selectedSubject.department_name) && (
                      <p className="text-xs text-slate-500 mt-1">
                        {selectedSubject.programme_name ? `${selectedSubject.programme_name} • ` : ""}
                        {selectedSubject.department_name || ""}
                        {selectedSubject.school_name ? ` (${selectedSubject.school_name})` : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-600 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/80 font-medium">
                      {topics.length} {topics.length === 1 ? "Course Unit" : "Course Units"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Course Units Stepper / Navigation Strip */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Course Units & Syllabus Structure
                  </h3>
                  {topicsLoading && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <ArrowPathIcon className="h-3 w-3 animate-spin text-emerald-700" />
                      Loading units...
                    </span>
                  )}
                </div>

                {topicsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="h-20 bg-slate-100 rounded-xl animate-pulse border border-slate-200"
                      />
                    ))}
                  </div>
                ) : topics.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                    <FolderIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No Course Units Available</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      The curriculum syllabus and units for this subject have not yet been published by faculty.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                    {topics.map((t) => {
                      const isSelected =
                        selectedTopic && String(selectedTopic.topic_id) === String(t.topic_id);
                      const unitMaterialsCount =
                        t.published_materials ?? t.total_materials ?? 0;
                      const hasQuiz = Boolean(t.quiz_id || t.quiz_enabled);

                      return (
                        <button
                          key={t.topic_id}
                          type="button"
                          onClick={() => handleSelectTopic(t)}
                          className={`w-full text-left p-3 rounded-xl transition border flex flex-col justify-between gap-2 shadow-2xs group ${
                            isSelected
                              ? "bg-white border-emerald-600 shadow-xs ring-1 ring-emerald-600/30"
                              : "bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50/70"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  isSelected
                                    ? "bg-emerald-100 text-emerald-900"
                                    : "bg-slate-100 text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-800"
                                }`}
                              >
                                Unit {t.position}
                              </span>
                              {t.required_completed && (
                                <span
                                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700"
                                  title="Prerequisites completed"
                                >
                                  <CheckBadgeIcon className="h-3.5 w-3.5 text-emerald-600" />
                                  Done
                                </span>
                              )}
                            </div>
                            <h4
                              className={`text-xs font-bold leading-snug line-clamp-2 ${
                                isSelected ? "text-emerald-950" : "text-slate-900"
                              }`}
                            >
                              {t.title}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                            <span>
                              {unitMaterialsCount} {unitMaterialsCount === 1 ? "Material" : "Materials"}
                            </span>
                            <span>{hasQuiz ? "1 Quiz" : "No Quiz"}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Course Unit Learning Resources */}
              {selectedTopic ? (
                <div className="space-y-4 pt-2">
                  {/* Unit Title & Progress Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Unit {selectedTopic.position} Selected
                        </span>
                        <h3 className="text-base font-bold text-slate-900 mt-1">
                          {selectedTopic.title}
                        </h3>
                        {selectedTopic.description && (
                          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                            {selectedTopic.description}
                          </p>
                        )}
                      </div>

                      {totalCount > 0 && (
                        <div className="text-left sm:text-right shrink-0">
                          <span className="text-xs font-bold text-slate-800">
                            {completedCount} of {totalCount} completed
                          </span>
                          <span className="block text-[11px] text-slate-400 font-medium">
                            Unit Reading Progress ({progressPercent}%)
                          </span>
                        </div>
                      )}
                    </div>

                    {totalCount > 0 && (
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Section 1: Study Materials */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <DocumentTextIcon className="h-4 w-4 text-emerald-800" />
                        Study Materials ({materials.length})
                      </h4>
                      {resourcesLoading && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <ArrowPathIcon className="h-3 w-3 animate-spin text-emerald-700" />
                          Refreshing...
                        </span>
                      )}
                    </div>

                    {materials.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-7 text-center text-xs text-slate-500">
                        <BookOpenIcon className="h-7 w-7 text-slate-300 mx-auto mb-1.5" />
                        <p className="font-semibold text-slate-700">No Study Materials</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          No lecture notes, slides, or documents published for this unit yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {materials.map((mat) => {
                          const isComplete = mat.user_progress?.status === "COMPLETED";

                          let Icon = DocumentTextIcon;
                          if (mat.type === "Video") Icon = PlayIcon;
                          if (mat.type === "Slide") Icon = PresentationChartBarIcon;

                          const uploaderName =
                            mat.faculty_name || mat.uploader_name || "Course Instructor";

                          return (
                            <div
                              key={mat.material_id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition hover:border-emerald-300 hover:shadow-xs"
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-2xs ${
                                    isComplete
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  <Icon className="h-5 w-5" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span
                                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                        mat.required_flag
                                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                                          : "bg-slate-100 text-slate-600"
                                      }`}
                                    >
                                      {mat.required_flag ? "★ Required" : "Optional"}
                                    </span>
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">
                                      {mat.type}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      v{mat.version || 1}
                                    </span>
                                  </div>

                                  <h5 className="text-xs font-bold text-slate-900 mt-1 truncate">
                                    {mat.title}
                                  </h5>

                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                                    <span className="flex items-center gap-1">
                                      <UserIcon className="h-3 w-3 text-slate-400" />
                                      {uploaderName}
                                    </span>
                                    {mat.description && (
                                      <>
                                        <span className="text-slate-300">•</span>
                                        <span className="truncate max-w-sm">
                                          {mat.description}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                {isComplete ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                                    <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />
                                    Done
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                                    <ClockIcon className="h-3.5 w-3.5 text-slate-400" />
                                    Pending
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setViewingMaterial(mat)}
                                  className="rounded-lg bg-emerald-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-900 transition shadow-2xs"
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

                  {/* Section 2: Quizzes & Assessment */}
                  {qStatus !== "HIDDEN" ? (
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 px-1">
                        <AcademicCapIcon className="h-4 w-4 text-emerald-800" />
                        Unit Assessment & Knowledge Check
                      </h4>

                      <div
                        className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition ${
                          qStatus === "OPEN" || qStatus === "IN_PROGRESS"
                            ? "border-emerald-300 bg-gradient-to-br from-emerald-50/70 via-white to-green-50/50"
                            : qStatus === "DISQUALIFIED"
                            ? "border-red-300 bg-red-50/50"
                            : "border-slate-200 bg-slate-50/50"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-2xs ${
                                qStatus === "OPEN" ||
                                qStatus === "IN_PROGRESS" ||
                                qStatus === "COMPLETED"
                                  ? "bg-emerald-800 text-white"
                                  : qStatus === "DISQUALIFIED"
                                  ? "bg-red-600 text-white"
                                  : "bg-slate-200 text-slate-500"
                              }`}
                            >
                              {qStatus === "OPEN" ||
                              qStatus === "IN_PROGRESS" ||
                              qStatus === "COMPLETED" ? (
                                <AcademicCapIcon className="h-6 w-6" />
                              ) : qStatus === "DISQUALIFIED" ? (
                                <ShieldExclamationIcon className="h-5 w-5" />
                              ) : (
                                <LockClosedIcon className="h-5 w-5" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                    qStatus === "OPEN" ||
                                    qStatus === "IN_PROGRESS" ||
                                    qStatus === "COMPLETED"
                                      ? "bg-emerald-100 text-emerald-900"
                                      : qStatus === "DISQUALIFIED"
                                      ? "bg-red-100 text-red-900"
                                      : "bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  {STATUS_LABEL[qStatus]}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {quiz.time_limit} mins • Cutoff: {quiz.pass_mark}%
                                </span>
                              </div>

                              <h4 className="text-sm font-bold text-slate-900 mt-1">
                                {quiz.title}
                              </h4>
                              <p className="text-xs text-slate-600 mt-0.5">
                                {quiz.description || "End-of-unit comprehensive knowledge evaluation."}
                              </p>
                              {(quiz.open_at || quiz.close_at) && (
                                <p className="mt-1 text-[11px] text-slate-500">
                                  Window: {fmtDateTime(quiz.open_at)} to {fmtDateTime(quiz.close_at)}
                                </p>
                              )}

                              {/* Reason / Diagnostics */}
                              <div className="mt-2 text-xs">
                                {qStatus === "OPEN" ? (
                                  <span className="font-semibold text-emerald-800">
                                    ✓ Prerequisites completed. You may begin your sitting.
                                  </span>
                                ) : qStatus === "IN_PROGRESS" ? (
                                  <span className="font-semibold text-indigo-700 flex items-center gap-1">
                                    <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
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
                                    <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0" />
                                    {computedQuizStatus.reason}
                                  </span>
                                )}
                              </div>

                              {/* Missing Required Materials Alert */}
                              {computedQuizStatus.missing &&
                                computedQuizStatus.missing.length > 0 && (
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
                          <div className="shrink-0 self-end sm:self-center">
                            {qStatus === "OPEN" ? (
                              <button
                                type="button"
                                onClick={handleStartQuiz}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-900 transition"
                              >
                                <AcademicCapIcon className="h-4 w-4" />
                                Start Quiz Sitting
                              </button>
                            ) : qStatus === "IN_PROGRESS" ? (
                              <button
                                type="button"
                                onClick={handleStartQuiz}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-800 transition animate-pulse"
                              >
                                <ArrowPathIcon className="h-4 w-4" />
                                Resume Sitting
                              </button>
                            ) : qStatus === "COMPLETED" ? (
                              <button
                                type="button"
                                onClick={() => setResultData(myAttempt)}
                                className="w-full sm:w-auto rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-black transition shadow-xs"
                              >
                                View My Score
                              </button>
                            ) : (
                              <span className="inline-block rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-500">
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
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-center text-xs text-slate-500">
                      No assessment currently configured for Unit {selectedTopic.position}.
                    </div>
                  )}
                </div>
              ) : (
                /* When subject is selected but no unit is selected yet: useful overview */
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
                  <AcademicCapIcon className="h-10 w-10 text-emerald-800 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Select a Course Unit to Begin
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Choose one of the course units above to access study materials, lecture slides, video resources, and end-of-unit quizzes.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* When no subject is available/selected */
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
              <BookOpenIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">
                No Course Selected
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {subjects.length > 0
                  ? "Select an enrolled subject from the Subject Explorer on the left to view materials and assessments."
                  : "You are not currently enrolled in any academic subjects for this term."}
              </p>
            </div>
          )}
        </main>
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
