export interface TimeseriesValue {
  value: number;
  date: Date;
}

export interface EntityWithPower {
  power: TimeseriesValue[];
}

export function calculateTotalEnergyGenerationWh(
  entitiesWithPower: EntityWithPower[],
): number {
  if (!entitiesWithPower || entitiesWithPower.length === 0) {
    return 0;
  }
  let totalGenerationWh = 0;

  for (const entity of entitiesWithPower) {
    if (!entity.power || entity.power.length < 2) {
      continue;
    }
    const sortedPowerReadings = [...entity.power].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    for (let i = 0; i < sortedPowerReadings.length - 1; i++) {
      const currentReading = sortedPowerReadings[i];
      const nextReading = sortedPowerReadings[i + 1];

      const currentPower = currentReading.value;
      const nextPower = nextReading.value;

      if (
        currentPower < 0 ||
        nextPower < 0 ||
        isNaN(currentPower) ||
        isNaN(nextPower)
      ) {
        continue;
      }

      const currentDate = currentReading.date;
      const nextDate = nextReading.date;

      if (isNaN(currentDate.getTime()) || isNaN(nextDate.getTime())) {
        continue;
      }

      const timeDeltaHours =
        (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60);

      if (timeDeltaHours <= 0) {
        continue;
      }

      const generationSegmentWh =
        ((nextPower + currentPower) / 2) * timeDeltaHours;
      totalGenerationWh += generationSegmentWh;
    }
  }
  return parseFloat(totalGenerationWh.toFixed(3));
}
