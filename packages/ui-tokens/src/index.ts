export type ThemeMode = "light" | "dark";
export type RoleTheme = "boy" | "girl";

export interface RoleAccentTokens {
  primary: string;
  primaryStrong: string;
  soft: string;
  border: string;
  contrast: string;
}

export interface UiThemeTokens {
  mode: ThemeMode;
  role: RoleTheme;
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  border: string;
  accent: RoleAccentTokens;
}

export const ROLE_ACCENTS: Record<RoleTheme, RoleAccentTokens> = {
  boy: {
    primary: "#7c9fd6",
    primaryStrong: "#567bb8",
    soft: "#edf3ff",
    border: "#c5d4ee",
    contrast: "#ffffff",
  },
  girl: {
    primary: "#c69732",
    primaryStrong: "#96701e",
    soft: "#fff5d8",
    border: "#ead18b",
    contrast: "#211800",
  },
};

export const UI_TOKENS = {
  light: {
    background: "#fff9f3",
    surface: "rgba(255, 253, 249, 0.86)",
    surfaceRaised: "rgba(255, 255, 252, 0.97)",
    surfaceMuted: "rgba(247, 232, 222, 0.62)",
    text: "#3c2b2a",
    textMuted: "#8f7771",
    border: "rgba(185, 130, 103, 0.22)",
  },
  dark: {
    background: "#21191a",
    surface: "rgba(55, 39, 38, 0.84)",
    surfaceRaised: "rgba(67, 47, 44, 0.96)",
    surfaceMuted: "rgba(100, 69, 61, 0.5)",
    text: "#fff7ef",
    textMuted: "#d1b7aa",
    border: "rgba(236, 205, 189, 0.2)",
  },
  spacing: {
    page: "1.5rem",
    compact: "0.75rem",
    control: "0.875rem",
  },
  radius: {
    window: "1.5rem",
    card: "1.125rem",
    control: "0.8rem",
  },
} as const;

export function getUiTheme(mode: ThemeMode, role: RoleTheme): UiThemeTokens {
  return { mode, role, ...UI_TOKENS[mode], accent: ROLE_ACCENTS[role] };
}
