document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("blogForm");
  const message = document.getElementById("blogMessage");
  const publishButton = document.getElementById("publishButton");
  const draftButton = document.getElementById("saveDraftButton");

  // An ID in the page URL means we are editing.
  const editId = new URLSearchParams(
    window.location.search
  ).get("id");

  let ready = false;

  const fields = {
    title: "blogTitle",
    category: "blogCategory",
    image: "blogImage",
    excerpt: "blogExcerpt",
    content: "blogContent",
  };

  function setBusy(busy) {
    publishButton.disabled = busy;
    draftButton.disabled = busy;
  }

  function showMessage(text) {
    message.style.display = "block";
    message.textContent = text;
  }

  async function request(url, method = "GET", body) {
    const options = {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: {},
    };

    if (body !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

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

  async function initialiseEditor() {
    setBusy(true);

    try {
      const { user } = await request("/api/auth/me");

      document.getElementById("userAvatar").textContent =
        user.name.charAt(0).toUpperCase();

      if (editId) {
        const { blog } = await request(
          `/api/blogs/${encodeURIComponent(editId)}`
        );

        // Fill the form with the saved story.
        for (const [key, inputId] of Object.entries(fields)) {
          document.getElementById(inputId).value =
            blog[key] || "";
        }

        document.getElementById("editorHeading").textContent =
          "Edit your story.";

        publishButton.textContent = "Save and publish ↗";
      }

      ready = true;
      setBusy(false);
    } catch (error) {
      showMessage(error.message);
    }
  }

  async function saveStory(status) {
    if (!ready || publishButton.disabled) return;

    showMessage("");

    if (status === "published" && !form.reportValidity()) {
      return;
    }

    const story = { status };

    for (const [key, inputId] of Object.entries(fields)) {
      story[key] =
        document.getElementById(inputId).value.trim();
    }

    setBusy(true);
    showMessage("Saving your story…");

    try {
      const url = editId
        ? `/api/blogs/${encodeURIComponent(editId)}`
        : "/api/blogs";

      const method = editId ? "PUT" : "POST";

      await request(url, method, story);

      window.location.href = "dashboard.html";
    } catch (error) {
      showMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveStory("published");
  });

  draftButton.addEventListener("click", () => {
    saveStory("draft");
  });

  initialiseEditor();
});