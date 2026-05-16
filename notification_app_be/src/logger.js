const { Log } = require("../../logging_middleware");

async function appLog(level, pkg, message) {
  try {
    await Log("backend", level, pkg, message);
  } catch (_) {
    // Logging failures are ignored to keep the application response available.
  }
}

module.exports = { appLog };
