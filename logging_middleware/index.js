const BASE_URL = process.env.BASE_URL || "http://4.224.186.213/evaluation-service";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

const VALID_STACKS = ["backend", "frontend"];
const VALID_LEVELS = ["debug", "info", "warn", "error", "fatal"];

const VALID_PACKAGES = [
  "cache",
  "controller",
  "cron_job",
  "db",
  "domain",
  "handler",
  "repository",
  "route",
  "service",
  "api",
  "component",
  "hook",
  "page",
  "state",
  "style",
  "auth",
  "config",
  "middleware",
  "utils"
];

async function Log(stack, level, packageName, message) {
  if (!ACCESS_TOKEN) {
    return {
      success: false,
      error: "ACCESS_TOKEN is missing"
    };
  }

  if (!VALID_STACKS.includes(stack)) {
    return {
      success: false,
      error: "Invalid stack"
    };
  }

  if (!VALID_LEVELS.includes(level)) {
    return {
      success: false,
      error: "Invalid level"
    };
  }

  if (!VALID_PACKAGES.includes(packageName)) {
    return {
      success: false,
      error: "Invalid package"
    };
  }

  try {
    const response = await fetch(`${BASE_URL}/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        stack,
        level,
        package: packageName,
        message
      })
    });

    const data = await response.json();

    return {
      success: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { Log };