const insertArtistForm = document.getElementById('insertArtistForm');
const signInForm = document.getElementById('signInForm');
const createAccountForm = document.getElementById('createAccountForm');
const logoutButton = document.getElementById('logoutButton');
const insertPersonalityForm = document.getElementById('insertPersonalityForm');
const output = document.getElementById('output');
const results = document.getElementById('results');
const compareButton = document.getElementById('compareButton');
const artistSuccess = document.getElementById('artistSuccess');
const artistSuccessMessage = document.getElementById('artistSuccessMessage');
const signinButton = document.getElementById('signinButton');

const DEFAULT_NEXT_PAGE = '/personality';

function normalizeNextPage(next) {
  if (!next) return DEFAULT_NEXT_PAGE;
  if (next === '/signin' || next === '/login') return DEFAULT_NEXT_PAGE;
  try {
    const url = new URL(next, window.location.origin);
    if (url.origin !== window.location.origin) return DEFAULT_NEXT_PAGE;
    return url.pathname + url.search;
  } catch {
    return DEFAULT_NEXT_PAGE;
  }
}

function getNextPage() {
  const params = new URLSearchParams(window.location.search);
  const nextFromQuery = params.get('next');
  if (nextFromQuery) return normalizeNextPage(nextFromQuery);

  const saved = sessionStorage.getItem('signinNext');
  return normalizeNextPage(saved);
}

function saveNextPage() {
  const next = window.location.pathname + window.location.search;
  sessionStorage.setItem('signinNext', next);
}

if (signinButton && window.location.pathname !== '/signin') {
  signinButton.addEventListener('click', saveNextPage);
}

if (signInForm) {
  signInForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent the default form submission

    const email = signInForm.querySelector('#sign-email').value.trim();
    const password = signInForm.querySelector('#sign-password').value;

    if (!email || !password) {
        output.innerText = "Please enter an email and password.";
        return;
    }

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            const redirectTo = getNextPage();
            sessionStorage.removeItem('signinNext');
            output.innerText = `Logged in as: ${data.email} (ID: ${data.id}). Redirecting...`;
            window.location.href = redirectTo;
        } else {
            output.innerText = data.error || "Login failed.";
        }
    } catch (error) {
        output.innerText = "Error logging in: " + error.message;
    }
  });
}

if (createAccountForm) {
  createAccountForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent the default form submission

    const email = document.querySelector('#createAccountForm #create-email').value.trim();
    const password = document.querySelector('#createAccountForm #create-password').value;

    if (!email) {
        output.innerText = "Please enter an email address.";
        return;
    }

    try {
        const response = await fetch("/createacc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            output.innerText = data.error || "Failed to create user.";
            return;
        }

        const redirectTo = getNextPage();
        sessionStorage.removeItem('signinNext');
        window.location.href = redirectTo;
    } catch (error) {
        output.innerText = "Error creating user: " + error.message;
    }
  });
}

if (insertArtistForm) {
  insertArtistForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent the default form submission

    const password = document.getElementById('passwordInput').value;
    const passwordOutput = document.getElementById('passwordOutput');
    const formOutput = document.getElementById('formOutput');

    if (!password) {
        passwordOutput.innerText = "Please enter a password.";
        return;
    }

    try {
        // First, verify the password
        const passwordResponse = await fetch("/verifypassword", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });

        if (!passwordResponse.ok) {
            const data = await passwordResponse.json();
            passwordOutput.innerText = data.error || "Invalid password.";
            return;
        }

        // Password is correct, proceed with artist submission
        const artistName = document.getElementById('artistName').value;
        const spotifyID = document.getElementById('spotifyID').value;
        const listeners = document.getElementById('listeners').value;
        const energy = document.getElementById('energy').value;
        const seriousness = document.getElementById('seriousness').value;
        const tempo = document.getElementById('tempo').value;
        const jazz_influence = document.getElementById('jazz_influence').value;
        const electronic_influence = document.getElementById('electronic_influence').value;
        const rock_influence = document.getElementById('rock_influence').value;
        const experimental = document.getElementById('experimental').value;
        const popularity = document.getElementById('popularity').value;
        const harmonic_complexity = document.getElementById('harmonic_complexity').value;
        const rhythmic_complexity = document.getElementById('rhythmic_complexity').value;
        const era = document.getElementById('era').value;

        const response = await fetch("/submitartist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                artistName,
                spotifyID,
                listeners,
                energy,
                seriousness,
                tempo,
                jazz_influence,
                electronic_influence,
                rock_influence,
                experimental,
                popularity,
                harmonic_complexity,
                rhythmic_complexity,
                era
            })
        });

        const data = await response.json();
        console.log('Server response:', response.status, data);

        if (response.ok) {
          if (artistSuccess && artistSuccessMessage) {
            artistSuccessMessage.innerText = `ID: ${data.id}\nName: ${data.name}`;
            artistSuccess.style.display = 'block';
          }
          formOutput.innerText = '';
        } else {
          if (artistSuccess) artistSuccess.style.display = 'none';
          formOutput.innerText = data.error || "Failed to submit artist.";
        }
    } catch (error) {
        formOutput.innerText = "Error: " + error.message;
    }
  });
}

if (insertPersonalityForm) {
  insertPersonalityForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent the default form submission

    const energy = document.getElementById('energy').value;
    const seriousness = document.getElementById('seriousness').value;
    const tempo = document.getElementById('tempo').value;
    const jazz_influence = document.getElementById('jazz_influence').value;
    const electronic_influence = document.getElementById('electronic_influence').value;
    const rock_influence = document.getElementById('rock_influence').value;
    const experimental = document.getElementById('experimental').value;
    const popularity = document.getElementById('popularity').value;
    const harmonic_complexity = document.getElementById('harmonic_complexity').value;
    const rhythmic_complexity = document.getElementById('rhythmic_complexity').value;
    const era = document.getElementById('era').value;


    try {
        const response = await fetch("/submitpersonality", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                energy,
                seriousness,
                tempo,
                jazz_influence,
                electronic_influence,
                rock_influence,
                experimental,
                popularity,
                harmonic_complexity,
                rhythmic_complexity,
                era
            })
        });

        const data = await response.json();
        console.log('Server response:', response.status, data);

        if (response.ok) {
          output.innerText = `Personality saved for: ${data.email}`;
        } else {
          output.innerText = data.error || "Failed to submit personality.";
        }
    } catch (error) {
        output.innerText = "Error submitting personality: " + error.message;
    }
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", logout);
}

async function logout() {
  try {
    const response = await fetch("/logout", { method: "POST" });
    if (response.ok) {
      window.location.href = '/';
    } else {
      output.innerText = "Logout failed.";
    }
  } catch (error) {
    output.innerText = "Error logging out: " + error.message;
  }
}

if (compareButton) {
  compareButton.addEventListener("click", compare);
}

async function compare() {
  try {
    const response = await fetch("/meEverything");
    const data = await response.json();

    if (!response.ok) {
      results.innerHTML = data.error || "Failed to compare.";
      return;
    }

    if (!data.match) {
      results.innerHTML = "No artist match found yet.";
      return;
    }

    const { match, score, artistImage } = data;
    const percentageScore = (110 - score) / 110 * 100; // Convert distance to percentage match
    results.innerHTML = `
      ${artistImage ? `<img src="${artistImage}" alt="${match.name}" style="width:200px;height:200px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 16px;">` : ''}
      <p style="color:white;font-size:1.4em;text-align:center;">${match.name}</p>
      <p style="color:#ccc;text-align:center;">Match score: ${percentageScore.toFixed(1)}%</p>
    `;
  } catch (error) {
    results.innerHTML = "Error comparing personality: " + error.message;
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  const signinButton = document.getElementById('signinButton');
  try {
    const response = await fetch("/me");
    if (response.ok) {
      const data = await response.json();
      if (output) output.innerText = `${data.email}`;
      if (signinButton) signinButton.style.display = 'none';
      if (logoutButton) logoutButton.style.display = 'inline-block';
    } else {
      if (output) output.innerText = '';
      if (signinButton) signinButton.style.display = 'inline-block';
      if (logoutButton) logoutButton.style.display = 'none';
      const path = window.location.pathname;
      if (path !== '/signin' && path !== '/' && path !== '/index' && path !== '/about') {
        saveNextPage();
        window.location.href = '/signin?next=' + encodeURIComponent(path + window.location.search);
      }
    }
  } catch (error) {
    console.error("Error checking login status:", error);
  }
});