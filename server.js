
const express = require("express");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const path = require("node:path");
const fs = require("node:fs");
const mongoose = require("mongoose");
const { randomUUID, randomBytes } = require("node:crypto");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// EXPRESS SETUP
// ========================================

app.use(express.json({ limit: "300kb" }));

app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      maxAge: 1000 * 60 * 60 * 2,
    },
  })
);

// ========================================
// MONGODB MODELS
// ========================================

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    passwordHash: { type: String, required: true },
    createdAt: { type: String },
  },
  { id: false }
);

const blogSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    authorId: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, default: "" },
    image: { type: String, default: "" },
    excerpt: { type: String, default: "" },
    content: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
    createdAt: { type: String },
    updatedAt: { type: String },
  },
  { id: false }
);

const migrationSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
});

const User = mongoose.model("User", userSchema);
const Blog = mongoose.model("Blog", blogSchema);
const Migration = mongoose.model("Migration", migrationSchema);

// ========================================
// IMPORT EXISTING JSON DATA
// ========================================

// Keep old files as backups.
const dataFolder = path.join(__dirname, "data");
const usersFile = path.join(dataFolder, "users.json");
const blogsFile = path.join(dataFolder, "blogs.json");

function readOldFile(filename) {
  if (!fs.existsSync(filename)) {
    return [];
  }

  const data = JSON.parse(
    fs.readFileSync(filename, "utf8")
  );

  if (!Array.isArray(data)) {
    throw new Error("Invalid JSON data: " + filename);
  }

  return data;
}

async function importOldData() {
  const migrationKey = "json-to-mongodb-v1";

  const completed = await Migration.findOne({
    key: migrationKey,
  });

  if (completed) {
    return;
  }

  const oldUsers = readOldFile(usersFile);
  const oldBlogs = readOldFile(blogsFile);

  for (const user of oldUsers) {
    await User.updateOne(
      { id: user.id },
      { $setOnInsert: user },
      { upsert: true, runValidators: true }
    );
  }

  for (const blog of oldBlogs) {
    await Blog.updateOne(
      { id: blog.id },
      { $setOnInsert: blog },
      { upsert: true, runValidators: true }
    );
  }

  await Migration.create({ key: migrationKey });

  console.log(
    "JSON migration completed. Old files preserved."
  );
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

const asyncHandler = (handler) => {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

const categories = [
  "Technology",
  "Lifestyle",
  "Design",
  "Learning",
  "Travel",
  "Personal",
];

function validateBlog(body) {
  const title = cleanText(body.title);
  const category = cleanText(body.category);
  const image = cleanText(body.image);
  const excerpt = cleanText(body.excerpt);
  const content = cleanText(body.content);
  const status = body.status ?? "published";

  if (!["draft", "published"].includes(status)) {
    return { error: "Invalid story status." };
  }

  if (!title || title.length > 100) {
    return {
      error: "Enter a title of up to 100 characters.",
    };
  }

  if (category && !categories.includes(category)) {
    return { error: "Choose a valid category." };
  }

  if (excerpt.length > 220) {
    return {
      error: "Introduction must not exceed 220 characters.",
    };
  }

  if (content.length > 50000) {
    return {
      error: "Story must not exceed 50,000 characters.",
    };
  }

  if (
    status === "published" &&
    (!category || !excerpt || !content)
  ) {
    return {
      error:
        "Complete the category, introduction, and story before publishing.",
    };
  }

  if (image) {
    try {
      const url = new URL(image);

      if (
        !["http:", "https:"].includes(url.protocol) ||
        image.length > 2048
      ) {
        return { error: "Invalid cover image URL." };
      }
    } catch {
      return {
        error: "Enter a valid HTTP or HTTPS cover image URL.",
      };
    }
  }

  return {
    data: {
      title,
      category,
      image,
      excerpt,
      content,
      status,
    },
  };
}

// ========================================
// PROTECT PRIVATE ROUTES
// ========================================

const requireLogin = asyncHandler(async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({
      message: "Please log in first.",
    });
  }

  const user = await User.findOne({
    id: req.session.userId,
  }).lean();

  if (!user) {
    return res.status(401).json({
      message: "Please log in first.",
    });
  }

  req.currentUser = user;
  next();
});

// ========================================
// HEALTH CHECK
// ========================================

app.get("/api/health", (req, res) => {
  res.json({
    message: "BlogSpace backend is running!",
    database:
      mongoose.connection.readyState === 1
        ? "Connected"
        : "Disconnected",
  });
});

// ========================================
// REGISTER
// ========================================

app.post(
  "/api/auth/register",
  asyncHandler(async (req, res) => {
    const body = req.body || {};

    const name = cleanText(body.name);
    const email = cleanText(body.email).toLowerCase();
    const password = body.password;

    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({
        message: "Name must contain 2–80 characters.",
      });
    }

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res.status(400).json({
        message: "Enter a valid email address.",
      });
    }

    if (
      typeof password !== "string" ||
      password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        message:
          "Password must have at least 8 characters and at most 72 bytes.",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "This email is already registered.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = {
      id: randomUUID(),
      name,
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    try {
      await User.create(user);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: "This email is already registered.",
        });
      }

      throw error;
    }

    res.status(201).json({
      message: "Account created successfully!",
      user: publicUser(user),
    });
  })
);

// ========================================
// LOGIN
// ========================================

app.post(
  "/api/auth/login",
  asyncHandler(async (req, res, next) => {
    const body = req.body || {};

    const email = cleanText(body.email).toLowerCase();
    const password = body.password;

    if (
      !email ||
      typeof password !== "string" ||
      !password ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        message: "Enter a valid email and password.",
      });
    }

    const user = await User.findOne({ email }).lean();

    const passwordMatches = user
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Incorrect email or password.",
      });
    }

    req.session.regenerate((error) => {
      if (error) return next(error);

      req.session.userId = user.id;

      req.session.save((error) => {
        if (error) return next(error);

        res.json({
          message: "Logged in successfully!",
          user: publicUser(user),
        });
      });
    });
  })
);

// ========================================
// CURRENT USER
// ========================================

app.get(
  "/api/auth/me",
  requireLogin,
  (req, res) => {
    res.json({
      user: publicUser(req.currentUser),
    });
  }
);

// ========================================
// LOGOUT
// ========================================

app.post("/api/auth/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);

    res.clearCookie("connect.sid");

    res.json({
      message: "Logged out successfully.",
    });
  });
});

// ========================================
// CREATE BLOG OR SAVE DRAFT
// ========================================

app.post(
  "/api/blogs",
  requireLogin,
  asyncHandler(async (req, res) => {
    const result = validateBlog(req.body || {});

    if (result.error) {
      return res.status(400).json({
        message: result.error,
      });
    }

    const blog = {
      id: randomUUID(),
      authorId: req.session.userId,
      ...result.data,
      createdAt: new Date().toISOString(),
    };

    await Blog.create(blog);

    res.status(201).json({
      message:
        blog.status === "draft"
          ? "Draft saved!"
          : "Story published!",
      blog,
    });
  })
);

// ========================================
// GET ALL PUBLISHED BLOGS
// ========================================

app.get(
  "/api/blogs",
  asyncHandler(async (req, res) => {
    const blogs = await Blog.find({
      status: "published",
    })
      .sort({ createdAt: -1 })
      .lean();

    const authors = await User.find(
      {
        id: {
          $in: blogs.map((blog) => blog.authorId),
        },
      },
      { id: 1, name: 1 }
    ).lean();

    const authorNames = new Map(
      authors.map((user) => [user.id, user.name])
    );

    const publicBlogs = blogs.map((blog) => ({
      id: blog.id,
      title: blog.title,
      category: blog.category,
      image: blog.image,
      excerpt: blog.excerpt,
      createdAt: blog.createdAt,
      author: authorNames.get(blog.authorId) || "Writer",
    }));

    res.json({ blogs: publicBlogs });
  })
);

// ========================================
// MY BLOGS FOR DASHBOARD
// ========================================

app.get(
  "/api/blogs/mine",
  requireLogin,
  asyncHandler(async (req, res) => {
    const blogs = await Blog.find({
      authorId: req.session.userId,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ blogs });
  })
);

// ========================================
// GET INDIVIDUAL BLOG
// ========================================

// Published blogs can be read by everyone.
// Drafts can only be read by their author.

app.get(
  "/api/blogs/:id",
  asyncHandler(async (req, res) => {
    const blog = await Blog.findOne({
      id: req.params.id,
    }).lean();

    if (
      !blog ||
      (blog.status !== "published" &&
        blog.authorId !== req.session.userId)
    ) {
      return res.status(404).json({
        message: "Story not found.",
      });
    }

    res.json({ blog });
  })
);

// ========================================
// UPDATE MY BLOG
// ========================================

app.put(
  "/api/blogs/:id",
  requireLogin,
  asyncHandler(async (req, res) => {
    const result = validateBlog(req.body || {});

    if (result.error) {
      return res.status(400).json({
        message: result.error,
      });
    }

    const blog = await Blog.findOneAndUpdate(
      {
        id: req.params.id,
        authorId: req.session.userId,
      },
      {
        $set: {
          ...result.data,
          updatedAt: new Date().toISOString(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!blog) {
      return res.status(404).json({
        message: "Story not found.",
      });
    }

    res.json({
      message: "Story updated successfully!",
      blog,
    });
  })
);

// ========================================
// DELETE MY BLOG
// ========================================

app.delete(
  "/api/blogs/:id",
  requireLogin,
  asyncHandler(async (req, res) => {
    const blog = await Blog.findOneAndDelete({
      id: req.params.id,
      authorId: req.session.userId,
    });

    if (!blog) {
      return res.status(404).json({
        message: "Story not found.",
      });
    }

    res.json({
      message: "Story deleted successfully!",
    });
  })
);

// ========================================
// SERVE FRONTEND
// ========================================

app.use(express.static(path.join(__dirname, "public")));

// ========================================
// UNKNOWN API ROUTES
// ========================================

app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API route not found.",
  });
});

// ========================================
// ERROR HANDLER
// ========================================

app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "Invalid JSON.",
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      message: "Request is too large.",
    });
  }

  console.error(error);

  res.status(500).json({
    message: "Something went wrong. Please try again.",
  });
});

// ========================================
// CONNECT DATABASE AND START SERVER
// ========================================

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is missing from your .env file."
      );
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully!");

    // Ensure unique indexes exist.
    await User.init();
    await Blog.init();
    await Migration.init();

    // Import old JSON data once.
    await importOldData();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `BlogSpace running at http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
