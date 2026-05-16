const { Log } = require("../../logging_middleware");

async function appLog(level, pkg, message) {
  try {
    await Log("backend", level, pkg, message);
  } catch (_) {
    // swallow logging failures to avoid breaking business flow , No console logging is used as per assessment instruction.
  }
}

module.exports = { appLog };
