document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const message = document.getElementById("registerMessage");

  if (!form || !message) {
    console.error("Registration form or message element is missing.");
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    message.style.display = "block";
    message.style.color = "#b0354b";
    message.textContent = "";

    if (!form.reportValidity()) return;

    const name = document.getElementById("fullName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmation = document.getElementById("confirmPassword").value;

    if (password !== confirmation) {
      message.textContent = "Passwords do not match.";
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    message.textContent = "Creating your account…";

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `The server returned an unexpected response (${response.status}). ` +
          "Check that the updated server.js is running."
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      message.style.color = "#23704a";
      message.textContent =
        "Account created successfully! Your account is now saved on the server.";

      form.reset();
    } catch (error) {
      message.style.color = "#b0354b";
      message.textContent = error.message;
      console.error("Registration failed:", error);
    } finally {
      button.disabled = false;
    }
  });
});