import express from "express";
import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectToDatabase } from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import projectRouter from "./routes/projectRoutes.js";

const app = express();

await connectToDatabase();

const allowedOrigins = [
  "http://localhost:5173",
  "https://ai-builder-seven-kappa.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is Live!");
});

app.get("/api/auth/test", (req, res) => {
  res.json({
    message: "Auth route is working",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/projects", projectRouter);

// Centralized error handler
app.use((err, _req, res, _next) => {
  console.error(`[Error] ${err.message}`);

  res.status(500).json({
    success: false,
    error: err.message,
  });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
