"use client";

import { ColorMode } from "../types/chat";
import { COLOR_MODE_CONFIG } from "../constants/colorModes";
import { useResponsive } from "../hooks/useMediaQuery";
import { ButtonElevated } from "@snack-uikit/button";
import React from "react";

type ColorModeSelectorProps = {
  colorMode: ColorMode;
  onColorModeChange: (mode: ColorMode) => void;
  onMenuClick?: () => void;
};

export const ColorModeSelector = ({
  colorMode,
  onColorModeChange,
  onMenuClick,
}: ColorModeSelectorProps) => {
  const { isMobile, isTablet } = useResponsive();

  const getWidth = () => {
    if (isMobile) return "90%";
    if (isTablet) return "70%";
    return "380px";
  };

  const shouldCenter = isMobile || isTablet;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 0,
        background: "transparent",
        position: "absolute",
        top: 0,
        left: isMobile ? 0 : 260,
        right: 0,
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: getWidth(),
          maxWidth: "500px",
          background: "rgba(23, 23, 23, 0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid var(--border-color)",
          borderTop: "none",
          borderRadius: isMobile ? "0" : "0 0 20px 20px",
          paddingTop: isMobile ? 12 : 16,
          paddingBottom: isMobile ? 10 : 12,
          paddingLeft: isMobile ? 16 : 24,
          paddingRight: isMobile ? 16 : 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          position: "relative",
          clipPath: isMobile ? "none" : "polygon(0% 0%, 100% 0%, 92% 100%, 8% 100%)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
          pointerEvents: "auto",
        }}
      >
        {isMobile && onMenuClick && (
          <ButtonElevated
            onClick={onMenuClick}
            size="s"
            className="menu-button"
            icon={
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                style={{ display: "block" }}
              >
                <path
                  d="M3 5h14M3 10h14M3 15h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
        )}
        <div
          style={{
            display: "flex",
            gap: isMobile ? 8 : 12,
            flex: 1,
            justifyContent: "center",
          }}
        >
        {COLOR_MODE_CONFIG.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onColorModeChange(mode.value)}
            title={mode.label}
            style={{
              width: isMobile ? 28 : 32,
              height: isMobile ? 28 : 32,
              borderRadius: "50%",
              background: mode.color,
              border:
                colorMode === mode.value
                  ? `3px solid ${mode.color}`
                  : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
              position: "relative",
              boxShadow:
                colorMode === mode.value
                  ? `0 0 0 2px rgba(0, 0, 0, 0.3), 0 0 12px ${mode.color}`
                  : "none",
              transform: colorMode === mode.value ? "scale(1.1)" : "scale(1)",
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (colorMode !== mode.value) {
                e.currentTarget.style.transform = "scale(1.15)";
                e.currentTarget.style.boxShadow = `0 0 8px ${mode.color}`;
              }
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (colorMode !== mode.value) {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }
            }}
          />
        ))}
        </div>
      </div>
    </div>
  );
};

