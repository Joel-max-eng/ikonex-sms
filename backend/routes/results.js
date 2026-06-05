const router = require('express').Router();
const db = require('../db');

// Helper — get grade from scale
function getGradeInfo(score, scale) {
  return scale.find(g => score >= g.min_score && score <= g.max_score) || scale[scale.length - 1];
}

// GET full results for a class (ranked) with subject positions
router.get('/class/:classId', async (req, res) => {
  const { term, year } = req.query;
  try {
    const [students] = await db.query(
      'SELECT * FROM students WHERE class_id = ? ORDER BY last_name', 
      [req.params.classId]
    );
    const [scale] = await db.query('SELECT * FROM grading_scale ORDER BY min_score DESC');

    // Get all scores for this class in one query
    const [allScores] = await db.query(`
      SELECT sc.*, sub.name as subject_name, sub.code, s.id as sid
      FROM scores sc
      INNER JOIN subjects sub ON sub.id = sc.subject_id
      INNER JOIN students s ON s.id = sc.student_id
      WHERE s.class_id = ? AND sc.term = ? AND sc.year = ?
    `, [req.params.classId, term, year]);

    // Group scores by subject to calculate subject positions
    const subjectGroups = {};
    allScores.forEach(sc => {
      if (!subjectGroups[sc.subject_id]) subjectGroups[sc.subject_id] = [];
      subjectGroups[sc.subject_id].push({ studentId: sc.student_id, total: Number(sc.total_score) });
    });

    // Rank within each subject
    const subjectPositions = {}; // { studentId_subjectId: position }
    Object.entries(subjectGroups).forEach(([subjectId, entries]) => {
      entries.sort((a, b) => b.total - a.total);
      entries.forEach((e, i) => {
        subjectPositions[`${e.studentId}_${subjectId}`] = i + 1;
      });
    });

    // Build results per student
    const results = students.map(student => {
      const scores = allScores
        .filter(sc => sc.student_id === student.id)
        .map(sc => ({
          ...sc,
          grade: getGradeInfo(Number(sc.total_score), scale)?.grade || 'E',
          subject_position: subjectPositions[`${student.id}_${sc.subject_id}`] || '-'
        }));

      const totalMarks = scores.reduce((a, s) => a + Number(s.total_score), 0);
      const avg = scores.length ? parseFloat((totalMarks / scores.length).toFixed(1)) : 0;
      const gradeInfo = getGradeInfo(avg, scale);

      return {
        student,
        scores,
        totalMarks,
        average: avg,
        grade: gradeInfo?.grade || 'E',
        remark: gradeInfo?.remark || 'Fail',
        points: gradeInfo?.points || 0,
        subjectCount: scores.length
      };
    });

    // Overall class ranking
    results.sort((a, b) => b.average - a.average);
    results.forEach((r, i) => r.position = i + 1);

    res.json(results);
  } catch (err) {
    console.error('Results error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET results for single student
router.get('/student/:studentId', async (req, res) => {
  const { term, year } = req.query;
  try {
    const [[student]] = await db.query(`
      SELECT s.*, cs.name as class_name, cs.id as class_id
      FROM students s
      LEFT JOIN class_streams cs ON cs.id = s.class_id
      WHERE s.id = ?
    `, [req.params.studentId]);

    if (!student) return res.status(404).json({ error: 'Student not found' });

    const [scores] = await db.query(`
      SELECT sc.*, sub.name as subject_name, sub.code
      FROM scores sc
      INNER JOIN subjects sub ON sub.id = sc.subject_id
      WHERE sc.student_id = ? AND sc.term = ? AND sc.year = ?
      ORDER BY sub.name
    `, [req.params.studentId, term, year]);

    const [scale] = await db.query('SELECT * FROM grading_scale ORDER BY min_score DESC');

    // Get subject positions by comparing with classmates
    const enrichedScores = await Promise.all(scores.map(async sc => {
      const [classScores] = await db.query(`
        SELECT sc2.total_score
        FROM scores sc2
        INNER JOIN students s2 ON s2.id = sc2.student_id
        WHERE s2.class_id = ? AND sc2.subject_id = ? AND sc2.term = ? AND sc2.year = ?
        ORDER BY sc2.total_score DESC
      `, [student.class_id, sc.subject_id, term, year]);

      const pos = classScores.findIndex(r => Number(r.total_score) <= Number(sc.total_score));
      const subjectPosition = classScores.filter(r => Number(r.total_score) > Number(sc.total_score)).length + 1;

      return {
        ...sc,
        grade: getGradeInfo(Number(sc.total_score), scale)?.grade || 'E',
        remark: getGradeInfo(Number(sc.total_score), scale)?.remark || 'Fail',
        subject_position: subjectPosition,
        total_in_class: classScores.length
      };
    }));

    const totalMarks = enrichedScores.reduce((a, s) => a + Number(s.total_score), 0);
    const avg = enrichedScores.length ? parseFloat((totalMarks / enrichedScores.length).toFixed(1)) : 0;
    const gradeInfo = getGradeInfo(avg, scale);

    // Get overall class position
    const [classAvgs] = await db.query(`
      SELECT s.id, AVG(sc.total_score) as avg_score
      FROM students s
      LEFT JOIN scores sc ON sc.student_id = s.id AND sc.term = ? AND sc.year = ?
      WHERE s.class_id = ?
      GROUP BY s.id
      ORDER BY avg_score DESC
    `, [term, year, student.class_id]);

    const overallPosition = classAvgs.findIndex(r => r.id === student.id) + 1;

    res.json({
      student,
      scores: enrichedScores,
      totalMarks,
      average: avg,
      grade: gradeInfo?.grade || 'E',
      remark: gradeInfo?.remark || 'Fail',
      overallPosition,
      totalStudents: classAvgs.length
    });
  } catch (err) {
    console.error('Student results error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET class performance for a specific subject
router.get('/class/:classId/subject/:subjectId', async (req, res) => {
  const { term, year } = req.query;
  try {
    const [rows] = await db.query(`
      SELECT
        s.id as student_id, s.first_name, s.last_name, s.adm_no,
        sc.exam_score, sc.cat_score, sc.total_score
      FROM students s
      LEFT JOIN scores sc ON sc.student_id = s.id
        AND sc.subject_id = ? AND sc.term = ? AND sc.year = ?
      WHERE s.class_id = ?
      ORDER BY sc.total_score DESC, s.last_name
    `, [req.params.subjectId, term, year, req.params.classId]);

    const [scale] = await db.query('SELECT * FROM grading_scale ORDER BY min_score DESC');
    const [[subject]] = await db.query('SELECT * FROM subjects WHERE id = ?', [req.params.subjectId]);

    const enriched = rows.map((r, i) => ({
      ...r,
      position: r.total_score ? i + 1 : '-',
      grade: r.total_score ? getGradeInfo(Number(r.total_score), scale)?.grade || 'E' : '-',
      remark: r.total_score ? getGradeInfo(Number(r.total_score), scale)?.remark || '' : 'Not Assessed'
    }));

    const scored = enriched.filter(r => r.total_score);
    const classAvg = scored.length
      ? parseFloat((scored.reduce((a, r) => a + Number(r.total_score), 0) / scored.length).toFixed(1))
      : 0;

    res.json({ subject, rows: enriched, classAverage: classAvg, totalStudents: rows.length, assessed: scored.length });
  } catch (err) {
    console.error('Subject performance error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;