const insertArtistForm = document.getElementById('insertArtistForm');
const signInForm = document.getElementById('signInForm');
const createAccountForm = document.getElementById('createAccountForm');
const logoutButton = document.getElementById('logoutButton');
const insertPersonalityForm = document.getElementById('insertPersonalityForm');
const output = document.getElementById('output');
const compareButton = document.getElementById('compareButton');


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
            output.innerText = `Logged in as: ${data.email} (ID: ${data.id})`;
            window.location.href = '/personality';
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

        window.location.href = '/personality';
    } catch (error) {
        output.innerText = "Error creating user: " + error.message;
    }
  });
}

if (insertArtistForm) {
  insertArtistForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent the default form submission

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


    try {
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
          output.innerText = `Artist submitted:
          ID: ${data.id}
          Name: ${data.name}`;
        } else {
          output.innerText = data.error || "Failed to submit artist.";
        }
    } catch (error) {
        output.innerText = "Error submitting artist: " + error.message;
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
      output.innerText = "Logged out successfully.";
      // Update UI as needed
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
      output.innerText = data.error || "Failed to compare.";
      return;
    }

    if (!data.match) {
      output.innerText = "No artist match found yet.";
      return;
    }

    output.innerText = `Best match: ${data.match.name} (artist id: ${data.match.id}, score: ${data.score})`;
  } catch (error) {
    output.innerText = "Error comparing personality: " + error.message;
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch("/me");
    if (response.ok) {
      const data = await response.json();
      output.innerText = `Welcome back: ${data.email}`;
    } else {
      output.innerText = "Not logged in.";
      if (window.location.pathname !== '/signin') {
        window.location.href = '/signin';
      }
    }
  } catch (error) {
    console.error("Error checking login status:", error);
  }
});