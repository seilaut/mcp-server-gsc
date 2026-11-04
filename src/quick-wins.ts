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
      const ctr = ctrToPercent(row.ctr);
      const position = row.position || 0;

      return impressions >= minImpressions &&
             ctr <= maxCtr &&
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
