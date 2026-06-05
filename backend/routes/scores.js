const router = require('express').Router();
const db = require('../db');

// GET scores for a student
router.get('/student/:studentId', async (req, res) => {
  const { term, year } = req.query;

  if (!term || !year) {
    return res.status(400).json({
      error: 'term and year are required'
    });
  }

  try {
    const [rows] = await db.query(`
      SELECT sc.*, sub.name as subject_name, sub.code as subject_code
      FROM scores sc
      INNER JOIN subjects sub ON sub.id = sc.subject_id
      WHERE sc.student_id = ? AND sc.term = ? AND sc.year = ?
      ORDER BY sub.name
    `, [req.params.studentId, term, year]);

    res.json(rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET class + subject scores (for marking screen)
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
        s.id AS student_id,
        s.first_name,
        s.last_name,
        s.adm_no,
        sc.id AS score_id,
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
      ORDER BY s.last_name, s.first_name
    `, [
      req.params.subjectId,
      term,
      year,
      req.params.classId
    ]);

    res.json(rows);

  } catch (err) {
    console.error('GET class scores error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// POST (INSERT or UPDATE score)
router.post('/', async (req, res) => {
  const student_id = Number(req.body.student_id);
  const subject_id = Number(req.body.subject_id);
  const term = req.body.term;
  const year = req.body.year;
  const exam_score = Number(req.body.exam_score);
  const cat_score = Number(req.body.cat_score);

  // validation
  if (!student_id || !subject_id || !term || !year) {
    return res.status(400).json({
      error: 'student_id, subject_id, term and year are required'
    });
  }

  if (cat_score < 0 || cat_score > 30) {
    return res.status(400).json({
      error: 'CAT score must be between 0 and 30'
    });
  }

  if (exam_score < 0 || exam_score > 70) {
    return res.status(400).json({
      error: 'Exam score must be between 0 and 70'
    });
  }

  try {
    // verify student
    const [student] = await db.query(
      'SELECT id FROM students WHERE id = ?',
      [student_id]
    );

    if (!student.length) {
      return res.status(404).json({
        error: 'Student not found'
      });
    }

    // verify subject
    const [subject] = await db.query(
      'SELECT id FROM subjects WHERE id = ?',
      [subject_id]
    );

    if (!subject.length) {
      return res.status(404).json({
        error: 'Subject not found'
      });
    }

    // UPSERT score
    await db.query(`
      INSERT INTO scores
      (student_id, subject_id, term, year, exam_score, cat_score)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        exam_score = VALUES(exam_score),
        cat_score = VALUES(cat_score)
    `, [
      student_id,
      subject_id,
      term,
      year,
      exam_score,
      cat_score
    ]);

    res.json({ message: 'Score saved successfully' });

  } catch (err) {
    console.error('Score insert error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// DELETE score
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM scores WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Score not found'
      });
    }

    res.json({ message: 'Score deleted successfully' });

  } catch (err) {
    console.error('DELETE score error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
