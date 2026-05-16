const { appLog } = require("../logger");

function normaliseVehicle(vehicle) {
  return {
    taskID: vehicle.TaskID,
    duration: Number(vehicle.Duration),
    impact: Number(vehicle.Impact)
  };
}

function validateInput(capacity, vehicles) {
  if (!Number.isInteger(capacity) || capacity < 0) {
    throw new Error("Mechanic hour budget must be a non-negative integer");
  }

  for (const vehicle of vehicles) {
    if (!vehicle.taskID || !Number.isInteger(vehicle.duration) || !Number.isInteger(vehicle.impact)) {
      throw new Error("Vehicle input contains invalid TaskID, Duration, or Impact");
    }

    if (vehicle.duration <= 0 || vehicle.impact < 0) {
      throw new Error("Vehicle Duration must be positive and Impact must be non-negative");
    }
  }
}

async function scheduleVehiclesForDepot(depot, rawVehicles) {
  const capacity = Number(depot.MechanicHours);
  const vehicles = rawVehicles.map(normaliseVehicle);

  validateInput(capacity, vehicles);

  await appLog("info", "service", `starting optimisation for depot ${depot.ID} with ${vehicles.length} tasks and ${capacity} hours`);

  const dp = Array(capacity + 1).fill(0);
  const chosen = Array.from({ length: capacity + 1 }, () => []);

  for (const vehicle of vehicles) {
    for (let hours = capacity; hours >= vehicle.duration; hours--) {
      const candidateImpact = dp[hours - vehicle.duration] + vehicle.impact;

      if (candidateImpact > dp[hours]) {
        dp[hours] = candidateImpact;
        chosen[hours] = [...chosen[hours - vehicle.duration], vehicle];
      }
    }
  }

  let bestHours = 0;
  for (let hours = 1; hours <= capacity; hours++) {
    if (dp[hours] > dp[bestHours]) {
      bestHours = hours;
    }
  }

  const selectedTasks = chosen[bestHours];
  const totalDuration = selectedTasks.reduce((sum, item) => sum + item.duration, 0);
  const totalImpact = selectedTasks.reduce((sum, item) => sum + item.impact, 0);

  await appLog(
    "info",
    "service",
    `optimisation completed for depot ${depot.ID}; selected ${selectedTasks.length} tasks with impact ${totalImpact}`
  );

  return {
    depotID: depot.ID,
    mechanicHourBudget: capacity,
    totalDuration,
    unusedHours: capacity - totalDuration,
    totalImpact,
    selectedTaskCount: selectedTasks.length,
    selectedTasks
  };
}

async function scheduleAllDepots(depots, vehicles) {
  const schedules = [];

  for (const depot of depots) {
    schedules.push(await scheduleVehiclesForDepot(depot, vehicles));
  }

  return schedules;
}

module.exports = {
  scheduleVehiclesForDepot,
  scheduleAllDepots
};
