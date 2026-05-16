const { appLog } = require("../logger");

const DEFAULT_BASE_URL = "http://4.224.186.213/evaluation-service";

async function fetchFromEvaluation(path) {
  const baseUrl = process.env.EVALUATION_BASE_URL || DEFAULT_BASE_URL;
  const token = process.env.ACCESS_TOKEN;

  if (!token) {
    await appLog("fatal", "config", "ACCESS_TOKEN missing while calling evaluation service");
    throw new Error("ACCESS_TOKEN is missing");
  }

  await appLog("debug", "service", `calling evaluation endpoint ${path}`);

  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    await appLog("error", "service", `evaluation endpoint ${path} failed with status ${response.status}`);
    throw new Error(`Evaluation service failed: ${response.status}`);
  }

  await appLog("info", "service", `successfully received data from ${path}`);
  return data;
}

async function getDepots() {
  const data = await fetchFromEvaluation("/depots");
  return Array.isArray(data.depots) ? data.depots : [];
}

async function getVehicles() {
  const data = await fetchFromEvaluation("/vehicles");
  return Array.isArray(data.vehicles) ? data.vehicles : [];
}

module.exports = {
  getDepots,
  getVehicles
};
