
document.addEventListener("DOMContentLoaded", async () => {
  // Footer year
  const year = document.getElementById("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  // Mobile navigation
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");

  if (menuButton && nav) {
    menuButton.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");

      menuButton.setAttribute(
        "aria-expanded",
        String(isOpen)
      );
    });
  }

  // Check login through MongoDB backend
  await updateNavigation();
});

async function updateNavigation() {
  const navActions = document.getElementById("navActions");

  if (!navActions) return;

  try {
    const response = await fetch("/api/auth/me", {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (response.status === 401) return;
    if (!response.ok) {
      throw new Error("Unable to check login session.");
    }

    const data = await response.json();

    if (data.user) {
      navActions.innerHTML = `
        <a class="login-link" href="dashboard.html">
          My dashboard
        </a>
        <a class="button button-small" href="create-blog.html">
          Write a story ↗
        </a>
      `;
    }
  } catch (error) {
    console.error("Navigation error:", error);
  }
}
