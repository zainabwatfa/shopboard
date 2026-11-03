// The shapes of the theme feature. Types only: nothing here runs.

// "system" follows the device setting; "light" and "dark" override it
export type ThemeChoice = "system" | "light" | "dark";

// What theme.ui.ts calls when something happens to the theme switch
export type ThemeHandlers = {
  onChange: (value: string) => void; // the radio button's value, checked in main.ts
};
