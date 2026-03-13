require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

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

app.post("/submitartist", async (req, res) => {
    const { artistName, spotifyID, listeners, energy, seriousness, tempo, jazz_influence, electronic_influence, rock_influence, experimental, popularity, harmonic_complexity, rhythmic_complexity, era } = req.body;

    try {
      const result = await pool.query(
        "INSERT INTO artists (name, spotify_id, listeners, energy, seriousness, tempo, jazz_influence, electronic_influence, rock_influence, experimental, popularity, harmonic_complexity, rhythmic_complexity, era) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *",
        [artistName, spotifyID, parseInt(listeners), parseInt(energy), parseInt(seriousness), parseInt(tempo), parseInt(jazz_influence), parseInt(electronic_influence), parseInt(rock_influence), parseInt(experimental), parseInt(popularity), parseInt(harmonic_complexity), parseInt(rhythmic_complexity), parseInt(era)]
      );

      console.log('Insert result:', result.rows[0]);
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Failed to submit artist' });
    }
});