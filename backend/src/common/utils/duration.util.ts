/**
 * Parses simple duration strings like "15m", "7d", "12h", "30s" into milliseconds.
 * Used to compute DB expiry timestamps for refresh/reset tokens, mirroring
 * whatever *_EXPIRES_IN value is configured for the corresponding JWT.
 */
export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration string: "${duration}"`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];

  const unitToMs: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * unitToMs[unit];
}
