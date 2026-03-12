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

app.post("/createacc", async (req, res) => {
    const { name } = req.body;

    try {
        //check if user already exists
        const existingUser = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [name]
        );

        if  (existingUser.rows.length > 0) {
          res.json(existingUser.rows[0]);
          return;
        }

        const result = await pool.query(
            "INSERT INTO users (email) VALUES ($1) RETURNING *",
            [name]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.post("/login", async (req, res) => {
    const { email } = req.body;

    try {
      const result = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );


      if (result.rows.length) {
        res.json(result.rows[0]);
      } else {
        res.status(401).json({ error: 'User not found' });
      }
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Failed to sign in' });
    }
});