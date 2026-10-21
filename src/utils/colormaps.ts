export interface ColorStop {
  pos: number; // 0 to 1
  r: number;
  g: number;
  b: number;
}

export const COLORMAPS: Record<string, ColorStop[]> = {
  RdYlGn: [
    { pos: 0.0, r: 165, g: 0, b: 38 },    // Dark red
    { pos: 0.2, r: 215, g: 48, b: 39 },   // Red
    { pos: 0.35, r: 244, g: 109, b: 67 }, // Orange
    { pos: 0.5, r: 254, g: 224, b: 139 }, // Pale yellow
    { pos: 0.65, r: 217, g: 239, b: 139 },// Light green-yellow
    { pos: 0.8, r: 102, g: 189, b: 99 },  // Medium green
    { pos: 1.0, r: 0, g: 104, b: 55 },    // Deep lush forest green
  ],
  terrain: [
    { pos: 0.0, r: 51, g: 136, b: 85 },   // Lowland forest green
    { pos: 0.25, r: 136, g: 187, b: 68 }, // Grassland light green
    { pos: 0.5, r: 238, g: 221, b: 136 }, // Sand / foothill yellow
    { pos: 0.75, r: 187, g: 136, b: 68 }, // Mountain ridge brown
    { pos: 0.9, r: 153, g: 102, b: 51 },  // High rocky brown
    { pos: 1.0, r: 245, g: 245, b: 245 }, // Peak snow white
  ],
  magma: [
    { pos: 0.0, r: 0, g: 0, b: 4 },       // Near black
    { pos: 0.2, r: 40, g: 16, b: 84 },    // Deep violet
    { pos: 0.4, r: 104, g: 24, b: 114 },  // Violet magenta
    { pos: 0.6, r: 182, g: 54, b: 121 },  // Magenta red
    { pos: 0.8, r: 245, g: 125, b: 21 },  // Bright orange
    { pos: 1.0, r: 252, g: 253, b: 191 }, // Pale yellow white
  ],
  BrBG: [
    { pos: 0.0, r: 84, g: 48, b: 5 },     // Deep dry soil brown
    { pos: 0.2, r: 140, g: 81, b: 10 },   // Medium brown
    { pos: 0.4, r: 223, g: 194, b: 125 }, // Light beige/sand
    { pos: 0.5, r: 245, g: 245, b: 245 }, // Neutral white
    { pos: 0.6, r: 128, g: 205, b: 193 }, // Light teal
    { pos: 0.8, r: 53, g: 151, b: 143 },  // Medium blue-green
    { pos: 1.0, r: 1, g: 102, b: 94 },    // Deep aqua/moisture teal
  ],
  YlGn: [
    { pos: 0.0, r: 255, g: 255, b: 229 }, // Pale straw yellow
    { pos: 0.25, r: 217, g: 240, b: 163 },// Light chartreuse
    { pos: 0.5, r: 120, g: 198, b: 121 }, // Vibrant crop green
    { pos: 0.75, r: 49, g: 163, b: 84 },  // Deep healthy leaf green
    { pos: 1.0, r: 0, g: 104, b: 55 },    // Dense canopy forest green
  ],
  viridis: [
    { pos: 0.0, r: 68, g: 1, b: 84 },     // Deep purple
    { pos: 0.25, r: 59, g: 82, b: 139 },  // Blue
    { pos: 0.5, r: 33, g: 145, b: 140 },  // Teal
    { pos: 0.75, r: 94, g: 201, b: 98 },  // Green
    { pos: 1.0, r: 253, g: 231, b: 37 },  // Bright yellow
  ],
  difference: [
    { pos: 0.0, r: 180, g: 24, b: 32 },    // Severely declined / Loss (Deep Red)
    { pos: 0.25, r: 239, g: 108, b: 55 },  // Moderate decline (Orange)
    { pos: 0.45, r: 254, g: 217, b: 142 }, // Slight decline (Soft Yellow)
    { pos: 0.5, r: 245, g: 245, b: 245 },  // Stable / Zero change (Neutral light)
    { pos: 0.55, r: 186, g: 228, b: 179 }, // Slight gain (Pale green)
    { pos: 0.75, r: 65, g: 171, b: 93 },   // Moderate gain (Green)
    { pos: 1.0, r: 0, g: 109, b: 44 },     // High development gain (Deep Emerald)
  ],
};

/**
 * Interpolates color for a normalized value t between 0 and 1.
 */
export function getInterpolatedColor(
  t: number,
  colormapName: string = 'RdYlGn'
): [number, number, number] {
  const stops = COLORMAPS[colormapName] || COLORMAPS.RdYlGn;
  const clampedT = Math.max(0, Math.min(1, t));

  if (clampedT <= stops[0].pos) {
    return [stops[0].r, stops[0].g, stops[0].b];
  }
  const last = stops[stops.length - 1];
  if (clampedT >= last.pos) {
    return [last.r, last.g, last.b];
  }

  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];
    if (clampedT >= s1.pos && clampedT <= s2.pos) {
      const localT = (clampedT - s1.pos) / (s2.pos - s1.pos);
      const r = Math.round(s1.r + (s2.r - s1.r) * localT);
      const g = Math.round(s1.g + (s2.g - s1.g) * localT);
      const b = Math.round(s1.b + (s2.b - s1.b) * localT);
      return [r, g, b];
    }
  }

  return [stops[0].r, stops[0].g, stops[0].b];
}

export function getColormapCSSGradient(colormapName: string = 'RdYlGn'): string {
  const stops = COLORMAPS[colormapName] || COLORMAPS.RdYlGn;
  const stopStrings = stops.map(
    s => `rgb(${s.r}, ${s.g}, ${s.b}) ${(s.pos * 100).toFixed(0)}%`
  );
  return `linear-gradient(to right, ${stopStrings.join(', ')})`;
}
