const DEFAULT_BASE_URL = "http://4.224.186.213/evaluation-service";

const ALLOWED_STACKS = new Set(["backend", "frontend"]);
const ALLOWED_LEVELS = new Set(["debug", "info", "warn", "error", "fatal"]);

const BACKEND_PACKAGES = new Set([
  "cache",
  "controller",
  "cron_job",
  "db",
  "domain",
  "handler",
  "repository",
  "route",
  "service"
]);

const FRONTEND_PACKAGES = new Set([
  "api",
  "component",
  "hook",
  "page",
  "state",
  "style"
]);

const COMMON_PACKAGES = new Set(["auth", "config", "middleware", "utils"]);

function isValidPackage(stack, pkg) {
  if (COMMON_PACKAGES.has(pkg)) return true;
  if (stack === "backend") return BACKEND_PACKAGES.has(pkg);
  if (stack === "frontend") return FRONTEND_PACKAGES.has(pkg);
  return false;
}

function validateLogInput(stack, level, pkg, message) {
  if (!ALLOWED_STACKS.has(stack)) {
    throw new Error("Invalid stack. Use backend or frontend in lowercase.");
  }

  if (!ALLOWED_LEVELS.has(level)) {
    throw new Error("Invalid level. Use debug, info, warn, error, or fatal in lowercase.");
  }

  if (!isValidPackage(stack, pkg)) {
    throw new Error("Invalid package for selected stack.");
  }

  if (typeof message !== "string" || message.trim().length === 0) {
    throw new Error("Message must be a non-empty string.");
  }
}

async function Log(stack, level, pkg, message) {
  validateLogInput(stack, level, pkg, message);

  const baseUrl = process.env.EVALUATION_BASE_URL || DEFAULT_BASE_URL;
  const token = process.env.ACCESS_TOKEN;

  if (!token) {
    throw new Error("ACCESS_TOKEN is missing in environment variables.");
  }

  const response = await fetch(`${baseUrl}/logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      stack,
      level,
      package: pkg,
      message
    })
  });

  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Log API failed with status ${response.status}`);
  }

  return responseBody;
}

module.exports = {
  Log,
  validateLogInput
};
