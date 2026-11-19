import test from "node:test";
import assert from "node:assert/strict";

// Helper mocking semester grouping & filter logic from SubjectExplorer
function filterAndGroupSubjects(subjects, searchQuery) {
  const q = (searchQuery || "").toLowerCase().trim();
  const filtered = !q
    ? subjects
    : subjects.filter((s) => {
        const code = (s.subject_code || s.code || "").toLowerCase();
        const name = (s.name || "").toLowerCase();
        return code.includes(q) || name.includes(q);
      });

  const groups = {};
  for (const sub of filtered) {
    const semNo = sub.semester || sub.semester_no;
    const semKey = semNo ? `Semester ${semNo}` : "General & Electives";
    if (!groups[semKey]) {
      groups[semKey] = {
        name: semKey,
        semNo: semNo ? Number(semNo) : 999,
        subjects: [],
      };
    }
    groups[semKey].subjects.push(sub);
  }

  const sortedGroups = Object.values(groups).sort((a, b) => a.semNo - b.semNo);
  return { filtered, groups: sortedGroups };
}

// Helper mocking quiz status computation from StudentAcademicHubView
function computeQuizStatus(quiz, selectedTopic, myAttempt, serverQuizStatus) {
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
}

test("Student Academic Hub: Subject Scalability & Explorer Logic", async (t) => {
  // Generate mock datasets for 5, 10, and 20+ subjects
  const createMockSubjects = (count) =>
    Array.from({ length: count }, (_, i) => ({
      subject_id: i + 1,
      subject_code: `CS${100 + i}`,
      code: `CS${100 + i}`,
      name: `Computer Science Discipline ${i + 1}`,
      semester: (i % 4) + 1, // Semesters 1 through 4
      credits: (i % 2) + 3,
    }));

  await t.test("1. Handles 5 enrolled subjects cleanly", () => {
    const subs = createMockSubjects(5);
    const { filtered, groups } = filterAndGroupSubjects(subs, "");
    assert.equal(filtered.length, 5);
    assert.ok(groups.length <= 4);
  });

  await t.test("2. Handles 10 enrolled subjects cleanly", () => {
    const subs = createMockSubjects(10);
    const { filtered, groups } = filterAndGroupSubjects(subs, "");
    assert.equal(filtered.length, 10);
    assert.equal(groups.length, 4);
    const totalInGroups = groups.reduce((acc, g) => acc + g.subjects.length, 0);
    assert.equal(totalInGroups, 10);
  });

  await t.test("3. Handles 15 to 24 enrolled subjects without degradation", () => {
    const subs = createMockSubjects(24);
    const { filtered, groups } = filterAndGroupSubjects(subs, "");
    assert.equal(filtered.length, 24);
    assert.equal(groups.length, 4);
    groups.forEach((g) => assert.equal(g.subjects.length, 6));
  });

  await t.test("4. Search by subject name accurately filters list", () => {
    const subs = [
      { subject_id: 1, subject_code: "CS201", name: "Data Structures & Algorithms", semester: 3 },
      { subject_id: 2, subject_code: "CS202", name: "Operating Systems", semester: 3 },
      { subject_id: 3, subject_code: "MA201", name: "Discrete Mathematics", semester: 3 },
    ];
    const { filtered } = filterAndGroupSubjects(subs, "Operating");
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].subject_code, "CS202");
  });

  await t.test("5. Search by subject code accurately filters list", () => {
    const subs = [
      { subject_id: 1, subject_code: "CS201", name: "Data Structures & Algorithms", semester: 3 },
      { subject_id: 2, subject_code: "CS202", name: "Operating Systems", semester: 3 },
      { subject_id: 3, subject_code: "MA201", name: "Discrete Mathematics", semester: 3 },
    ];
    const { filtered } = filterAndGroupSubjects(subs, "ma201");
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].name, "Discrete Mathematics");
  });

  await t.test("6. Semester grouping sorts chronologically and groups properly", () => {
    const subs = [
      { subject_id: 1, subject_code: "CS401", name: "Distributed Systems", semester: 7 },
      { subject_id: 2, subject_code: "CS101", name: "Programming in C", semester: 1 },
      { subject_id: 3, subject_code: "CS201", name: "Data Structures", semester: 3 },
      { subject_id: 4, subject_code: "EL001", name: "Open Elective", semester: null },
    ];
    const { groups } = filterAndGroupSubjects(subs, "");
    assert.equal(groups[0].name, "Semester 1");
    assert.equal(groups[1].name, "Semester 3");
    assert.equal(groups[2].name, "Semester 7");
    assert.equal(groups[3].name, "General & Electives");
  });
});

test("Student Academic Hub: Assessment Status & Prerequisite Engine", async (t) => {
  const publishedQuiz = {
    quiz_id: 10,
    title: "Unit 1 Knowledge Check",
    status: "Published",
    time_limit: 30,
    pass_mark: 50,
  };
  const activeTopic = { topic_id: 101, quiz_enabled: 1 };

  await t.test("10. Disqualified attempt status evaluation", () => {
    const disqualifiedAttempt = { status: "CANCELLED", is_flagged_cheating: 1 };
    const res = computeQuizStatus(publishedQuiz, activeTopic, disqualifiedAttempt, null);
    assert.equal(res.status, "DISQUALIFIED");
  });

  await t.test("11. In-progress active exam attempt resume evaluation", () => {
    const serverStatus = {
      is_unlocked: 1,
      active_attempt: { attempt_id: 99, remaining_seconds: 1250 },
    };
    const res = computeQuizStatus(publishedQuiz, activeTopic, null, serverStatus);
    assert.equal(res.status, "IN_PROGRESS");
    assert.ok(res.reason.includes("Time remaining: 20m 50s"));
  });

  await t.test("12. Unlocked and open quiz evaluation", () => {
    const serverStatus = {
      is_unlocked: true,
      remaining_attempts: 3,
    };
    const res = computeQuizStatus(publishedQuiz, activeTopic, null, serverStatus);
    assert.equal(res.status, "OPEN");
    assert.ok(res.reason.includes("All prerequisites met"));
  });

  await t.test("13. Locked due to missing required study materials", () => {
    const serverStatus = {
      is_unlocked: false,
      is_window_open: true,
      lock_reasons: ["Complete all required study materials before attempting."],
      incomplete_required_materials: [{ material_id: 5, title: "Lecture Notes", type: "PDF" }],
    };
    const res = computeQuizStatus(publishedQuiz, activeTopic, null, serverStatus);
    assert.equal(res.status, "LOCKED");
    assert.equal(res.missing.length, 1);
  });

  await t.test("14. Completed exam sitting score evaluation", () => {
    const myAttempt = { score: 85, max_score: 100, percentage: 85 };
    const serverStatus = {
      is_unlocked: false,
      remaining_attempts: 0,
    };
    const res = computeQuizStatus(publishedQuiz, activeTopic, myAttempt, serverStatus);
    assert.equal(res.status, "COMPLETED");
    assert.ok(res.reason.includes("Score: 85 / 100 (85%)"));
  });
});

test("Student Academic Hub: Reading Progress & Empty State Invariance", async (t) => {
  await t.test("15. Material progress computation logic", () => {
    const materials = [
      { material_id: 1, user_progress: { status: "COMPLETED" } },
      { material_id: 2, user_progress: { status: "COMPLETED" } },
      { material_id: 3, user_progress: { status: "PENDING" } },
      { material_id: 4, user_progress: null },
    ];
    const completedCount = materials.filter((m) => m.user_progress?.status === "COMPLETED").length;
    const totalCount = materials.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    assert.equal(completedCount, 2);
    assert.equal(totalCount, 4);
    assert.equal(progressPercent, 50);
  });

  await t.test("16. Empty search query state returns all subjects", () => {
    const subs = [
      { subject_id: 1, subject_code: "CS101", name: "C Prog" },
      { subject_id: 2, subject_code: "CS102", name: "Java Prog" },
    ];
    const { filtered } = filterAndGroupSubjects(subs, "");
    assert.equal(filtered.length, 2);
  });

  await t.test("17. Non-matching search query yields zero items", () => {
    const subs = [
      { subject_id: 1, subject_code: "CS101", name: "C Prog" },
    ];
    const { filtered } = filterAndGroupSubjects(subs, "Quantum Physics");
    assert.equal(filtered.length, 0);
  });
});
