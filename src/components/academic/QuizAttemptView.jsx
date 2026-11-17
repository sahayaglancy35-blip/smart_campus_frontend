import { useState, useEffect, useRef, useCallback } from "react";
import {
  ClockIcon,
  FlagIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ListBulletIcon,
  Square2StackIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { FlagIcon as FlagIconSolid } from "@heroicons/react/24/solid";
import Modal from "../common/Modal";
import { autosaveAttemptAnswers, submitQuizAttempt, reportQuizViolation } from "../../api/academic";

export default function QuizAttemptView({
  token,
  user,
  attemptData,
  onFinished,
  onViolated,
}) {
  const {
    attempt_id,
    attempt_number,
    quiz_id,
    time_limit,
    remaining_seconds: initialRemaining,
    questions = [],
  } = attemptData;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [viewMode, setViewMode] = useState("single"); // "single" or "scroll"
  const [remainingTime, setRemainingTime] = useState(initialRemaining || time_limit * 60 || 900);
  const [saveStatus, setSaveStatus] = useState("saved"); // "saving", "saved", "offline"
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [violationOccurred, setViolationOccurred] = useState(false);
  const [violationMessage, setViolationMessage] = useState("");

  const autosaveTimerRef = useRef(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const isTerminatedRef = useRef(false);

  // -------------------------------------------------------------
  // Anti-Cheat Engine: Window Blur, Visibility Change & Exit Guard
  // -------------------------------------------------------------
  const triggerIntegrityViolation = useCallback(
    async (reason) => {
      if (isTerminatedRef.current || violationOccurred) return;
      isTerminatedRef.current = true;
      setViolationOccurred(true);
      setViolationMessage(reason);

      try {
        await reportQuizViolation(token, attempt_id, reason);
      } catch (err) {
        console.error("Failed to report cheating violation:", err);
      }

      if (onViolated) {
        onViolated(reason);
      }
    },
    [token, attempt_id, violationOccurred, onViolated]
  );

  useEffect(() => {
    // 1. Detect switching browser tab or minimizing window
    const handleVisibilityChange = () => {
      if (document.hidden && !isTerminatedRef.current) {
        triggerIntegrityViolation(
          "Tab switch or background minimization detected during active sitting."
        );
      }
    };

    // 2. Detect window blur (clicking outside or window losing focus)
    const handleWindowBlur = () => {
      if (!isTerminatedRef.current) {
        // Small grace period in case of standard system alert or select drop-down
        setTimeout(() => {
          if (!document.hasFocus() && !isTerminatedRef.current) {
            triggerIntegrityViolation(
              "Focus lost: Screen or window switched away from exam tab."
            );
          }
        }, 300);
      }
    };

    // 3. Beforeunload (closing tab, refreshing page)
    const handleBeforeUnload = (e) => {
      if (!isTerminatedRef.current) {
        triggerIntegrityViolation("Page reload or tab close during examination.");
        e.preventDefault();
        e.returnValue = "Leaving this page will immediately cancel your attempt and report you for cheating.";
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [triggerIntegrityViolation]);

  // -------------------------------------------------------------
  // Countdown Timer & Auto-Submit on Timeout
  // -------------------------------------------------------------
  useEffect(() => {
    if (violationOccurred) return;

    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit("Time expired: your attempt has been automatically submitted.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [violationOccurred]);

  // -------------------------------------------------------------
  // Periodic & Debounced Autosave
  // -------------------------------------------------------------
  const performAutosave = useCallback(async () => {
    if (violationOccurred || isTerminatedRef.current) return;
    try {
      setSaveStatus("saving");
      const payload = Object.entries(answersRef.current).map(([qId, val]) => ({
        question_id: parseInt(qId, 10),
        answer: val,
      }));
      await autosaveAttemptAnswers(token, attempt_id, payload);
      setSaveStatus("saved");
    } catch (err) {
      console.warn("Autosave warning:", err.message);
      setSaveStatus("offline");
    }
  }, [token, attempt_id, violationOccurred]);

  const handleSelectAnswer = (questionId, value) => {
    if (violationOccurred) return;
    setAnswers((prev) => {
      const updated = { ...prev, [questionId]: value };
      answersRef.current = updated;
      return updated;
    });

    // Debounce save
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(performAutosave, 1500);
  };

  const handleToggleFlag = (questionId) => {
    if (violationOccurred) return;
    setFlagged((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleAutoSubmit = async (reason) => {
    if (isSubmitting || isTerminatedRef.current) return;
    setIsSubmitting(true);
    try {
      const payload = {
        answers: Object.entries(answersRef.current).map(([qId, val]) => ({
          question_id: parseInt(qId, 10),
          answer: val,
        })),
      };
      const result = await submitQuizAttempt(token, attempt_id, payload);
      if (onFinished) {
        onFinished(result.data);
      }
    } catch (err) {
      alert("Submission error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    setShowSubmitModal(false);
    await handleAutoSubmit("Submitted by candidate.");
  };

  // Format Time: mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const currentQ = questions[currentIndex] || questions[0];
  const totalCount = questions.length;
  const answeredCount = Object.keys(answers).filter((k) => String(answers[k]).trim()).length;
  const flaggedCount = Object.keys(flagged).filter((k) => flagged[k]).length;
  const unansweredCount = Math.max(0, totalCount - answeredCount);

  // If student was caught cheating
  if (violationOccurred) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border-2 border-red-500 bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600">
          <ShieldExclamationIcon className="h-12 w-12" />
        </div>
        <span className="mt-4 inline-block rounded-full bg-red-100 px-4 py-1 text-xs font-bold uppercase tracking-wider text-red-800">
          Academic Integrity Alert
        </span>
        <h2 className="mt-3 text-2xl font-black text-slate-900">Quiz Sitting Terminated</h2>
        <p className="mt-2 text-sm font-semibold text-red-600">{violationMessage}</p>
        <div className="mt-6 rounded-2xl bg-red-50 p-5 text-left text-xs leading-relaxed text-red-900 border border-red-200">
          <p className="font-bold">Institutional Examination Policy Violation:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-red-800">
            <li>You exited the active full-screen examination tab.</li>
            <li>In accordance with academic regulations, your current attempt has been cancelled and awarded 0 marks.</li>
            <li>This incident has been logged into the append-only academic audit ledger.</li>
            <li>Your record in the faculty dashboard is now flagged as <strong>Cheating Detected</strong>.</li>
            <li>You are permanently disqualified from retaking this topic assessment.</li>
          </ul>
        </div>
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => {
              if (onViolated) onViolated(violationMessage);
            }}
            className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-black transition shadow-md"
          >
            Acknowledge & Exit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ================= Proctoring Status Header ================= */}
      <div className="sticky top-0 z-30 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-black">
              Q{currentIndex + 1}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Active Proctored Sitting</h3>
                <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span> Anti-Cheat Guard ON
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Attempt #{attempt_number} &bull; Do NOT switch tabs or exit this screen.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Mode Switcher */}
            <div className="hidden sm:inline-flex rounded-xl bg-slate-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("single")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  viewMode === "single" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Square2StackIcon className="h-3.5 w-3.5" /> One per screen
              </button>
              <button
                type="button"
                onClick={() => setViewMode("scroll")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                  viewMode === "scroll" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ListBulletIcon className="h-3.5 w-3.5" /> Scrolling list
              </button>
            </div>

            {/* Autosave Status Pill */}
            <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 font-medium">
              {saveStatus === "saving" ? (
                <>
                  <ArrowPathIcon className="h-3 w-3 animate-spin text-amber-600" />
                  <span className="text-amber-700">Autosaving...</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span className="text-emerald-800">Answers Saved</span>
                </>
              )}
            </div>

            {/* Live Timer Pill */}
            <div
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-mono font-bold shadow-xs ${
                remainingTime < 180
                  ? "bg-red-600 text-white animate-pulse"
                  : remainingTime < 420
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-slate-900 text-white"
              }`}
            >
              <ClockIcon className="h-4 w-4" />
              <span>{formatTime(remainingTime)}</span>
            </div>

            {/* Final Submit Button */}
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition"
            >
              Submit Quiz
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* ================= Left: Question Stage ================= */}
        <div className="lg:col-span-3 space-y-6">
          {viewMode === "single" ? (
            /* Single Question Screen */
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Question {currentIndex + 1} of {totalCount} &bull; Marks: {currentQ.marks || 1}
                </span>

                <button
                  type="button"
                  onClick={() => handleToggleFlag(currentQ.question_id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    flagged[currentQ.question_id]
                      ? "bg-purple-100 text-purple-900 ring-1 ring-purple-300"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {flagged[currentQ.question_id] ? (
                    <>
                      <FlagIconSolid className="h-4 w-4 text-purple-700" />
                      <span>Flagged for Review</span>
                    </>
                  ) : (
                    <>
                      <FlagIcon className="h-4 w-4 text-slate-500" />
                      <span>Flag for Later</span>
                    </>
                  )}
                </button>
              </div>

              {/* Question Text */}
              <div className="mt-5">
                <h2 className="text-lg font-bold leading-relaxed text-slate-900 sm:text-xl font-serif">
                  {currentQ.text}
                </h2>
              </div>

              {/* Options list */}
              <div className="mt-6 space-y-3">
                {currentQ.type === "ShortAnswer" ? (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">Type your answer:</label>
                    <input
                      type="text"
                      value={answers[currentQ.question_id] || ""}
                      onChange={(e) => handleSelectAnswer(currentQ.question_id, e.target.value)}
                      placeholder="e.g. O(1)"
                      className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                ) : (
                  (currentQ.options || []).map((opt, optIdx) => {
                    const isSelected = answers[currentQ.question_id] === opt;
                    return (
                      <label
                        key={optIdx}
                        className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 text-sm font-medium transition ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-600/30 font-semibold"
                            : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name={`q_${currentQ.question_id}`}
                            value={opt}
                            checked={isSelected}
                            onChange={() => handleSelectAnswer(currentQ.question_id, opt)}
                            className="h-4 w-4 accent-emerald-700 cursor-pointer"
                          />
                          <span>{opt}</span>
                        </div>
                        {isSelected && <CheckCircleIcon className="h-5 w-5 text-emerald-700 shrink-0" />}
                      </label>
                    );
                  })
                )}
              </div>

              {/* Bottom Navigation Controls */}
              <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  <ArrowLeftIcon className="h-4 w-4" /> Previous
                </button>

                <span className="text-xs text-slate-500 font-mono">
                  {currentIndex + 1} / {totalCount}
                </span>

                {currentIndex < totalCount - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((idx) => Math.min(totalCount - 1, idx + 1))}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-black transition shadow-xs"
                  >
                    Next Question <ArrowRightIcon className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-xs"
                  >
                    Finish & Submit
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Scrolling List Mode */
            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div
                  key={q.question_id}
                  id={`q_anchor_${idx}`}
                  className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Question {idx + 1} of {totalCount} &bull; Marks: {q.marks || 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleFlag(q.question_id)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        flagged[q.question_id]
                          ? "bg-purple-100 text-purple-900"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {flagged[q.question_id] ? (
                        <>
                          <FlagIconSolid className="h-3.5 w-3.5 text-purple-700" /> Flagged
                        </>
                      ) : (
                        <>
                          <FlagIcon className="h-3.5 w-3.5" /> Flag
                        </>
                      )}
                    </button>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-slate-900 font-serif leading-snug">{q.text}</h3>

                  <div className="mt-4 space-y-2">
                    {q.type === "ShortAnswer" ? (
                      <input
                        type="text"
                        value={answers[q.question_id] || ""}
                        onChange={(e) => handleSelectAnswer(q.question_id, e.target.value)}
                        placeholder="Type answer here..."
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-sm"
                      />
                    ) : (
                      (q.options || []).map((opt, optIdx) => {
                        const isSelected = answers[q.question_id] === opt;
                        return (
                          <label
                            key={optIdx}
                            className={`flex cursor-pointer items-center space-x-3 rounded-xl border p-3 text-xs font-medium transition ${
                              isSelected
                                ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-bold"
                                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`scroll_q_${q.question_id}`}
                              value={opt}
                              checked={isSelected}
                              onChange={() => handleSelectAnswer(q.question_id, opt)}
                              className="h-3.5 w-3.5 accent-emerald-700"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================= Right: Question Palette ================= */}
        <div className="lg:col-span-1 space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Question Palette</h4>
            <p className="mt-1 text-[11px] text-slate-500">Jump directly to any question</p>

            {/* Grid Palette */}
            <div className="mt-4 grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = Boolean(String(answers[q.question_id] || "").trim());
                const isFlagged = Boolean(flagged[q.question_id]);
                const isCurrent = currentIndex === idx;

                let btnColor = "bg-slate-100 text-slate-700 border-slate-200";
                if (isAnswered) {
                  btnColor = "bg-emerald-600 text-white border-emerald-700";
                }
                if (isFlagged) {
                  btnColor = "bg-purple-600 text-white border-purple-700";
                }

                return (
                  <button
                    key={q.question_id}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      if (viewMode === "scroll") {
                        const el = document.getElementById(`q_anchor_${idx}`);
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className={`relative flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold border transition ${btnColor} ${
                      isCurrent ? "ring-2 ring-slate-900 ring-offset-2" : "hover:opacity-90"
                    }`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[8px] text-slate-900 font-black">
                        ★
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 border-t border-slate-100 pt-4 space-y-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-md bg-emerald-600"></span>
                <span className="text-slate-600 font-medium">Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-md bg-slate-200"></span>
                <span className="text-slate-600 font-medium">Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-md bg-purple-600"></span>
                <span className="text-slate-600 font-medium">Flagged for review ({flaggedCount})</span>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="w-full rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition"
              >
                Submit Assessment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= Submit Confirmation Modal ================= */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Quiz Assessment"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Please review your completion status before concluding your examination sitting:
          </p>

          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center border border-slate-200">
            <div className="rounded-xl bg-white p-2 border border-slate-100">
              <span className="block text-lg font-bold text-emerald-700">{answeredCount}</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Answered</span>
            </div>
            <div className="rounded-xl bg-white p-2 border border-slate-100">
              <span className="block text-lg font-bold text-amber-600">{unansweredCount}</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Unanswered</span>
            </div>
            <div className="rounded-xl bg-white p-2 border border-slate-100">
              <span className="block text-lg font-bold text-purple-700">{flaggedCount}</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Flagged</span>
            </div>
          </div>

          {unansweredCount > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
              <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                You still have {unansweredCount} unanswered {unansweredCount === 1 ? "question" : "questions"}.
                Unanswered questions receive 0 marks.
              </span>
            </div>
          )}

          <p className="text-xs text-slate-500">
            Note: Once submitted, your answers cannot be altered and your score will be computed instantly.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSubmitModal(false)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Continue Test
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleManualSubmit}
              className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition"
            >
              {isSubmitting ? "Scoring..." : "Yes, Submit Now"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
