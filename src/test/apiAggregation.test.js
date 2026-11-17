import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Admin Academic Oversight Aggregator Logic", () => {
  function aggregateOversightData({ departments = [], staff = [], subjects = [], trends = [] }) {
    let totalAttempts = 0;
    let sumAvgScores = 0;
    let gradedCount = 0;
    const quizzes = [];
    const studentActivities = [];

    trends.forEach((t) => {
      const data = t.data || {};
      const dept = departments.find((d) => d.department_id === t.deptId);

      if (Array.isArray(data.subject_breakdown)) {
        data.subject_breakdown.forEach((st) => {
          totalAttempts += st.quiz_metrics?.total_attempts || 0;
          if (st.quiz_metrics?.average_score_percentage !== undefined) {
            sumAvgScores += Number(st.quiz_metrics.average_score_percentage);
            gradedCount += 1;
          }
          quizzes.push({
            quiz_id: `q_sub_${st.subject_id}`,
            title: `${st.subject_code} Unit Assessment`,
            subject_code: st.subject_code,
            faculty_name: "Course Coordinator",
            department_name: dept?.name || "Academic Department",
            total_attempts: st.quiz_metrics?.total_attempts || 0,
            pass_rate: st.quiz_metrics?.pass_rate_percentage || 0,
            average_score: st.quiz_metrics?.average_score_percentage || 0,
          });
        });
      }

      if (Array.isArray(data.unstarted_topic1_students)) {
        data.unstarted_topic1_students.forEach((stu, idx) => {
          studentActivities.push({
            attempt_id: `act_${stu.student_id}_${idx}`,
            student_name: stu.full_name,
            register_no: stu.register_no,
            subject_code: stu.subject_code,
            result: "PENDING",
          });
        });
      }
    });

    const materials = subjects.map((s) => ({
      material_id: s.subject_id,
      title: `${s.name} Course Guide & Syllabus`,
      subject_code: s.subject_code || s.code,
    }));

    const overallAvg = gradedCount > 0 ? parseFloat((sumAvgScores / gradedCount).toFixed(1)) : 0;

    return {
      summary: {
        total_faculty: staff.length,
        total_materials: materials.length,
        total_quizzes: quizzes.length,
        total_attempts: totalAttempts,
        average_quiz_score: overallAvg,
      },
      materials,
      quizzes,
      student_activities: studentActivities,
    };
  }

  it("should accurately aggregate metrics from multiple departments", () => {
    const mockDepts = [
      { department_id: 1, name: "Computer Science" },
      { department_id: 2, name: "Mechanical Engineering" },
    ];
    const mockStaff = [{ faculty_id: 101 }, { faculty_id: 102 }, { faculty_id: 103 }];
    const mockSubjects = [
      { subject_id: 201, name: "Data Structures", subject_code: "CS201" },
      { subject_id: 202, name: "Algorithms", subject_code: "CS202" },
    ];
    const mockTrends = [
      {
        deptId: 1,
        data: {
          subject_breakdown: [
            {
              subject_id: 201,
              subject_code: "CS201",
              quiz_metrics: { total_attempts: 45, average_score_percentage: 82.5, pass_rate_percentage: 90 },
            },
            {
              subject_id: 202,
              subject_code: "CS202",
              quiz_metrics: { total_attempts: 35, average_score_percentage: 74.5, pass_rate_percentage: 85 },
            },
          ],
          unstarted_topic1_students: [
            { student_id: 501, full_name: "Alice Smith", register_no: "REG-01", subject_code: "CS201" },
          ],
        },
      },
    ];

    const result = aggregateOversightData({
      departments: mockDepts,
      staff: mockStaff,
      subjects: mockSubjects,
      trends: mockTrends,
    });

    assert.equal(result.summary.total_faculty, 3);
    assert.equal(result.summary.total_materials, 2);
    assert.equal(result.summary.total_quizzes, 2);
    assert.equal(result.summary.total_attempts, 80);
    assert.equal(result.summary.average_quiz_score, 78.5);
    assert.equal(result.student_activities.length, 1);
    assert.equal(result.student_activities[0].student_name, "Alice Smith");
  });
});
