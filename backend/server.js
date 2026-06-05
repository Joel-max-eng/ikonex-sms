const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Ikonex SMS API running ✅' });
});

const PORT = process.env.PORT;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
