const router = require('express').Router();
const db = require('../db');

// GET all classes
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT cs.*, COUNT(s.id) as student_count
      FROM class_streams cs
      LEFT JOIN students s ON s.class_id = cs.id
      GROUP BY cs.id
      ORDER BY cs.name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single class
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM class_streams WHERE id = ?',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create class
router.post('/', async (req, res) => {
  const { name, year_group, section, capacity } = req.body;

  if (!name || !year_group || !section) {
    return res.status(400).json({
      error: 'name, year_group and section are required'
    });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO class_streams (name, year_group, section, capacity) VALUES (?,?,?,?)',
      [name, year_group, section, capacity || 40]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      year_group,
      section,
      capacity: capacity || 40
    });

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Class name already exists' });
    }

    res.status(500).json({ error: err.message });
  }
});

// PUT update class (FIXED validation)
router.put('/:id', async (req, res) => {
  const { name, year_group, section, capacity } = req.body;

  if (!name || !year_group || !section) {
    return res.status(400).json({
      error: 'name, year_group and section are required'
    });
  }

  try {
    const [result] = await db.query(
      'UPDATE class_streams SET name=?, year_group=?, section=?, capacity=? WHERE id=?',
      [name, year_group, section, capacity || 40, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({ message: 'Updated successfully' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE class (SAFE)
router.delete('/:id', async (req, res) => {
  try {
    const [students] = await db.query(
      'SELECT id FROM students WHERE class_id = ?',
      [req.params.id]
    );

    if (students.length > 0) {
      return res.status(409).json({
        error: `Cannot delete — ${students.length} student(s) still assigned to this class`
      });
    }

    const [result] = await db.query(
      'DELETE FROM class_streams WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({ message: 'Deleted successfully' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
