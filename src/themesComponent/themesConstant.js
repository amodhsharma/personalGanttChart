export const THEME_STORAGE_KEY = "personalGanttPlannerTheme";

export const TASK_PASTEL_COLORS = ["#bfd8e6", "#c8e7cc", "#f4ddc8", "#f1d2d2", "#d8d0e8", "#f1e8cf"];

export const THEME_LABELS = {
  theme1: "Theme 1",
  theme2: "Theme 2",
  theme3: "Theme 3"
};

// Central named color dictionary for all themes.
export const COLOR_TOKENS = {
  white: "#ffffff",

  plumPrimary: "#5B3676",
  plumDeep: "#492860",
  plumMidnight: "#3B1D51",
  plumShadow: "#321647",
  roseLight: "#FC9398",
  roseMid: "#EA6B71",
  roseDeep: "#D44D53",
  roseDark: "#BA3338",
  berryPageBg: "#f7edf3",
  berryPanelBg: "#fff7f8",
  berryInputBg: "#fffafb",
  berryPanelBorder: "#e6cdd7",
  berryInputBorder: "#d7b9c6",
  berryTimelineHeader: "#fde8ea",
  berryTimelineBorder: "#dcb9c8",
  berryTimelineGrid: "#e8c9d5",

  sageLight: "#C3D0B5",
  sageSoft: "#AFBDA1",
  sageMid: "#91A183",
  sageDark: "#748567",
  tealLight: "#52787B",
  tealMid: "#3A5C5E",
  tealDeep: "#28474A",
  tealDark: "#1C3A3D",
  sagePageBg: "#eef3ec",
  sagePanelBg: "#f7fbf6",
  sageInputBg: "#fbfdfb",
  sagePanelBorder: "#c8d4c2",
  sageInputBorder: "#b8c7af",
  sageTimelineHeader: "#e4ecdf",
  sageTimelineBorder: "#c2d0bc",
  sageTimelineGrid: "#d3dfce",

  oceanLight: "#2C6487",
  oceanMid: "#1A486E",
  oceanDeep: "#09325C",
  oceanDark: "#022650",
  aquaLight: "#3EDBEE",
  aquaMid: "#1DC6DC",
  aquaDeep: "#06A6BD",
  aquaDark: "#058A9E",
  aquaPageBg: "#e9f6fc",
  aquaPanelBg: "#f4fbff",
  aquaInputBg: "#fafdff",
  aquaPanelBorder: "#b9d7e6",
  aquaInputBorder: "#97c4d8",
  aquaTimelineHeader: "#ddf4fa",
  aquaTimelineBorder: "#9fcee2",
  aquaTimelineGrid: "#c4e6f1"
};

// Each theme only defines semantic token references.
export const THEME_TOKEN_SETS = {
  theme1: {
    pageBg: "berryPageBg",
    panelBg: "berryPanelBg",
    panelBorder: "berryPanelBorder",
    textMain: "plumShadow",
    textSubtle: "plumPrimary",
    textLabel: "plumMidnight",
    inputBg: "berryInputBg",
    inputBorder: "berryInputBorder",
    buttonPrimaryBg: "plumPrimary",
    buttonPrimaryText: "white",
    buttonSecondaryBg: "roseLight",
    buttonSecondaryText: "plumShadow",
    buttonDangerBg: "roseDark",
    errorText: "roseDark",
    swatchRing: "plumDeep",
    timelineHeaderBg: "berryTimelineHeader",
    timelineBorder: "berryTimelineBorder",
    timelineAxisText: "plumMidnight",
    timelineGrid: "berryTimelineGrid"
  },
  theme2: {
    pageBg: "sagePageBg",
    panelBg: "sagePanelBg",
    panelBorder: "sagePanelBorder",
    textMain: "tealDark",
    textSubtle: "tealLight",
    textLabel: "tealDeep",
    inputBg: "sageInputBg",
    inputBorder: "sageInputBorder",
    buttonPrimaryBg: "tealLight",
    buttonPrimaryText: "white",
    buttonSecondaryBg: "sageLight",
    buttonSecondaryText: "tealDark",
    buttonDangerBg: "tealDark",
    errorText: "tealDark",
    swatchRing: "tealMid",
    timelineHeaderBg: "sageTimelineHeader",
    timelineBorder: "sageTimelineBorder",
    timelineAxisText: "tealDeep",
    timelineGrid: "sageTimelineGrid"
  },
  theme3: {
    pageBg: "aquaPageBg",
    panelBg: "aquaPanelBg",
    panelBorder: "aquaPanelBorder",
    textMain: "oceanDark",
    textSubtle: "oceanLight",
    textLabel: "oceanDeep",
    inputBg: "aquaInputBg",
    inputBorder: "aquaInputBorder",
    buttonPrimaryBg: "oceanLight",
    buttonPrimaryText: "white",
    buttonSecondaryBg: "aquaLight",
    buttonSecondaryText: "oceanDark",
    buttonDangerBg: "aquaDark",
    errorText: "aquaDark",
    swatchRing: "oceanMid",
    timelineHeaderBg: "aquaTimelineHeader",
    timelineBorder: "aquaTimelineBorder",
    timelineAxisText: "oceanDeep",
    timelineGrid: "aquaTimelineGrid"
  }
};
