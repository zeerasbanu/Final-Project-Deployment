
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=85";

document.addEventListener("DOMContentLoaded", () => {
  const blogList = document.getElementById("homeBlogList");
  const emptyMessage = document.getElementById("homeEmpty");
  const searchInput = document.getElementById("searchBlogs");
  const categoryButtons = document.querySelectorAll(".topic-chip");

  // This script is also loaded on the details page.
  if (!blogList) return;

  let blogs = [];
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

  function formatDate(date) {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "";
    }

    return parsed.toLocaleDateString("en", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  // READ: Display published blogs
  function displayBlogs() {
    const searchText = (searchInput?.value || "")
      .trim()
      .toLowerCase();

    const filteredBlogs = blogs.filter(blog => {
      const matchesCategory =
        selectedCategory === "All" ||
        blog.category === selectedCategory;

      const matchesSearch =
        blog.title.toLowerCase().includes(searchText) ||
        (blog.excerpt || "").toLowerCase().includes(searchText) ||
        (blog.category || "").toLowerCase().includes(searchText);

      return matchesCategory && matchesSearch;
    });

    blogList.replaceChildren();

    for (const blog of filteredBlogs) {
      const card = createElement(
        "article",
        undefined,
        "blog-card"
      );

      const image = createElement(
        "img",
        undefined,
        "blog-card-image"
      );

      image.src = blog.image || FALLBACK_IMAGE;
      image.alt = blog.title;
      image.loading = "lazy";

      image.onerror = () => {
        image.onerror = null;
        image.src = FALLBACK_IMAGE;
      };

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

      const category = createElement(
        "span",
        blog.category,
        "category-label"
      );

      const date = createElement(
        "span",
        formatDate(blog.createdAt)
      );

      meta.append(category, date);

      const title = createElement("h3", blog.title);

      const excerpt = createElement(
        "p",
        blog.excerpt || ""
      );

      const author = createElement(
        "small",
        `By ${blog.author || "Writer"}`
      );

      const readLink = createElement(
        "a",
        "Read Full Story ↗",
        "card-read"
      );

      readLink.href =
        `blog-details.html?id=${encodeURIComponent(blog.id)}`;

      body.append(
        meta,
        title,
        excerpt,
        author,
        readLink
      );

      card.append(image, body);
      blogList.appendChild(card);
    }

    if (emptyMessage) {
      emptyMessage.hidden = filteredBlogs.length > 0;
      emptyMessage.textContent =
        "No matching stories found.";
    }
  }

  // READ: Fetch published blogs from MongoDB
  async function loadBlogs() {
    try {
      const response = await fetch("/api/blogs", {
        credentials: "same-origin",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load blogs.");
      }

      const data = await response.json();

      blogs = Array.isArray(data.blogs)
        ? data.blogs
        : [];

      displayBlogs();
    } catch (error) {
      console.error("Blog loading error:", error);

      if (emptyMessage) {
        emptyMessage.hidden = false;
        emptyMessage.textContent = error.message;
      }
    }
  }

  // SEARCH: Filter blogs when user types
  if (searchInput) {
    searchInput.addEventListener("input", displayBlogs);
  }

  // CATEGORY: Filter blogs by selected category
  categoryButtons.forEach(button => {
    button.addEventListener("click", () => {
      selectedCategory = button.dataset.category;

      categoryButtons.forEach(item => {
        item.classList.toggle(
          "selected",
          item === button
        );
      });

      displayBlogs();
    });
  });

  loadBlogs();
});
