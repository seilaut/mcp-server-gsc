// Pure quick-wins maths. Must not import googleapis (keeps it unit-testable).

export interface QuickWinsThresholds {
  minImpressions?: number;
  maxCtr?: number;
  positionRangeMin?: number;
  positionRangeMax?: number;
}

/** Search Console returns CTR as a fraction (0.02); the tool reports a percentage (2). */
export function ctrToPercent(ctr: number | undefined | null): number {
  return (ctr || 0) * 100;
}

// A finite number as an exact decimal: value = int / 10^scale, read from the shortest
// string that round-trips (so 0.07 is 7 / 100, not its binary neighbour).
function toDecimal(n: number): { int: bigint; scale: number } {
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(String(n));
  if (!m) throw new Error(`not a plain decimal: ${n}`);
  const frac = m[3] ?? '';
  let int = BigInt(m[2] + frac);
  let scale = frac.length - Number(m[4] ?? 0);
  if (scale < 0) {
    int *= 10n ** BigInt(-scale);
    scale = 0;
  }
  return { int: m[1] ? -int : int, scale };
}

/**
 * Exact `ctr * 100 <= maxCtr`, where ctr is a fraction and maxCtr a percentage.
 * Floating-point multiplication misses the boundary (0.07 * 100 is 7.000000000000001),
 * so both sides are compared as decimals.
 */
export function ctrAtOrBelow(ctr: number | undefined | null, maxCtr: number): boolean {
  const c = ctr || 0;
  if (!Number.isFinite(c) || !Number.isFinite(maxCtr)) return ctrToPercent(c) <= maxCtr;
  const a = toDecimal(c); // c = a.int / 10^a.scale
  const b = toDecimal(maxCtr);
  // c * 100 <= maxCtr  <=>  a.int * 100 * 10^b.scale <= b.int * 10^a.scale
  return a.int * 100n * 10n ** BigInt(b.scale) <= b.int * 10n ** BigInt(a.scale);
}

export function detectQuickWins(
  rows: any[],
  thresholds: QuickWinsThresholds = {}
) {
  const {
    minImpressions = 50,
    maxCtr = 2.0,
    positionRangeMin = 4,
    positionRangeMax = 10
  } = thresholds;

  return rows
    .filter(row => {
      const impressions = row.impressions || 0;
      const position = row.position || 0;

      return impressions >= minImpressions &&
             ctrAtOrBelow(row.ctr, maxCtr) &&
             position >= positionRangeMin &&
             position <= positionRangeMax;
    })
    .map(row => {
      const impressions = row.impressions || 0;
      const currentClicks = row.clicks || 0;
      const currentCtr = ctrToPercent(row.ctr);
      const position = row.position || 0;

      // Calculate potential with 5% target CTR
      const targetCtr = 5.0;
      const potentialClicks = Math.round((impressions * targetCtr) / 100);
      const additionalClicks = Math.max(0, potentialClicks - currentClicks);

      return {
        query: row.keys?.[0] || 'N/A',
        page: row.keys?.[1] || 'N/A',
        currentPosition: Number(position.toFixed(1)),
        impressions: impressions,
        currentClicks: currentClicks,
        currentCtr: Number(currentCtr.toFixed(2)),
        potentialClicks: potentialClicks,
        additionalClicks: additionalClicks,
        opportunity: additionalClicks > 0 ? 'High' : 'Low',
        optimizationNote: `Move from position ${position.toFixed(1)} to improve CTR`
      };
    })
    .sort((a, b) => b.additionalClicks - a.additionalClicks);
}
