export const themePresets = {
  warm: {
    label: "暖阳原点",
    description: "温暖奶油底色与柔和圆点",
    backgroundImageUrl: "builtin:warm",
    primaryColor: "#7259d9",
    secondaryColor: "#ff9f76",
    accentColor: "#f4c95d",
    backgroundColor: "#fff9f2",
    cardOpacity: 0.94,
    backgroundOverlay: 0.3,
  },
  mint: {
    label: "薄荷苏打",
    description: "清爽青绿色与漂浮波纹",
    backgroundImageUrl: "builtin:mint",
    primaryColor: "#287d70",
    secondaryColor: "#77bfae",
    accentColor: "#f2c14e",
    backgroundColor: "#f1fbf7",
    cardOpacity: 0.94,
    backgroundOverlay: 0.25,
  },
  dusk: {
    label: "蓝莓暮光",
    description: "蓝紫色块与柔和光晕",
    backgroundImageUrl: "builtin:dusk",
    primaryColor: "#5b5fc7",
    secondaryColor: "#8ca3ed",
    accentColor: "#f1bc62",
    backgroundColor: "#f3f4ff",
    cardOpacity: 0.95,
    backgroundOverlay: 0.26,
  },
  blossom: {
    label: "樱桃奶霜",
    description: "莓果粉色与花瓣色块",
    backgroundImageUrl: "builtin:blossom",
    primaryColor: "#b34f73",
    secondaryColor: "#ef91a6",
    accentColor: "#efbd61",
    backgroundColor: "#fff5f7",
    cardOpacity: 0.95,
    backgroundOverlay: 0.27,
  },
} as const;

export type ThemePresetId = keyof typeof themePresets;
export const themePresetIds = Object.keys(themePresets) as ThemePresetId[];
export const builtInThemeValues = themePresetIds.map((id) => themePresets[id].backgroundImageUrl) as [
  (typeof themePresets)[ThemePresetId]["backgroundImageUrl"],
  ...(typeof themePresets)[ThemePresetId]["backgroundImageUrl"][],
];

export function presetIdFromBackground(value: string | null | undefined): ThemePresetId | null {
  return themePresetIds.find((id) => themePresets[id].backgroundImageUrl === value) ?? null;
}
