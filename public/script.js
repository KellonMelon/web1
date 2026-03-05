const button = document.getElementById('addUserBtn');
const userForm = document.getElementById('userForm');
const output = document.getElementById('output');

button.addEventListener("click", async () => {
    const response = await fetch("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Test User"
        })
    });

    const data = await response.json();

    output.innerText = `User created:
    ID: ${data.id}
    Name: ${data.name}`;
});

userForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent the default form submission

    const email = document.getElementById('email').value;

    if (!email) {
        output.innerText = "Please enter an email address.";
        return;
    }

    try {
        const response = await fetch("/users", {
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