const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/classes',    require('./routes/classes'));
app.use('/api/students',   require('./routes/students'));
app.use('/api/subjects',   require('./routes/subjects'));
app.use('/api/scores',     require('./routes/scores'));
app.use('/api/results',    require('./routes/results'));
app.use('/api/reports',    require('./routes/reports'));

app.get('/', (req, res) => res.json({ message: 'Ikonex SMS API running ✅' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
