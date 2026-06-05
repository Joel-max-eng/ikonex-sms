const router = require('express').Router();
const db = require('../db');

// GET all students (with class name)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, cs.name as class_name
      FROM students s
      LEFT JOIN class_streams cs ON cs.id = s.class_id
      ORDER BY s.last_name, s.first_name
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET students by class
router.get('/class/:classId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, cs.name as class_name
      FROM students s
      LEFT JOIN class_streams cs ON cs.id = s.class_id
      WHERE s.class_id = ?
      ORDER BY s.last_name, s.first_name
    `, [req.params.classId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single student
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, cs.name as class_name
      FROM students s LEFT JOIN class_streams cs ON cs.id = s.class_id
      WHERE s.id = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Student not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST register student
router.post('/', async (req, res) => {
  const { adm_no, first_name, last_name, gender, dob, class_id, guardian_name, guardian_phone } = req.body;
  if (!adm_no || !first_name || !last_name || !gender || !class_id)
    return res.status(400).json({ error: 'adm_no, first_name, last_name, gender and class_id are required' });
  try {
    const [result] = await db.query(
      'INSERT INTO students (adm_no,first_name,last_name,gender,dob,class_id,guardian_name,guardian_phone) VALUES (?,?,?,?,?,?,?,?)',
      [adm_no, first_name, last_name, gender, dob, class_id, guardian_name, guardian_phone]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Admission number already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT update student
router.put('/:id', async (req, res) => {
  const { adm_no, first_name, last_name, gender, dob, class_id, guardian_name, guardian_phone } = req.body;
  try {
    await db.query(
      'UPDATE students SET adm_no=?,first_name=?,last_name=?,gender=?,dob=?,class_id=?,guardian_name=?,guardian_phone=? WHERE id=?',
      [adm_no, first_name, last_name, gender, dob, class_id, guardian_name, guardian_phone, req.params.id]
    );
    res.json({ message: 'Updated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE student
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;