const signInForm = document.getElementById('signInForm');
const createAccountForm = document.getElementById('createAccountForm');
const output = document.getElementById('output');


signInForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent the default form submission

    const email = signInForm.querySelector('#email').value.trim();

    if (!email) {
        output.innerText = "Please enter an email address.";
        return;
    }

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            // Store logged-in user in localStorage
            localStorage.setItem('loggedInUser', JSON.stringify(data));
            output.innerText = `Logged in as: ${data.email} (ID: ${data.id})`;
            // Optionally hide forms or show logged-in UI
        } else {
            output.innerText = data.error || "Login failed.";
        }
    } catch (error) {
        output.innerText = "Error logging in: " + error.message;
    }
});

createAccountForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent the default form submission

    const email = document.getElementById('email').value;

    if (!email) {
        output.innerText = "Please enter an email address.";
        return;
    }

    try {
        const response = await fetch("/createacc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: email
            })
        });

        const data = await response.json();

        output.innerText = `User created:
        ID: ${data.id}
        Email: ${data.email}`;
    } catch (error) {
        output.innerText = "Error creating user: " + error.message;
    }
});