require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
});

pool.on('error', (err) => {
  console.error('Unexpected idle client error', err);
});

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT email FROM users LIMIT 1');
    if (result.rows.length) {
      res.send(result.rows[0].email);
    } else {
      res.send('No email found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});