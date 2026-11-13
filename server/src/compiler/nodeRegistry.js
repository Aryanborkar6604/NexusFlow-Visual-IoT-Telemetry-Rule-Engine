import { map, scan, filter, tap } from 'rxjs/operators';

export const nodeRegistry = {
  // Sensor extraction operator
  sensor: (config) => (source$) => source$.pipe(
    map((reading) => {
      const field = config.field || 'temperature';
      const rawVal = reading[field];
      const val = typeof rawVal === 'number' ? rawVal : Number(rawVal);
      return isNaN(val) ? 0 : val;
    })
  ),

  // Moving average operator
  movingAverage: (config) => (source$) => {
    const size = Math.max(1, Math.min(100, Number(config.windowSize) || 5));
    return source$.pipe(
      scan((buffer, val) => {
        const next = [...buffer, val];
        return next.length > size ? next.slice(next.length - size) : next;
      }, []),
      map((buffer) => {
        const sum = buffer.reduce((acc, curr) => acc + curr, 0);
        return Math.round((sum / buffer.length) * 10) / 10;
      })
    );
  },

  // Condition filter operator
  condition: (config) => (source$) => {
    const threshold = Number(config.value);
    const op = config.operator;

    return source$.pipe(
      filter((val) => {
        switch (op) {
          case '>': return val > threshold;
          case '<': return val < threshold;
          case '>=': return val >= threshold;
          case '<=': return val <= threshold;
          case '==': return val === threshold;
          default: return false;
        }
      })
    );
  },

  // SMS action trigger operator
  sms: (config, context) => (source$) => source$.pipe(
    tap((val) => {
      if (context && typeof context.dispatchAlert === 'function') {
        context.dispatchAlert({
          recipient: config.recipient,
          message: config.message || `Alert: Condition met with value ${val}`,
          value: val,
        });
      }
    })
  )
};
