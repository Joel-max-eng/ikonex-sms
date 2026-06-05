const router = require('express').Router();
const db = require('../db');

// GET scores for a student
router.get('/student/:studentId', async (req, res) => {
  const { term, year } = req.query;
  try {
    const [rows] = await db.query(`
      SELECT sc.*, sub.name as subject_name, sub.code as subject_code
      FROM scores sc
      INNER JOIN subjects sub ON sub.id = sc.subject_id
      WHERE sc.student_id = ? AND sc.term = ? AND sc.year = ?
      ORDER BY sub.name
    `, [parseInt(req.params.studentId), term, year]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET scores for a class + subject
// This is the key query — it returns ALL students in the class
// with their scores if they exist (LEFT JOIN), using student.id as the row identifier
router.get('/class/:classId/subject/:subjectId', async (req, res) => {
  const { term, year } = req.query;
  try {
    const [rows] = await db.query(`
      SELECT
        s.id        AS student_id,
        s.first_name,
        s.last_name,
        s.adm_no,
        sc.id       AS score_id,
        sc.exam_score,
        sc.cat_score,
        sc.total_score
      FROM students s
      LEFT JOIN scores sc
        ON  sc.student_id = s.id
        AND sc.subject_id = ?
        AND sc.term       = ?
        AND sc.year       = ?
      WHERE s.class_id = ?
      ORDER BY s.last_name, s.first_name
    `, [
      parseInt(req.params.subjectId),
      term,
      year,
      parseInt(req.params.classId)
    ]);
    res.json(rows);
  } catch (err) {
    console.error('GET class scores error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST — create or update a score (upsert)
router.post('/', async (req, res) => {
  // Parse everything to the correct types up front
  const student_id = parseInt(req.body.student_id);
  const subject_id = parseInt(req.body.subject_id);
  const term       = String(req.body.term);
  const year       = String(req.body.year);
  const exam_score = parseFloat(req.body.exam_score) || 0;
  const cat_score  = parseFloat(req.body.cat_score)  || 0;

  console.log('📥 Score payload received:', { student_id, subject_id, term, year, exam_score, cat_score });

  // Validate required fields
  if (!student_id || !subject_id || !term || !year) {
    return res.status(400).json({ error: 'student_id, subject_id, term and year are required' });
  }

  // Validate score ranges
  if (cat_score < 0 || cat_score > 30) {
    return res.status(400).json({ error: 'CAT score must be between 0 and 30' });
  }
  if (exam_score < 0 || exam_score > 70) {
    return res.status(400).json({ error: 'Exam score must be between 0 and 70' });
  }

  try {
    // Verify student actually exists before inserting
    const [studentCheck] = await db.query(
      'SELECT id FROM students WHERE id = ?',
      [student_id]
    );
    if (!studentCheck.length) {
      console.error(`❌ Student not found: ${student_id}`);
      return res.status(404).json({ error: `Student with id ${student_id} does not exist` });
    }

    // Verify subject actually exists
    const [subjectCheck] = await db.query(
      'SELECT id FROM subjects WHERE id = ?',
      [subject_id]
    );
    if (!subjectCheck.length) {
      console.error(`❌ Subject not found: ${subject_id}`);
      return res.status(404).json({ error: `Subject with id ${subject_id} does not exist` });
    }

    // Upsert — insert or update if duplicate
    await db.query(`
      INSERT INTO scores (student_id, subject_id, term, year, exam_score, cat_score)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        exam_score = VALUES(exam_score),
        cat_score  = VALUES(cat_score)
    `, [student_id, subject_id, term, year, exam_score, cat_score]);

    console.log(`✅ Score saved — student:${student_id} subject:${subject_id} term:${term} year:${year}`);
    res.json({ message: 'Score saved successfully' });

  } catch (err) {
    console.error('❌ Score insert error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE score by id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM scores WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ message: 'Score deleted successfully' });
  } catch (err) {
    console.error('DELETE score error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;