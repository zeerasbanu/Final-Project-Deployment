document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const message = document.getElementById("loginMessage");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    message.style.display = "block";
    message.textContent = "";

    if (!form.reportValidity()) return;

    const email =
      document.getElementById("loginEmail").value.trim();

    const password =
      document.getElementById("loginPassword").value;

    const button = form.querySelector('button[type="submit"]');

    button.disabled = true;
    message.textContent = "Logging in…";

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Unexpected server response (${response.status}). Restart the updated server.`
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      message.textContent = "Logged in successfully!";

      window.location.href = "dashboard.html";
    } catch (error) {
      message.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

  document
    .getElementById("toggleLoginPassword")
    ?.addEventListener("click", (event) => {
      event.preventDefault();

      const input = document.getElementById("loginPassword");
      const show = input.type === "password";

      input.type = show ? "text" : "password";
      event.currentTarget.textContent = show
        ? "Hide password"
        : "Show password";
    });
});