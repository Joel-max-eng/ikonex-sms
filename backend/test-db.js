const pool = require('./db');

async function test() {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    console.log('✅ Database connected! Result:', rows[0].result);

    const [classes] = await pool.query('SELECT * FROM class_streams');
    console.log('✅ Classes found:', classes.length);

    const [students] = await pool.query('SELECT * FROM students');
    console.log('✅ Students found:', students.length);

  } catch (err) {
    console.log('❌ Database error:', err.message);
  }
  process.exit();
}

test();