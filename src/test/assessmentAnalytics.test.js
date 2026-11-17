import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Assessment Analytics Calculation & Filtering Logic", () => {
  const sampleAttempts = [
    {
      attempt_id: 1,
      student_name: "Aarav Sharma",
      register_no: "J26AIM001",
      quiz_id: 101,
      quiz_title: "Unit 1 Foundations",
      score: 18,
      max_score: 20,
      percentage: 90.0,
      result: "PASSED",
      is_flagged_cheating: 0,
      submitted_at: "2026-11-15T10:00:00Z",
    },
    {
      attempt_id: 2,
      student_name: "Diya Patel",
      register_no: "J26AIM002",
      quiz_id: 101,
      quiz_title: "Unit 1 Foundations",
      score: 13,
      max_score: 20,
      percentage: 65.0,
      result: "PASSED",
      is_flagged_cheating: 0,
      submitted_at: "2026-11-15T11:00:00Z",
    },
    {
      attempt_id: 3,
      student_name: "Rahul Verma",
      register_no: "J26AIM003",
      quiz_id: 102,
      quiz_title: "Unit 2 Deep Learning",
      score: 9,
      max_score: 20,
      percentage: 45.0,
      result: "FAILED",
      is_flagged_cheating: 0,
      submitted_at: "2026-11-16T09:30:00Z",
    },
    {
      attempt_id: 4,
      student_name: "Sneha Nair",
      register_no: "J26AIM004",
      quiz_id: 102,
      quiz_title: "Unit 2 Deep Learning",
      score: 6,
      max_score: 20,
      percentage: 30.0,
      result: "FAILED",
      is_flagged_cheating: 1,
      submitted_at: "2026-11-16T10:15:00Z",
    },
  ];

  it("should categorize score distributions into exact competency brackets", () => {
    const total = sampleAttempts.length;
    let dist = { excellent: 0, good: 0, marginal: 0, critical: 0 };

    sampleAttempts.forEach((a) => {
      const p = parseFloat(a.percentage) || 0;
      if (p >= 80) dist.excellent += 1;
      else if (p >= 60) dist.good += 1;
      else if (p >= 40) dist.marginal += 1;
      else dist.critical += 1;
    });

    assert.equal(dist.excellent, 1); // 90%
    assert.equal(dist.good, 1); // 65%
    assert.equal(dist.marginal, 1); // 45%
    assert.equal(dist.critical, 1); // 30%

    assert.equal(Math.round((dist.excellent / total) * 100), 25);
    assert.equal(Math.round((dist.critical / total) * 100), 25);
  });

  it("should calculate KPIs accurately and preserve authentic zeros", () => {
    const totalAttempts = sampleAttempts.length;
    const passedCount = sampleAttempts.filter((a) => a.result === "PASSED").length;
    const passRate = totalAttempts > 0 ? ((passedCount / totalAttempts) * 100).toFixed(1) : "0.0";
    const sumPercentage = sampleAttempts.reduce((acc, a) => acc + (parseFloat(a.percentage) || 0), 0);
    const avgScore = totalAttempts > 0 ? (sumPercentage / totalAttempts).toFixed(1) : "0.0";
    const cheatingCount = sampleAttempts.filter((a) => a.is_flagged_cheating === 1).length;

    assert.equal(totalAttempts, 4);
    assert.equal(passRate, "50.0");
    assert.equal(avgScore, "57.5"); // (90 + 65 + 45 + 30) / 4 = 230 / 4 = 57.5
    assert.equal(cheatingCount, 1);
  });

  it("should filter candidate attempts by quiz, result status, and integrity flags", () => {
    // Filter by Quiz
    const quiz101Attempts = sampleAttempts.filter((a) => String(a.quiz_id) === "101");
    assert.equal(quiz101Attempts.length, 2);

    // Filter by Result: PASSED
    const passed = sampleAttempts.filter((a) => a.result === "PASSED");
    assert.equal(passed.length, 2);

    // Filter by Result: FAILED
    const failed = sampleAttempts.filter((a) => a.result === "FAILED");
    assert.equal(failed.length, 2);

    // Filter by Integrity: FLAGGED
    const flagged = sampleAttempts.filter((a) => a.is_flagged_cheating === 1);
    assert.equal(flagged.length, 1);
    assert.equal(flagged[0].student_name, "Sneha Nair");
  });

  it("should sort attempts accurately by score, name, and timestamp", () => {
    // Sort by score desc
    const byScoreDesc = [...sampleAttempts].sort(
      (a, b) => (parseFloat(b.percentage) || 0) - (parseFloat(a.percentage) || 0)
    );
    assert.equal(byScoreDesc[0].student_name, "Aarav Sharma");
    assert.equal(byScoreDesc[3].student_name, "Sneha Nair");

    // Sort by name asc
    const byNameAsc = [...sampleAttempts].sort((a, b) =>
      (a.student_name || "").localeCompare(b.student_name || "")
    );
    assert.equal(byNameAsc[0].student_name, "Aarav Sharma");
    assert.equal(byNameAsc[1].student_name, "Diya Patel");
    assert.equal(byNameAsc[2].student_name, "Rahul Verma");
    assert.equal(byNameAsc[3].student_name, "Sneha Nair");

    // Sort by date desc
    const byDateDesc = [...sampleAttempts].sort(
      (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );
    assert.equal(byDateDesc[0].attempt_id, 4);
    assert.equal(byDateDesc[3].attempt_id, 1);
  });
});
