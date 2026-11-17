import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchSubjectTopics,
  fetchTopicMaterials,
  fetchTopicQuiz,
  fetchMyAttemptResult,
  updateMaterialProgress,
  startQuizAttempt,
} from "../../api/academic";
import { fmtDateTime } from "../../utils/datetime";
import { CoursePicker, TopicList, TopicHeader } from "../academic/AcademicShared";
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
  ShieldExclamationIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

const STATUS_LABEL = {
  OPEN: "Quiz Unlocked & Open",
  LOCKED: "Quiz Locked",
  COMPLETED: "Quiz Completed",
  MISSED: "Quiz Missed",
  DISQUALIFIED: "Disqualified",
};

function StudentCourseWorkspace({ token, user, subject, header }) {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [myAttempt, setMyAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals & active quiz flow state
  const [viewingMaterial, setViewingMaterial] = useState(null);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [integrityAlert, setIntegrityAlert] = useState("");

  // Load topics when the selected subject changes
  const loadTopics = useCallback(async () => {
    if (!subject) return;
    try {
      const res = await fetchSubjectTopics(token, subject.subject_id);
      const topicList = Array.isArray(res?.data) ? res.data : [];
      setTopics(topicList);
      if (topicList.length > 0) {
        setSelectedTopic(topicList[0]);
      } else {
        setSelectedTopic(null);
        setMaterials([]);
        setQuiz(null);
        setMyAttempt(null);
      }
    } catch (err) {
      setError(err.message || "Failed to load topics");
    } finally {
      setLoading(false);
    }
  }, [token, subject]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  // Load materials, quiz and the student's own attempt when the topic changes
  const loadTopicDetails = useCallback(async () => {
    if (!selectedTopic) return;
    try {
      const [matRes, quizRes] = await Promise.all([
        fetchTopicMaterials(token, selectedTopic.topic_id),
        fetchTopicQuiz(token, selectedTopic.topic_id),
      ]);
      setMaterials(Array.isArray(matRes?.data) ? matRes.data : []);
      const q = quizRes?.data || null;
      setQuiz(q);

      if (q && q.status === "Published") {
        const a = await fetchMyAttemptResult(token, q.quiz_id);
        setMyAttempt(a?.data || null);
      } else {
        setMyAttempt(null);
      }
    } catch (err) {
      setError(err.message || "Failed to load topic details");
    }
  }, [token, selectedTopic]);

  useEffect(() => {
    loadTopicDetails();
  }, [loadTopicDetails]);

  // Material completion: save on the server, then reload so the server stays the source of truth
  const handleMaterialComplete = async (materialId, percent = 100) => {
    await updateMaterialProgress(token, materialId, percent);
    await loadTopicDetails();
  };

  // Quiz card state
  const quizUnlockStatus = useMemo(() => {
    // Hidden unless the faculty member has published (assigned) the quiz for this topic
    if (!quiz || quiz.status !== "Published" || !selectedTopic?.quiz_enabled) {
      return { status: "HIDDEN" };
    }

    // Already attended: show the score, or the disqualification
    if (myAttempt) {
      const bad = myAttempt.status === "CANCELLED" || myAttempt.is_flagged_cheating;
      return bad
        ? {
            status: "DISQUALIFIED",
            reason: "Your attempt was cancelled for leaving the quiz screen. You cannot retake this quiz.",
          }
        : {
            status: "COMPLETED",
            reason: `Submitted. Score ${myAttempt.score} / ${myAttempt.max_score} (${myAttempt.percentage}%)`,
          };
    }

    const now = Date.now();
    if (quiz.open_at && now < new Date(quiz.open_at).getTime()) {
      return { status: "LOCKED", reason: `Opens on ${fmtDateTime(quiz.open_at)}` };
    }
    if (quiz.close_at && now > new Date(quiz.close_at).getTime()) {
      return {
        status: "MISSED",
        reason: `You did not attend within the scheduled time (closed ${fmtDateTime(quiz.close_at)}). It cannot be attempted now.`,
      };
    }

    const missing = materials.filter(
      (m) => m.status === "Published" && m.required_flag && (m.user_progress?.percent ?? 0) < 100
    );
    if (missing.length > 0) {
      return {
        status: "LOCKED",
        reason: `${missing.length} Required study material${missing.length === 1 ? "" : "s"} left to complete`,
        missing,
      };
    }

    return { status: "OPEN", reason: "All prerequisites met. Ready for assessment sitting." };
  }, [quiz, selectedTopic, materials, myAttempt]);

  // Start quiz attempt (the server re-checks every rule)
  const handleStartQuiz = async () => {
    if (!quiz) return;
    try {
      setError("");
      setIntegrityAlert("");
      // Must be called inside the click so the browser allows full screen
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
      loadTopicDetails();
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
        user={user}
        attemptData={activeAttempt}
        onFinished={(data) => {
          setActiveAttempt(null);
          setResultData(data);
          loadTopicDetails();
        }}
        onViolated={(reason) => {
          setActiveAttempt(null);
          setIntegrityAlert(`Academic Integrity Violation: ${reason}. Quiz attempt has been terminated.`);
          loadTopicDetails();
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
        onRetry={resultData?.attempts_left > 0 ? handleStartQuiz : null}
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
  const qStatus = quizUnlockStatus.status;

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

      {/* The opened course header (only this course is shown) */}
      {header}

      {/* ================= Main Split Stage: Topics & Content ================= */}
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-4">
        {/* Left Topics Nav */}
        <div className="lg:col-span-1">
          <TopicList topics={topics} selectedId={selectedTopic?.topic_id} onSelect={setSelectedTopic} />
        </div>

        {/* Right Stage: Topic Materials & Quiz Card */}
        <div className="lg:col-span-3 space-y-6">
          {selectedTopic ? (
            <>
              {/* Topic Header Card */}
              <TopicHeader
                topic={selectedTopic}
                aside={
                  <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xs font-bold text-white">
                      {progressPercent}%
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-800">
                        {completedCount} of {totalCount} completed
                      </span>
                      <span className="block text-[11px] text-slate-500">Prerequisite progress</span>
                    </div>
                  </div>
                }
                footer={
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-emerald-600 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                }
              />

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

              {/* End-of-Topic Quiz Card: only when the faculty has published (assigned) the quiz */}
              {qStatus !== "HIDDEN" && (
                <div
                  className={`rounded-3xl border p-6 shadow-sm transition ${
                    qStatus === "OPEN"
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
                          qStatus === "OPEN" || qStatus === "COMPLETED"
                            ? "bg-emerald-600 text-white"
                            : qStatus === "DISQUALIFIED"
                            ? "bg-red-600 text-white"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {qStatus === "OPEN" || qStatus === "COMPLETED" ? (
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
                              qStatus === "OPEN" || qStatus === "COMPLETED"
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
                            Scheduled: {fmtDateTime(quiz.open_at)} to {fmtDateTime(quiz.close_at)}
                          </p>
                        )}

                        {/* Reason / status line */}
                        <div className="mt-2 text-xs">
                          {qStatus === "OPEN" ? (
                            <span className="font-semibold text-emerald-700">
                              ✓ Prerequisites completed. You may begin your sitting. You can attempt it only once.
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
                              {quizUnlockStatus.reason}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action */}
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
                      ) : qStatus === "COMPLETED" ? (
                        <button
                          type="button"
                          onClick={() => setResultData(myAttempt)}
                          className="w-full sm:w-auto rounded-xl bg-slate-900 px-6 py-3 text-xs font-bold text-white hover:bg-black transition"
                        >
                          View my score
                        </button>
                      ) : (
                        <span className="inline-block rounded-xl border border-slate-200 bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-500">
                          {qStatus === "MISSED"
                            ? "Missed"
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

export default function StudentAcademicHubView({ token, user, initialSubjectId = null }) {
  return (
    <CoursePicker
      token={token}
      heading="My Courses"
      subheading="Choose a course to open its study materials and quiz."
      emptyText="You are not enrolled in any course yet."
      initialSubjectId={initialSubjectId}
    >
      {(subject, header) => (
        <StudentCourseWorkspace key={subject.subject_id} token={token} user={user} subject={subject} header={header} />
      )}
    </CoursePicker>
  );
}