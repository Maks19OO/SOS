"use client";

import React, { createContext, useState } from "react";
import { useThemeConfig } from "@snack-uikit/utils";
import DefaultBrand from "@snack-uikit/figma-tokens/build/css/brand.module.css";
import { ColorMode } from "../types/chat";

export enum Theme {
  Dark = "Dark",
}

const themeMap = {
  [Theme.Dark]: DefaultBrand.dark,
};

type ThemeContextProps = {
  theme: Theme;
  colorMode: ColorMode;
  changeTheme: (value: Theme) => void;
  changeColorMode: (value: ColorMode) => void;
};

export const SnackThemeContext = createContext<ThemeContextProps>({
  theme: Theme.Dark,
  colorMode: ColorMode.Green,
  changeTheme: () => {},
  changeColorMode: () => {},
});

type Props = {
  children: React.ReactNode;
};

export function SnackThemeProvider({ children }: Props) {
  const { theme, themeClassName, changeTheme } = useThemeConfig<Theme>({
    themeMap,
    defaultTheme: Theme.Dark,
  });
  
  const [colorMode, setColorMode] = useState<ColorMode>(ColorMode.Green);

  return (
    <SnackThemeContext.Provider 
      value={{ 
        theme, 
        colorMode, 
        changeTheme, 
        changeColorMode: setColorMode 
      }}
    >
      <div className={themeClassName} data-color-mode={colorMode.toLowerCase()}>
        {children}
      </div>
    </SnackThemeContext.Provider>
  );
}
