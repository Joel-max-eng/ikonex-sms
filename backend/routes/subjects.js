const router = require('express').Router();
const db = require('../db');

// GET all subjects
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM subjects ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET subjects for a class
router.get('/class/:classId', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT sub.*
      FROM subjects sub
      INNER JOIN stream_subjects ss ON ss.subject_id = sub.id
      WHERE ss.class_id = ?
      ORDER BY sub.name
    `, [req.params.classId]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE subject
router.post('/', async (req, res) => {
  const { name, code, max_score } = req.body;

  if (!name || !code) {
    return res.status(400).json({
      error: 'name and code are required'
    });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO subjects (name, code, max_score)
       VALUES (?,?,?)`,
      [name, code, max_score || 100]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Subject created successfully'
    });

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Subject code already exists'
      });
    }

    res.status(500).json({ error: err.message });
  }
});

// UPDATE subject
router.put('/:id', async (req, res) => {
  const { name, code, max_score } = req.body;

  if (!name || !code) {
    return res.status(400).json({
      error: 'name and code are required'
    });
  }

  try {
    const [result] = await db.query(
      `UPDATE subjects 
       SET name=?, code=?, max_score=?
       WHERE id=?`,
      [name, code, max_score || 100, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Subject not found'
      });
    }

    res.json({ message: 'Updated successfully' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE subject
router.delete('/:id', async (req, res) => {
  try {
    const [linked] = await db.query(
      'SELECT id FROM stream_subjects WHERE subject_id = ?',
      [req.params.id]
    );

    if (linked.length > 0) {
      return res.status(409).json({
        error: 'Cannot delete subject assigned to classes'
      });
    }

    const [result] = await db.query(
      'DELETE FROM subjects WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Subject not found'
      });
    }

    res.json({ message: 'Deleted successfully' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ASSIGN subject to class
router.post('/assign', async (req, res) => {
  const { class_id, subject_id } = req.body;

  if (!class_id || !subject_id) {
    return res.status(400).json({
      error: 'class_id and subject_id are required'
    });
  }

  try {
    await db.query(
      `INSERT IGNORE INTO stream_subjects (class_id, subject_id)
       VALUES (?,?)`,
      [class_id, subject_id]
    );

    res.json({ message: 'Subject assigned to class' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REMOVE subject from class
router.delete('/assign/:classId/:subjectId', async (req, res) => {
  try {
    const [result] = await db.query(
      `DELETE FROM stream_subjects 
       WHERE class_id=? AND subject_id=?`,
      [req.params.classId, req.params.subjectId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Assignment not found'
      });
    }

    res.json({ message: 'Subject removed from class' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
