import {
  CheckCircleIcon,
  XCircleIcon,
  TrophyIcon,
  AcademicCapIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  LightBulbIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

export default function QuizResultView({
  resultData,
  onRetry,
  onReturnToTopic,
  onOpenMaterial,
}) {
  if (!resultData) return null;

  const {
    score = 0,
    max_score = 0,
    percentage = 0,
    pass_mark = 60,
    result = "PENDING",
    breakdown = [],
    weak_areas = [],
  } = resultData;

  const isPassed = result === "PASSED" || percentage >= pass_mark;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* ================= Hero Result Summary Card ================= */}
      <div
        className={`relative overflow-hidden rounded-3xl p-8 text-white shadow-xl ${
          isPassed
            ? "bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 shadow-emerald-900/20"
            : "bg-gradient-to-br from-rose-950 via-red-900 to-amber-950 shadow-rose-900/20"
        }`}
      >
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl shadow-inner ${
                isPassed ? "bg-white/15 text-emerald-200" : "bg-white/15 text-rose-200"
              }`}
            >
              {isPassed ? (
                <TrophyIcon className="h-10 w-10 text-amber-300" />
              ) : (
                <AcademicCapIcon className="h-10 w-10 text-rose-200" />
              )}
            </div>

            <div>
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                  isPassed ? "bg-emerald-400/20 text-emerald-100" : "bg-rose-400/20 text-rose-100"
                }`}
              >
                {isPassed ? "Assessment Passed" : "Needs Improvement"}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">
                {isPassed ? "Congratulations! You Passed" : "Quiz Assessment Completed"}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-white/80">
                Minimum required cutoff: {pass_mark}% &bull; Your performance: {percentage}%
              </p>
            </div>
          </div>

          {/* Score metric badge */}
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-3.5 ring-1 ring-white/20 backdrop-blur-sm text-center">
            <div>
              <span className="block text-3xl font-black tabular-nums">
                {score} <span className="text-sm font-normal text-white/70">/ {max_score}</span>
              </span>
              <span className="block text-[11px] font-semibold text-white/80 uppercase tracking-wider">
                Total Score
              </span>
            </div>
            <div className="h-10 w-px bg-white/20 mx-2" />
            <div>
              <span className="block text-3xl font-black tabular-nums">{percentage}%</span>
              <span className="block text-[11px] font-semibold text-white/80 uppercase tracking-wider">
                Accuracy
              </span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5 text-xs">
          <button
            type="button"
            onClick={onReturnToTopic}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 font-semibold text-white hover:bg-white/25 transition"
          >
            <ArrowLeftIcon className="h-4 w-4" /> Back to Study Materials
          </button>

          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white text-slate-900 px-4 py-2 font-bold hover:bg-slate-100 transition shadow-sm"
            >
              <ArrowPathIcon className="h-4 w-4 text-emerald-700" /> Retake Quiz
            </button>
          ) : (
            <span className="text-xs text-white/70 italic">
              One submission policy enforced: You have completed your allowed attempt.
            </span>
          )}
        </div>
      </div>

      {/* ================= Weak Areas & Recommended Materials ================= */}
      {weak_areas && weak_areas.length > 0 && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 shadow-xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <LightBulbIcon className="h-5 w-5 text-amber-600" />
            Weak Areas Identified & Recommended Review Materials
          </div>
          <p className="mt-1 text-xs text-amber-800/90">
            Based on the questions you missed, we recommend reviewing these courseware resources to strengthen your
            conceptual foundation:
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {weak_areas.map((area, idx) => (
              <div key={idx} className="rounded-2xl border border-amber-200 bg-white p-4 shadow-2xs">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider font-mono">
                  Review Topic
                </span>
                <h4 className="font-bold text-slate-900 text-sm mt-1">{area.topic}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Missed {area.missed_count} question(s) from this concept.
                </p>

                {area.recommended_materials && area.recommended_materials.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5">
                    {area.recommended_materials.slice(0, 2).map((mat) => (
                      <button
                        key={mat.material_id}
                        type="button"
                        onClick={() => onOpenMaterial && onOpenMaterial(mat)}
                        className="flex w-full items-center justify-between gap-2 rounded-xl bg-slate-50 p-2 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <DocumentTextIcon className="h-4 w-4 text-emerald-700 shrink-0" />
                          <span className="truncate">{mat.title}</span>
                        </span>
                        <span className="text-[10px] text-emerald-700 font-mono">Read &rarr;</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= Question-by-Question Pedagogical Review ================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Detailed Answer Review</h3>
            <p className="text-xs text-slate-500">
              Review your responses alongside authoritative answer keys and explanatory derivations.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {breakdown.length} Questions Graded
          </span>
        </div>

        <div className="space-y-4">
          {breakdown.map((item, index) => {
            const isCorrect = item.is_correct;
            return (
              <div
                key={item.question_id || index}
                className={`rounded-3xl border p-6 transition ${
                  isCorrect
                    ? "border-emerald-200 bg-white"
                    : "border-rose-200 bg-rose-50/20"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold text-xs ${
                        isCorrect
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isCorrect
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <CheckCircleIcon className="h-4 w-4" /> Correct (+{item.marks_awarded} marks)
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="h-4 w-4" /> Incorrect (0 / {item.max_marks} marks)
                        </>
                      )}
                    </span>
                  </div>

                  {item.source_ref && (
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-xs">
                      Ref: {item.source_ref}
                    </span>
                  )}
                </div>

                {/* Question Text */}
                <h4 className="mt-3 text-base font-bold text-slate-900 font-serif leading-snug">
                  {item.text}
                </h4>

                {/* Answers breakdown */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className={`p-3 rounded-xl border ${isCorrect ? "bg-emerald-50 border-emerald-200 text-emerald-950 font-semibold" : "bg-rose-50 border-rose-200 text-rose-950"}`}>
                    <span className="block font-bold uppercase tracking-wider text-[10px] text-slate-500">
                      Your Answer:
                    </span>
                    <span className="mt-1 block text-sm font-mono">
                      {item.student_answer ? String(item.student_answer) : "(No answer provided)"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-950 font-semibold">
                    <span className="block font-bold uppercase tracking-wider text-[10px] text-emerald-800">
                      Correct Answer:
                    </span>
                    <span className="mt-1 block text-sm font-mono text-emerald-900">
                      {String(item.correct_answer)}
                    </span>
                  </div>
                </div>

                {/* Pedagogical Explanation */}
                {item.explanation && (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    <span className="font-bold text-slate-900 block mb-1">Conceptual Explanation:</span>
                    {item.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
