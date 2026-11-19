document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("dbBlogList");
  const message = document.getElementById("dbHomeEmpty");
  const buttons = document.querySelectorAll(".topic-chip");

  let stories = [];
  let selectedCategory = "All";

  function createElement(tag, text, className) {
    const element = document.createElement(tag);

    if (text !== undefined) {
      element.textContent = text;
    }

    if (className) {
      element.className = className;
    }

    return element;
  }

  function displayStories() {
    list.replaceChildren();

    const filteredStories = stories.filter(
      (story) =>
        selectedCategory === "All" ||
        story.category === selectedCategory
    );

    message.hidden = filteredStories.length > 0;
    message.textContent =
      "No published stories in this category yet.";

    for (const story of filteredStories) {
      const card = createElement(
        "article",
        undefined,
        "blog-card"
      );

      if (story.image) {
        const image = document.createElement("img");

        image.src = story.image;
        image.alt = story.title;
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";

        image.style.width = "100%";
        image.style.height = "250px";
        image.style.objectFit = "cover";

        image.addEventListener(
          "error",
          () => image.remove(),
          { once: true }
        );

        card.appendChild(image);
      }

      const body = createElement(
        "div",
        undefined,
        "blog-card-body"
      );

      const meta = createElement(
        "div",
        undefined,
        "blog-meta"
      );

      meta.append(
        createElement(
          "span",
          story.category,
          "category-label"
        ),
        createElement(
          "span",
          new Date(story.createdAt).toLocaleDateString()
        )
      );

      body.append(
        meta,
        createElement("h3", story.title),
        createElement("p", story.excerpt),
        createElement("small", `By ${story.author}`)
      );

      const readMore = document.createElement("a");

        readMore.href = `blog-details.html?id=${encodeURIComponent(story.id)}`;
        readMore.textContent = "Read Full Story →";
        readMore.className = "read-more-btn";

        body.appendChild(readMore);


      card.appendChild(body);
      list.appendChild(card);
    }
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedCategory = button.dataset.category;

      buttons.forEach((item) => {
        item.classList.toggle("selected", item === button);
      });

      displayStories();
    });
  });

  async function loadStories() {
    try {
      const response = await fetch("/api/blogs", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load stories."
        );
      }

      stories = data.blogs;
      displayStories();
    } catch (error) {
      message.hidden = false;
      message.textContent = error.message;
    }
  }

  loadStories();
});