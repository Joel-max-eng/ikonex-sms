const router = require('express').Router();
const db = require('../db');

// Helper — grade lookup
function getGradeInfo(score, scale) {
  return (
    scale.find(g => score >= g.min_score && score <= g.max_score) || {
      grade: 'E',
      remark: 'Fail',
      points: 0
    }
  );
}

/* ================================
   CLASS RESULTS (FULL RANKING)
================================ */
router.get('/class/:classId', async (req, res) => {
  const { term, year } = req.query;

  if (!term || !year) {
    return res.status(400).json({
      error: 'term and year are required'
    });
  }

  try {
    const [students] = await db.query(
      'SELECT * FROM students WHERE class_id = ? ORDER BY last_name',
      [req.params.classId]
    );

    const [scale] = await db.query(
      'SELECT * FROM grading_scale ORDER BY min_score DESC'
    );

    const [allScores] = await db.query(`
      SELECT sc.*, sub.name as subject_name
      FROM scores sc
      INNER JOIN subjects sub ON sub.id = sc.subject_id
      INNER JOIN students s ON s.id = sc.student_id
      WHERE s.class_id = ? AND sc.term = ? AND sc.year = ?
    `, [req.params.classId, term, year]);

    // Build student results
    const results = students.map(student => {
      const scores = allScores
        .filter(sc => sc.student_id === student.id)
        .map(sc => ({
          ...sc,
          grade: getGradeInfo(Number(sc.total_score), scale).grade
        }));

      const totalMarks = scores.reduce((a, s) => a + Number(s.total_score), 0);
      const avg = scores.length
        ? parseFloat((totalMarks / scores.length).toFixed(1))
        : 0;

      const gradeInfo = getGradeInfo(avg, scale);

      return {
        student,
        scores,
        totalMarks,
        average: avg,
        grade: gradeInfo.grade,
        remark: gradeInfo.remark,
        points: gradeInfo.points,
        subjectCount: scores.length
      };
    });

    // Ranking
    results.sort((a, b) => b.average - a.average);
    results.forEach((r, i) => (r.position = i + 1));

    res.json(results);

  } catch (err) {
    console.error('Results error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


/* ================================
   SINGLE STUDENT RESULTS
================================ */
router.get('/student/:studentId', async (req, res) => {
  const { term, year } = req.query;

  if (!term || !year) {
    return res.status(400).json({
      error: 'term and year are required'
    });
  }

  try {
    const [studentRows] = await db.query(`
      SELECT s.*, cs.name as class_name
      FROM students s
      LEFT JOIN class_streams cs ON cs.id = s.class_id
      WHERE s.id = ?
    `, [req.params.studentId]);

    if (!studentRows.length) {
      return res.status(404).json({
        error: 'Student not found'
      });
    }

    const student = studentRows[0];

    const [scores] = await db.query(`
      SELECT sc.*, sub.name as subject_name
      FROM scores sc
      INNER JOIN subjects sub ON sub.id = sc.subject_id
      WHERE sc.student_id = ? AND sc.term = ? AND sc.year = ?
      ORDER BY sub.name
    `, [req.params.studentId, term, year]);

    const [scale] = await db.query(
      'SELECT * FROM grading_scale ORDER BY min_score DESC'
    );

    const enrichedScores = scores.map(sc => {
      const gradeInfo = getGradeInfo(Number(sc.total_score), scale);
      return {
        ...sc,
        grade: gradeInfo.grade,
        remark: gradeInfo.remark
      };
    });

    const totalMarks = enrichedScores.reduce(
      (a, s) => a + Number(s.total_score),
      0
    );

    const avg = enrichedScores.length
      ? parseFloat((totalMarks / enrichedScores.length).toFixed(1))
      : 0;

    const gradeInfo = getGradeInfo(avg, scale);

    const [classAvgs] = await db.query(`
      SELECT s.id, AVG(sc.total_score) as avg_score
      FROM students s
      LEFT JOIN scores sc
        ON sc.student_id = s.id AND sc.term = ? AND sc.year = ?
      WHERE s.class_id = ?
      GROUP BY s.id
      ORDER BY avg_score DESC
    `, [term, year, student.class_id]);

    const overallPosition =
      classAvgs.findIndex(r => r.id === student.id) + 1;

    res.json({
      student,
      scores: enrichedScores,
      totalMarks,
      average: avg,
      grade: gradeInfo.grade,
      remark: gradeInfo.remark,
      overallPosition,
      totalStudents: classAvgs.length
    });

  } catch (err) {
    console.error('Student results error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


/* ================================
   SUBJECT PERFORMANCE (CLASS)
================================ */
router.get('/class/:classId/subject/:subjectId', async (req, res) => {
  const { term, year } = req.query;

  if (!term || !year) {
    return res.status(400).json({
      error: 'term and year are required'
    });
  }

  try {
    const [rows] = await db.query(`
      SELECT
        s.id as student_id,
        s.first_name,
        s.last_name,
        s.adm_no,
        sc.exam_score,
        sc.cat_score,
        sc.total_score
      FROM students s
      LEFT JOIN scores sc
        ON sc.student_id = s.id
        AND sc.subject_id = ?
        AND sc.term = ?
        AND sc.year = ?
      WHERE s.class_id = ?
      ORDER BY sc.total_score DESC, s.last_name
    `, [
      req.params.subjectId,
      term,
      year,
      req.params.classId
    ]);

    const [scale] = await db.query(
      'SELECT * FROM grading_scale ORDER BY min_score DESC'
    );

    const [subjectRows] = await db.query(
      'SELECT * FROM subjects WHERE id = ?',
      [req.params.subjectId]
    );

    const subject = subjectRows[0] || null;

    const enriched = rows.map((r, i) => {
      const gradeInfo = r.total_score
        ? getGradeInfo(Number(r.total_score), scale)
        : { grade: '-', remark: 'Not Assessed' };

      return {
        ...r,
        position: r.total_score ? i + 1 : '-',
        grade: gradeInfo.grade,
        remark: gradeInfo.remark
      };
    });

    const scored = enriched.filter(r => r.total_score);

    const classAverage = scored.length
      ? parseFloat(
          (scored.reduce((a, r) => a + Number(r.total_score), 0) /
            scored.length
          ).toFixed(1)
        )
      : 0;

    res.json({
      subject,
      rows: enriched,
      classAverage,
      totalStudents: rows.length,
      assessed: scored.length
    });

  } catch (err) {
    console.error('Subject performance error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
