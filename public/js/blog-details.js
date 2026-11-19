
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);

  const blogId = params.get("id");
  const sampleId = params.get("sample");

  const loading = document.getElementById("loadingMessage");
  const errorMessage = document.getElementById("errorMessage");
  const details = document.getElementById("blogDetails");

  try {
    let blog;

    if (sampleId) {
      // Read original sample stories
      blog = getPosts().find(
        post =>
          String(post.id) === sampleId &&
          post.status === "published"
      );

      if (!blog) {
        throw new Error("Story not found.");
      }

    } else if (blogId) {
      // Read stories from MongoDB
      const response = await fetch(
        `/api/blogs/${encodeURIComponent(blogId)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Story not found.");
      }

      blog = data.blog;

    } else {
      throw new Error("Story ID is missing.");
    }

    document.getElementById("blogTitle").textContent =
      blog.title;

    document.getElementById("blogCategory").textContent =
      blog.category;

    const dateValue = blog.createdAt || blog.date;

    document.getElementById("blogDate").textContent =
      new Date(dateValue).toLocaleDateString();

    document.getElementById("blogExcerpt").textContent =
      blog.excerpt;

    document.getElementById("blogContent").textContent =
      blog.content;

    const image = document.getElementById("blogImage");

    image.src = blog.image || FALLBACK_IMAGE;
    image.alt = blog.title;
    image.hidden = false;

    image.onerror = () => {
      image.onerror = null;
      image.src = FALLBACK_IMAGE;
    };

    document.title = `${blog.title} | BlogSpace`;

    loading.hidden = true;
    details.hidden = false;

  } catch (error) {
    loading.hidden = true;
    errorMessage.textContent = error.message;
  }
});
