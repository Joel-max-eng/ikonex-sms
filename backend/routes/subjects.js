const router = require('express').Router();
const db = require('../db');

// GET all subjects
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM subjects ORDER BY name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET subjects for a class
router.get('/class/:classId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT sub.* FROM subjects sub
      INNER JOIN stream_subjects ss ON ss.subject_id = sub.id
      WHERE ss.class_id = ?
      ORDER BY sub.name
    `, [req.params.classId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create subject
router.post('/', async (req, res) => {
  const { name, code, max_score } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'name and code are required' });
  try {
    const [result] = await db.query(
      'INSERT INTO subjects (name, code, max_score) VALUES (?,?,?)',
      [name, code, max_score || 100]
    );
    res.status(201).json({ id: result.insertId, name, code, max_score });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Subject code already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT update subject
router.put('/:id', async (req, res) => {
  const { name, code, max_score } = req.body;
  try {
    await db.query('UPDATE subjects SET name=?, code=?, max_score=? WHERE id=?', [name, code, max_score, req.params.id]);
    res.json({ message: 'Updated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE subject
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM subjects WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST assign subject to class
router.post('/assign', async (req, res) => {
  const { class_id, subject_id } = req.body;
  try {
    await db.query('INSERT IGNORE INTO stream_subjects (class_id, subject_id) VALUES (?,?)', [class_id, subject_id]);
    res.json({ message: 'Subject assigned to class' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE unassign subject from class
router.delete('/assign/:classId/:subjectId', async (req, res) => {
  try {
    await db.query('DELETE FROM stream_subjects WHERE class_id=? AND subject_id=?', [req.params.classId, req.params.subjectId]);
    res.json({ message: 'Subject removed from class' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;