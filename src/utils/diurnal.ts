// 24-Hour Diurnal Human Traffic Distribution Model
// Normalized weights for hours 00:00 to 23:00 based on global internet traffic research

export const DIURNAL_WEIGHTS: number[] = [
  0.020, // 00:00 - 01:00 (Night)
  0.015, // 01:00 - 02:00
  0.012, // 02:00 - 03:00
  0.010, // 03:00 - 04:00 (Lowest trough)
  0.012, // 04:00 - 05:00
  0.020, // 05:00 - 06:00 (Early risers)
  0.035, // 06:00 - 07:00 (Morning start)
  0.048, // 07:00 - 08:00
  0.058, // 08:00 - 09:00 (Office arrival)
  0.062, // 09:00 - 10:00
  0.065, // 10:00 - 11:00
  0.068, // 11:00 - 12:00
  0.066, // 12:00 - 13:00 (Lunch)
  0.069, // 13:00 - 14:00
  0.073, // 14:00 - 15:00 (Afternoon peak)
  0.075, // 15:00 - 16:00 (Peak human activity)
  0.072, // 16:00 - 17:00
  0.068, // 17:00 - 18:00 (Commute)
  0.065, // 18:00 - 19:00 (Dinner)
  0.060, // 19:00 - 20:00 (Evening mobile)
  0.052, // 20:00 - 21:00
  0.042, // 21:00 - 22:00
  0.032, // 22:00 - 23:00
  0.021, // 23:00 - 00:00 (Wind down)
];

export interface HourlyDistribution {
  hour: number;
  label: string;
  weight: number;
  expectedViews: number;
  isCurrentHour: boolean;
  activityLevel: 'Low (Night)' | 'Moderate' | 'High (Peak)';
}

/**
 * Calculates the number of views per hour given a total target and diurnal curve.
 */
export function calculateHourlyDistribution(
  totalViews: number,
  useDiurnal: boolean = true,
  currentLocalHour: number = new Date().getHours()
): HourlyDistribution[] {
  const result: HourlyDistribution[] = [];
  const safeTotal = Math.max(1, totalViews);

  for (let h = 0; h < 24; h++) {
    const weight = useDiurnal ? DIURNAL_WEIGHTS[h] : 1 / 24;
    const views = Math.max(1, Math.round(safeTotal * weight));
    const label = `${String(h).padStart(2, '0')}:00`;
    
    let activityLevel: 'Low (Night)' | 'Moderate' | 'High (Peak)' = 'Moderate';
    if (weight >= 0.065) activityLevel = 'High (Peak)';
    else if (weight <= 0.025) activityLevel = 'Low (Night)';

    result.push({
      hour: h,
      label,
      weight,
      expectedViews: views,
      isCurrentHour: h === currentLocalHour,
      activityLevel,
    });
  }

  return result;
}

/**
 * Calculates realistic delay (in ms) between requests based on distribution window.
 */
export function calculatePacingInterval(
  totalViews: number,
  durationMinutes: number,
  useDiurnal: boolean = false,
  concurrency: number = 1
): { baseDelayMs: number; jitterMs: number; avgIntervalSec: number; estPaceDescription: string } {
  if (durationMinutes <= 0) {
    // Instant test mode
    return {
      baseDelayMs: 1200,
      jitterMs: 600,
      avgIntervalSec: 1.5,
      estPaceDescription: 'Rapid test (1-2s between hits)',
    };
  }

  const totalSeconds = durationMinutes * 60;
  // If diurnal is enabled and we are in the current hour, adjust interval by current hour's weight
  let effectiveViewsPerHour = totalViews / (durationMinutes / 60);
  if (useDiurnal && durationMinutes >= 60) {
    const currentHour = new Date().getHours();
    const currentWeight = DIURNAL_WEIGHTS[currentHour];
    // Views in this hour
    const viewsThisHour = Math.max(1, totalViews * currentWeight * (24 / (durationMinutes / 60)));
    effectiveViewsPerHour = viewsThisHour;
  }

  const avgIntervalSec = Math.max(1, (3600 / Math.max(1, effectiveViewsPerHour)) * concurrency);
  const baseDelayMs = Math.round(avgIntervalSec * 1000);
  const jitterMs = Math.round(baseDelayMs * 0.4); // 40% natural variance

  let estPaceDescription = '';
  if (avgIntervalSec < 5) {
    estPaceDescription = `~1 view every ${avgIntervalSec.toFixed(1)}s (Quick pace)`;
  } else if (avgIntervalSec < 60) {
    estPaceDescription = `~1 view every ${Math.round(avgIntervalSec)} seconds (Smooth human pace)`;
  } else if (avgIntervalSec < 3600) {
    const mins = (avgIntervalSec / 60).toFixed(1);
    estPaceDescription = `~1 view every ${mins} minutes (Ultra-organic subtle drip)`;
  } else {
    const hrs = (avgIntervalSec / 3600).toFixed(1);
    estPaceDescription = `~1 view every ${hrs} hours`;
  }

  return {
    baseDelayMs,
    jitterMs,
    avgIntervalSec,
    estPaceDescription,
  };
}
