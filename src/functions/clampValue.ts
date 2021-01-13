export const clampValue = (min: number, value: number, max: number): number =>
	Math.max(Math.min(max, value), min);
