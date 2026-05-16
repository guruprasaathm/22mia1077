const express = require("express");
const cors = require("cors");
const { appLog } = require("./logger");
const { getDepots, getVehicles } = require("./services/evaluationClient");
const { scheduleVehiclesForDepot, scheduleAllDepots } = require("./services/scheduler");

const app = express();

app.use(cors());
app.use(express.json());

app.use(async (req, res, next) => {
  await appLog("info", "middleware", `${req.method} ${req.originalUrl} request received`);
  next();
});

app.get("/health", async (req, res) => {
  await appLog("debug", "route", "health check requested");
  res.status(200).json({
    status: "ok",
    service: "vehicle_scheduling"
  });
});

app.get("/api/source-data", async (req, res, next) => {
  try {
    const [depots, vehicles] = await Promise.all([getDepots(), getVehicles()]);
    await appLog("info", "controller", `source data returned with ${depots.length} depots and ${vehicles.length} vehicles`);
    res.status(200).json({ depots, vehicles });
  } catch (error) {
    next(error);
  }
});

app.get("/api/schedule", async (req, res, next) => {
  try {
    const [depots, vehicles] = await Promise.all([getDepots(), getVehicles()]);
    const schedules = await scheduleAllDepots(depots, vehicles);

    res.status(200).json({
      algorithm: "0/1 knapsack dynamic programming",
      depotCount: depots.length,
      vehicleCount: vehicles.length,
      schedules
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/schedule/:depotId", async (req, res, next) => {
  try {
    const depotId = Number(req.params.depotId);

    if (!Number.isInteger(depotId)) {
      await appLog("warn", "handler", `invalid depot id received: ${req.params.depotId}`);
      return res.status(400).json({ message: "depotId must be a number" });
    }

    const [depots, vehicles] = await Promise.all([getDepots(), getVehicles()]);
    const depot = depots.find((item) => Number(item.ID) === depotId);

    if (!depot) {
      await appLog("warn", "handler", `depot ${depotId} not found`);
      return res.status(404).json({ message: "Depot not found" });
    }

    const schedule = await scheduleVehiclesForDepot(depot, vehicles);
    res.status(200).json(schedule);
  } catch (error) {
    next(error);
  }
});

app.use(async (error, req, res, _next) => {
  await appLog("error", "handler", `request failed at ${req.method} ${req.originalUrl}: ${error.message}`);
  res.status(500).json({
    message: "Internal server error",
    detail: error.message
  });
});

module.exports = app;
