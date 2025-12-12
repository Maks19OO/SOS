"use client";

import { useResponsive } from "../hooks/useMediaQuery";
import React, { useRef, useEffect, useCallback } from "react";

type MessageInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
};

export const MessageInput = ({
  value,
  onChange,
  onSend,
  onKeyPress,
}: MessageInputProps) => {
  const { isMobile } = useResponsive();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Функция для обновления высоты textarea
  const updateTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const currentValue = textarea.value;
      const isLargeRequest = currentValue.length > 200 || currentValue.split('\n').length > 3;
      const baseHeight = isMobile 
        ? (isLargeRequest ? 300 : 150)
        : (isLargeRequest ? 400 : 200);
      
      // Сбрасываем высоту для точного измерения scrollHeight
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      
      // Вычисляем новую высоту
      let newHeight: number;
      if (scrollHeight > baseHeight) {
        // Увеличиваем на 15-20% или до scrollHeight + небольшой отступ
        newHeight = Math.max(
          Math.floor(baseHeight * 1.15),
          Math.min(scrollHeight + 20, baseHeight * 1.5)
        );
      } else {
        const minHeight = isMobile ? 48 : 56;
        newHeight = Math.max(minHeight, scrollHeight);
      }
      
      // Устанавливаем новую высоту напрямую
      textarea.style.height = `${newHeight}px`;
    }
  }, [isMobile]);
  
  // Обновляем высоту при изменении value
  useEffect(() => {
    requestAnimationFrame(() => {
      updateTextareaHeight();
    });
  }, [value, updateTextareaHeight]);

  return (
    <div
      style={{
        maxWidth: 680,
        width: "100%",
        marginTop: 0,
        marginBottom: 0,
        marginLeft: "auto",
        marginRight: "auto",
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: isMobile ? 12 : 0,
        paddingRight: isMobile ? 12 : 0,
      }}
    >
      <div
        style={{
          position: "relative",
          background: "var(--sidebar-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: `0 4px 24px rgba(0, 0, 0, 0.15), 0 0 0 2px var(--accent-light)`,
          transition: "box-shadow 0.2s",
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = `0 4px 32px rgba(0, 0, 0, 0.2), 0 0 0 2px var(--accent-primary)`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = `0 4px 24px rgba(0, 0, 0, 0.15), 0 0 0 2px var(--accent-light)`;
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            // Немедленно обновляем высоту при изменении
            requestAnimationFrame(() => {
              updateTextareaHeight();
            });
          }}
          onKeyDown={onKeyPress}
          placeholder="Введите ваш запрос..."
          style={{
            width: "100%",
            minHeight: isMobile ? 48 : 56,
            background: "transparent",
            border: "none",
            padding: isMobile ? "12px 50px 12px 16px" : "16px 60px 16px 20px",
            color: "var(--foreground)",
            fontSize: isMobile ? 14 : 15,
            fontFamily: "var(--font-inter), inherit",
            lineHeight: 1.5,
            letterSpacing: "-0.01em",
            resize: "none",
            outline: "none",
            transition: "height 0.2s ease",
            overflowY: "auto",
          }}
        />
        <button
          onClick={onSend}
          disabled={!value.trim()}
          style={{
            position: "absolute",
            right: isMobile ? 8 : 12,
            top: "50%",
            transform: "translateY(-50%)",
            width: isMobile ? 32 : 36,
            height: isMobile ? 32 : 36,
            background: value.trim()
              ? "var(--accent-primary)"
              : "rgba(255, 255, 255, 0.1)",
            border: "none",
            borderRadius: "50%",
            color: "#fff",
            fontSize: isMobile ? 16 : 18,
            cursor: value.trim() ? "pointer" : "not-allowed",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: value.trim() ? 1 : 0.5,
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (value.trim()) {
              e.currentTarget.style.background = "var(--accent-hover)";
              e.currentTarget.style.transform = "scale(1.05)";
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.background = value.trim()
              ? "var(--accent-primary)"
              : "rgba(255, 255, 255, 0.1)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
};

