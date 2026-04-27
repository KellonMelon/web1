// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// defining constants for using packages
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');

const SpotifyWebApi = require('spotify-web-api-node');

// setting up variables for Spotify API
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// Function to refresh Spotify access token
async function refreshSpotifyToken() {
  const data = await spotifyApi.clientCredentialsGrant();
  spotifyApi.setAccessToken(data.body['access_token']);
  // Re-run 5 minutes before the token expires (tokens last 3600s)
  setTimeout(refreshSpotifyToken, (data.body['expires_in'] - 300) * 1000);
}
refreshSpotifyToken().catch(err => console.error('Spotify token error:', err));

// Create Express app and defines session
const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'), { extensions: ['html'] }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
        } // Set to true if using HTTPS
}));

// Create a PostgreSQL connection pool
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

// Defines port for server to listen on (.env), backup is 3000
const port = process.env.PORT || 3000;

// Start the server, logged in console
app.listen(port, () => {
  const publicPort = process.env.PUBLIC_PORT || 443;
  console.log(`Server listening on port ${port} (publicly forwarded via Nginx on port ${publicPort})`);
});

// Function to verify password against bcrypt hash
async function verifyPassword(plainPassword, hashToCompare) {
  try {
    const isValid = await bcrypt.compare(plainPassword, hashToCompare);
    return isValid;
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

// Endpoint to create account, also handles login if user already exists
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

        // Saving session
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

// Endpoint to log in, checks password and sets session
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

// Endpoint to log out, destroys session
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

// Endpoint to submit artist data, inserts into database
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

// Endpoint to submit personality data, updates user in database
app.post("/submitpersonality", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { energy, seriousness, tempo, jazz_influence, electronic_influence, rock_influence, experimental, popularity, harmonic_complexity, rhythmic_complexity, era } = req.body;

    // First checks if user exists using ID
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

// Endpoint to get current user info, checks session
app.get("/me", (req, res) => {
  if (req.session.userId) {
    res.json({ id: req.session.userId, email: req.session.email });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});


// Endpoint to compare user personality with artists, returns best match and score
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

        // Math for comparing artists to users, lower score wins. Genres are weighted more (x2)
        // Currently, if a duplicate artist exists, the last one in the database will be selected
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

        // Fetch artist image from Spotify
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

        // Return user info along with best artist match and score
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

// Password verification endpoint for input.html
app.post("/verifypassword", async (req, res) => {
    const { password } = req.body;
    
    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    // It's "adminpassword". I would probably store this in a database or environment variable in a real application, but hardcoding is fine for this simple use case. The hash was generated using bcrypt with 10 salt rounds.
    const savedHash = "$2b$10$ISpqqCudMLvfzPhtvEJGpOEivQNzP/wQMwIHP2kl7jvzxXVBMfEjG";
    
    try {
        const isValid = await verifyPassword(password, savedHash);
        
        if (isValid) {
            res.json({ success: true, message: 'Password is correct' });
        } else {
            res.status(401).json({ success: false, error: 'Invalid password' });
        }
    } catch (err) {
        console.error('Password verification error:', err);
        res.status(500).json({ error: 'Verification failed' });
    }
});