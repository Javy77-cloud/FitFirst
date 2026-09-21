/**
 * One width for the Activity / Quick Communications rail.
 * 320px clipped the Meeting chip. 420px crowded the card column.
 * Painted width lives in `--ff-activity-rail`.
 */
export const ACTIVITY_RAIL_PX = 400;

export const ACTIVITY_RAIL_WIDTH = `${ACTIVITY_RAIL_PX}px`;

export const ACTIVITY_RAIL_COLUMNS = `minmax(0, 1fr) ${ACTIVITY_RAIL_WIDTH}`;

export const ACTIVITY_RAIL_LOCK = String(ACTIVITY_RAIL_PX);

export const ACTIVITY_RAIL_ASIDE_CLASS =
  "ff-activity-rail shrink-0 grow-0 overflow-x-hidden space-y-3";
