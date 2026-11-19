document.addEventListener("DOMContentLoaded", () => {
  const main = document.querySelector("main");
  const logoutButton = document.getElementById("logoutButton");
  const tableBody = document.getElementById("dashboardPosts");

  main.hidden = true;

  const message = document.createElement("p");
  message.className = "form-message";
  message.setAttribute("role", "alert");
  main.before(message);

  function showError(text) {
    message.style.display = "block";
    message.textContent = text;
  }

  async function request(url, method = "GET") {
    const response = await fetch(url, {
      method,
      credentials: "same-origin",
      cache: "no-store",
    });

    if (response.status === 401) {
      window.location.replace("login.html");
      throw new Error("Please log in first.");
    }

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
      throw new Error(data.message || "Request failed.");
    }

    return data;
  }

  async function loadStories() {
    const { blogs } = await request("/api/blogs/mine");

   document.getElementById("profileTotal").textContent =
  blogs.length;


    document.getElementById("totalStories").textContent =
      blogs.length;

    document.getElementById("publishedStories").textContent =
      blogs.filter((blog) => blog.status === "published").length;

    document.getElementById("draftStories").textContent =
      blogs.filter((blog) => blog.status === "draft").length;

    document.getElementById("dashboardEmpty").hidden =
      blogs.length > 0;

    tableBody.replaceChildren();

    for (const blog of blogs) {
      const row = document.createElement("tr");

      const values = [
        blog.title,
        blog.category || "Uncategorised",
        blog.status === "published" ? "Published" : "Draft",
        new Date(blog.createdAt).toLocaleDateString(),
      ];

      for (const value of values) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      }

      const actions = document.createElement("td");

      // EDIT BUTTON
      const editLink = document.createElement("a");
      editLink.textContent = "Edit";
      editLink.className = "text-link";
      editLink.href =
        `create-blog.html?id=${encodeURIComponent(blog.id)}`;

      // DELETE BUTTON
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.className = "delete-button";

      deleteButton.style.marginLeft = "16px";
      deleteButton.style.color = "#b0354b";
      deleteButton.style.background = "transparent";
      deleteButton.style.border = "none";
      deleteButton.style.cursor = "pointer";

      deleteButton.addEventListener("click", async () => {
        const confirmed = confirm(
          `Delete "${blog.title}"? This cannot be undone.`
        );

        if (!confirmed) return;

        deleteButton.disabled = true;
        showError("");

        try {
          await request(
            `/api/blogs/${encodeURIComponent(blog.id)}`,
            "DELETE"
          );

          await loadStories();
        } catch (error) {
          showError(error.message);
        } finally {
          deleteButton.disabled = false;
        }
      });

      actions.append(editLink, deleteButton);
      row.appendChild(actions);
      tableBody.appendChild(row);
    }
  }

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
      await request("/api/auth/logout", "POST");
      window.location.replace("login.html");
    } catch (error) {
      showError(error.message);
    } finally {
      logoutButton.disabled = false;
    }
  });

  async function initialiseDashboard() {
    try {
      const { user } = await request("/api/auth/me");


document.getElementById("profileName").textContent =
  user.name;

document.getElementById("profileEmail").textContent =
  user.email;


      document.getElementById("welcomeName").textContent =
        user.name;

      document.getElementById("userAvatar").textContent =
        user.name.charAt(0).toUpperCase();

      await loadStories();

      main.hidden = false;
    } catch (error) {
      showError(error.message);
    }
  }

  initialiseDashboard();
});