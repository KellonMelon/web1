require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');

const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

async function refreshSpotifyToken() {
  const data = await spotifyApi.clientCredentialsGrant();
  spotifyApi.setAccessToken(data.body['access_token']);
  // Re-run 5 minutes before the token expires (tokens last 3600s)
  setTimeout(refreshSpotifyToken, (data.body['expires_in'] - 300) * 1000);
}
refreshSpotifyToken().catch(err => console.error('Spotify token error:', err));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'), { extensions: ['html'] }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
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
            //return res.status(409).json({ error: 'User already exists' });
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

            return res.json({ id: user.id, email: user.email });
            }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const result = await pool.query(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
            [email, hashedPassword]
        );

        const user = result.rows[0];
        req.session.userId = user.id;
        req.session.email = user.email;
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ error: 'Session error' });
            }
            res.json(user);
        });
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
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { energy, seriousness, tempo, jazz_influence, electronic_influence, rock_influence, experimental, popularity, harmonic_complexity, rhythmic_complexity, era } = req.body;

    try {
      const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [req.session.userId]);
      if (userCheck.rows.length === 0) {
          return res.status(401).json({ error: 'User not found' });
      }

      const result = await pool.query(
        "UPDATE users SET energy=$1, seriousness=$2, tempo=$3, jazz_influence=$4, electronic_influence=$5, rock_influence=$6, experimental=$7, popularity=$8, harmonic_complexity=$9, rhythmic_complexity=$10, era=$11 WHERE id=$12 RETURNING id, email",
        [parseInt(energy), parseInt(seriousness), parseInt(tempo), parseInt(jazz_influence), parseInt(electronic_influence), parseInt(rock_influence), parseInt(experimental), parseInt(popularity), parseInt(harmonic_complexity), parseInt(rhythmic_complexity), parseInt(era), req.session.userId]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Failed to submit personality' });
    }
});

app.get("/me", (req, res) => {
  if (req.session.userId) {
    res.json({ id: req.session.userId, email: req.session.email });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

app.get("/meEverything", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not logged in' });
    }
    try {
        const userResult = await pool.query(
            "SELECT id, email, energy, seriousness, tempo, jazz_influence, electronic_influence, rock_influence, experimental, popularity, harmonic_complexity, rhythmic_complexity, era FROM users WHERE id = $1",
            [req.session.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];
        const artistsResult = await pool.query("SELECT * FROM artists ORDER BY id ASC");

        if (artistsResult.rows.length === 0) {
            return res.status(404).json({ error: 'No artists found' });
        }

        let bestArtist = null;
        let bestScore = Number.POSITIVE_INFINITY;

        for (const artist of artistsResult.rows) {
            const energyDifference = Math.abs(Number(user.energy) - Number(artist.energy));
            const seriousnessDifference = Math.abs(Number(user.seriousness) - Number(artist.seriousness));
            const tempoDifference = Math.abs(Number(user.tempo) - Number(artist.tempo));
            const jazzDifference = 2 * Math.abs(Number(user.jazz_influence) - Number(artist.jazz_influence));
            const electronicDifference = 2 * Math.abs(Number(user.electronic_influence) - Number(artist.electronic_influence));
            const rockDifference = 2 * Math.abs(Number(user.rock_influence) - Number(artist.rock_influence));
            const experimentalDifference = Math.abs(Number(user.experimental) - Number(artist.experimental));
            const popularityDifference = Math.abs(Number(user.popularity) - Number(artist.popularity));
            const harmonicDifference = Math.abs(Number(user.harmonic_complexity) - Number(artist.harmonic_complexity));
            const rhythmicDifference = Math.abs(Number(user.rhythmic_complexity) - Number(artist.rhythmic_complexity));
            const eraDifference = Math.abs(Number(user.era) - Number(artist.era));

            const score = energyDifference + seriousnessDifference + tempoDifference + jazzDifference + electronicDifference + rockDifference + experimentalDifference + popularityDifference + harmonicDifference + rhythmicDifference + eraDifference;

            if (score < bestScore) {
                bestScore = score;
                bestArtist = artist;
            }
        }

        let artistImage = null;
        if (bestArtist && bestArtist.spotify_id) {
            try {
                const spotifyData = await spotifyApi.getArtist(bestArtist.spotify_id);
                const images = spotifyData.body.images;
                if (images && images.length > 0) {
                    artistImage = images[0].url;
                }
            } catch (err) {
                console.error('Spotify image fetch error:', err.message);
            }
        }

        return res.json({
            id: user.id,
            email: user.email,
            finalColumn: bestArtist ? bestArtist.id : null,
            score: Number.isFinite(bestScore) ? bestScore : null,
            match: bestArtist,
            artistImage
        });
    } catch (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to compare personality' });
    }
});