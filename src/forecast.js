function prepareSamples(points, field) {
  const samples = points
    .map((point) => ({ time: new Date(point.timestamp).getTime(), value: Number(point.measurements?.[field]) }))
    .filter((point) => Number.isFinite(point.time) && Number.isFinite(point.value))
    .sort((a, b) => a.time - b.time);

  if (samples.length < 3) throw new Error('At least 3 numeric readings are required to forecast');
  const intervals = samples.slice(1).map((point, index) => (point.time - samples[index].time) / 1000).filter((seconds) => seconds > 0).sort((a, b) => a - b);
  if (!intervals.length) throw new Error('Readings must have different timestamps to forecast');
  return { samples, intervalSeconds: intervals[Math.floor(intervals.length / 2)] };
}

function linearTrend(samples) {
  const origin = samples[0].time;
  const xs = samples.map(({ time }) => (time - origin) / 1000);
  const ys = samples.map(({ value }) => value);
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  const denominator = xs.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
  if (denominator === 0) throw new Error('Readings must have different timestamps to forecast');
  const slope = xs.reduce((sum, value, index) => sum + (value - meanX) * (ys[index] - meanY), 0) / denominator;
  return { slopePerSecond: slope, predict: (time) => meanY + slope * ((time - origin) / 1000) };
}

/** Forecast numeric telemetry from recent readings using a selectable baseline model. */
export function forecastTelemetry(points, { field, horizon, model = 'linear-trend', window, alpha = 0.3, seasonLength = 2 }) {
  const { samples, intervalSeconds } = prepareSamples(points, field);
  const values = samples.map(({ value }) => value);
  const last = samples.at(-1);
  let predict;
  let slopePerSecond;
  let parameters = {};

  if (model === 'linear-trend') {
    ({ predict, slopePerSecond } = linearTrend(samples));
  } else if (model === 'moving-average') {
    const size = window ?? Math.min(10, values.length);
    if (!Number.isInteger(size) || size < 1 || size > values.length) throw new Error(`window must be an integer from 1 to ${values.length}`);
    const average = values.slice(-size).reduce((sum, value) => sum + value, 0) / size;
    predict = () => average;
    parameters = { window: size };
  } else if (model === 'exponential-smoothing') {
    if (!Number.isFinite(alpha) || alpha <= 0 || alpha > 1) throw new Error('alpha must be greater than 0 and at most 1');
    const smoothed = values.slice(1).reduce((state, value) => alpha * value + (1 - alpha) * state, values[0]);
    predict = () => smoothed;
    parameters = { alpha };
  } else if (model === 'seasonal-naive') {
    if (!Number.isInteger(seasonLength) || seasonLength < 1 || seasonLength > values.length) {
      throw new Error(`seasonLength must be an integer from 1 to ${values.length}`);
    }
    const season = values.slice(-seasonLength);
    predict = (_time, index) => season[index % season.length];
    parameters = { seasonLength };
  } else {
    throw new Error('model must be linear-trend, moving-average, exponential-smoothing, or seasonal-naive');
  }

  return {
    method: model,
    field,
    historyPoints: samples.length,
    intervalSeconds,
    ...(slopePerSecond === undefined ? {} : { slopePerSecond }),
    ...parameters,
    predictions: Array.from({ length: horizon }, (_, index) => {
      const timestamp = last.time + intervalSeconds * 1000 * (index + 1);
      return { timestamp: new Date(timestamp).toISOString(), value: predict(timestamp, index) };
    }),
  };
}
