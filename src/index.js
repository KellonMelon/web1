require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 day
        } // Set to true if using HTTPS
}));

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
    const { email, password } = req.body;

    if (!email || !password || password.length < 6) {
        return res.status(400).json({ error: 'Email and password required (min 6 chars)' });
    }

    try {
        // Check if user already exists
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const result = await pool.query(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
            [email, hashedPassword]
        );

        res.json(result.rows[0]);  // Return user data without the hash
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;  // Now expecting 'password' in the request body

    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    try {
        const result = await pool.query(
            "SELECT id, email, password_hash FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];
        //console.log(user.password_hash);
        const isValidPassword = await bcrypt.compare(password, user.password_hash);


        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Password is valid; set session before sending response
        req.session.userId = user.id;
        req.session.email = user.email;

        res.json({ id: user.id, email: user.email });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to sign in' });
    }
});

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
            return res.status(500).json({ error: 'Failed to log out' });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.json({ message: 'Logged out successfully' });
    });
});

app.post("/submitartist", async (req, res) => {
    const { artistName, spotifyID, listeners, energy, seriousness, tempo, jazz_influence, electronic_influence, rock_influence, experimental, popularity, harmonic_complexity, rhythmic_complexity, era } = req.body;

    if (!req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

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

app.post("/submitpersonality", async (req, res) => {
    const {email, id, password_hash, energy, seriousness, tempo, jazz_influence, electronic_influence, rock_influence, experimental, popularity, harmonic_complexity, rhythmic_complexity, era } = req.body;

    if (!req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const result = await pool.query(
        "INSERT INTO users (email, energy, seriousness, tempo, jazz_influence, electronic_influence, rock_influence, experimental, popularity, harmonic_complexity, rhythmic_complexity, era) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *",
        [email, parseInt(energy), parseInt(seriousness), parseInt(tempo), parseInt(jazz_influence), parseInt(electronic_influence), parseInt(rock_influence), parseInt(experimental), parseInt(popularity), parseInt(harmonic_complexity), parseInt(rhythmic_complexity), parseInt(era)]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Failed to submit personality into users' });
    }
});

app.get("/me", (req, res) => {
  if (req.session.userId) {
    res.json({ id: req.session.userId, email: req.session.email });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});