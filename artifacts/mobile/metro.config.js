const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const http = require("http");

const config = getDefaultConfig(__dirname);

// Exclude pnpm postinstall temp directories.
// During `pnpm install`, some packages (expo-updates, ajv, etc.) create
// `<pkg>_tmp_XXXX` dirs for postinstall work then immediately delete them.
// Metro's watcher crashes when it can't find these already-deleted paths.
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pnpmStore = escape(path.join(__dirname, "../../node_modules/.pnpm"));
const tmpPattern = new RegExp(pnpmStore + ".*_tmp_\\d+");

config.resolver.blockList = [tmpPattern];

// ── Dev proxy: forward /api/* requests to the API server on port 8080 ───────
// This lets the Expo web app (port 18115) reach the API server without needing
// EXPO_PUBLIC_API_URL to be set in development.
const API_SERVER_PORT = 8080;

config.server = config.server ?? {};
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    if (req.url && req.url.startsWith("/api")) {
      const options = {
        hostname: "localhost",
        port: API_SERVER_PORT,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: `localhost:${API_SERVER_PORT}` },
      };

      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      });

      proxyReq.on("error", (err) => {
        console.error("[metro-proxy] API proxy error:", err.message);
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "API server unreachable", detail: err.message }));
      });

      req.pipe(proxyReq, { end: true });
    } else {
      middleware(req, res, next);
    }
  };
};

module.exports = config;
