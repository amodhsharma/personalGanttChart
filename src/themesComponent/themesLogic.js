import {
  COLOR_TOKENS,
  TASK_PASTEL_COLORS,
  THEME_LABELS,
  THEME_STORAGE_KEY,
  THEME_TOKEN_SETS
} from "./themesConstant";

export { TASK_PASTEL_COLORS, THEME_STORAGE_KEY };

export const THEME_ORDER = Object.keys(THEME_TOKEN_SETS);
export const DEFAULT_THEME_KEY = THEME_ORDER[0];

const THEME_VAR_TO_TOKEN = {
  "--page-bg": "pageBg",
  "--panel-bg": "panelBg",
  "--panel-border": "panelBorder",
  "--text-main": "textMain",
  "--text-subtle": "textSubtle",
  "--text-label": "textLabel",
  "--input-bg": "inputBg",
  "--input-border": "inputBorder",
  "--btn-primary-bg": "buttonPrimaryBg",
  "--btn-primary-text": "buttonPrimaryText",
  "--btn-secondary-bg": "buttonSecondaryBg",
  "--btn-secondary-text": "buttonSecondaryText",
  "--btn-danger-bg": "buttonDangerBg",
  "--error-text": "errorText",
  "--swatch-ring": "swatchRing",
  "--timeline-header-bg": "timelineHeaderBg",
  "--timeline-border": "timelineBorder",
  "--timeline-axis-text": "timelineAxisText",
  "--timeline-grid": "timelineGrid"
};

function resolveColor(tokenName) {
  return COLOR_TOKENS[tokenName] || COLOR_TOKENS.white;
}

function buildCssVars(themeKey) {
  const themeTokenSet = THEME_TOKEN_SETS[themeKey] || THEME_TOKEN_SETS[DEFAULT_THEME_KEY];
  return Object.fromEntries(
    Object.entries(THEME_VAR_TO_TOKEN).map(([cssVar, semanticToken]) => {
      const tokenName = themeTokenSet[semanticToken];
      return [cssVar, resolveColor(tokenName)];
    })
  );
}

function buildThemes() {
  return Object.fromEntries(
    THEME_ORDER.map((themeKey) => [themeKey, getTheme(themeKey)])
  );
}

export const THEMES = buildThemes();

export function getTheme(themeKey) {
  const resolvedThemeKey = isValidThemeKey(themeKey) ? themeKey : DEFAULT_THEME_KEY;
  return {
    key: resolvedThemeKey,
    name: THEME_LABELS[resolvedThemeKey] || resolvedThemeKey,
    cssVars: buildCssVars(resolvedThemeKey)
  };
}

export function getNextThemeKey(currentThemeKey) {
  const currentIndex = THEME_ORDER.indexOf(currentThemeKey);
  if (currentIndex === -1) return DEFAULT_THEME_KEY;
  return THEME_ORDER[(currentIndex + 1) % THEME_ORDER.length];
}

export function isValidThemeKey(themeKey) {
  return typeof themeKey === "string" && THEME_ORDER.includes(themeKey);
}

export function loadStoredThemeKey() {
  try {
    const savedKey = localStorage.getItem(THEME_STORAGE_KEY);
    if (isValidThemeKey(savedKey)) return savedKey;
  } catch {
    return DEFAULT_THEME_KEY;
  }
  return DEFAULT_THEME_KEY;
}
