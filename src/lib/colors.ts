const NUM_POINTS_IN_COLOR_WHEEL_CYCLE = 12;
const LIGHTNESS_STEP_PERCENTAGE = 7;
const SATURATION_PERCENTAGE = 95;

export function getSequentialColor(index: number): string {
  const i = Math.max(0, Math.floor(index));

  const cycleSize = NUM_POINTS_IN_COLOR_WHEEL_CYCLE;
  const hueStep = 360 / cycleSize;

  const hueIndex = i % cycleSize;
  const lightnessIndex = Math.floor(i / cycleSize);

  const hue = (hueIndex * hueStep) % 360;
  const baseLightness = 25;
  const lightness = Math.min(
    100,
    baseLightness + lightnessIndex * LIGHTNESS_STEP_PERCENTAGE
  );
  const saturation = SATURATION_PERCENTAGE;

  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

export function lowkeyColor(hslString: string, opacity: number): string {
  const match = hslString.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
  if (!match) {
    throw new Error(`Invalid HSL string: ${hslString}`);
  }
  const hue = match[1];
  const saturation = Number(match[2]) + 10;
  const lightness = Number(match[3]) + 10;
  return `hsla(${hue} ${saturation}% ${lightness}% / ${opacity})`;
}
