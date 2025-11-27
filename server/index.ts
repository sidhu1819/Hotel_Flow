import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import * as http from "http";
import router from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Increase payload limit for larger requests
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // 1. Register API routes
  app.use("/api", router);

  // 1.5 Explicitly handle 404 for API routes
  // This prevents the frontend from receiving HTML when it expects JSON
  app.use("/api/*", (_req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  // 2. Create Server
  const server = http.createServer(app);

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Server Error:", err);
    res.status(status).json({ message });
  });

  // 3. Setup Vite (Dev) or Static Files (Prod)
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // 4. Start Listening
  // Render provides port 10000, fallback to 5000 locally
  const port = parseInt(process.env.PORT || '5000', 10);
  
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();