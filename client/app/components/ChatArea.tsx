"use client";

import { Message } from "../types/chat";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { useResponsive } from "../hooks/useMediaQuery";
import { Typography } from "@snack-uikit/typography";
import React, { useRef, useEffect, useState } from "react";

type ChatAreaProps = {
  messages: Message[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  pageTitle: string;
  isLoading?: boolean;
};

export const ChatArea = ({
  messages,
  inputValue,
  onInputChange,
  onSendMessage,
  onKeyPress,
  pageTitle,
  isLoading = false,
}: ChatAreaProps) => {
  const { isMobile, isTablet } = useResponsive();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Функция для обновления высоты textarea
  const updateTextareaHeight = React.useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const currentValue = textarea.value;
      const isLargeRequest = currentValue.length > 200 || currentValue.split('\n').length > 3;
      const baseHeight = isLargeRequest ? 400 : 150;
      
      // Сбрасываем высоту для точного измерения scrollHeight
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      
      // Вычисляем новую высоту
      let newHeight: number;
      if (scrollHeight > baseHeight) {
        // Увеличиваем на 15-20% или до scrollHeight + небольшой отступ
        newHeight = Math.max(
          Math.floor(baseHeight * 1.15),
          Math.min(scrollHeight, baseHeight)
        );
      } else {
        newHeight = Math.max(52, scrollHeight); // Минимум 52px (minHeight)
      }
      
      // Устанавливаем новую высоту напрямую
      textarea.style.height = `${newHeight}px`;
    }
  }, []);
  
  // Обновляем высоту при изменении inputValue
  useEffect(() => {
    // Используем requestAnimationFrame для измерения после рендера
    requestAnimationFrame(() => {
      updateTextareaHeight();
    });
  }, [inputValue, updateTextareaHeight]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--background)",
      }}
    >
      {messages.length === 0 ? (
        // Начальный экран с полем ввода по центру
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 80,
            paddingBottom: isMobile ? 16 : 32,
            paddingLeft: isMobile ? 0 : 32,
            paddingRight: isMobile ? 0 : 32,
          }}
        >
          <div style={{ maxWidth: 680, width: "100%" }}>
            <div
              style={{
                color: "var(--foreground)",
                marginBottom: isMobile ? 24 : 48,
                textAlign: "center",
                fontSize: isMobile ? 20 : isTablet ? 24 : 28,
                fontWeight: 600,
              }}
            >
              <Typography
                family="sans"
                purpose="display"
                size={isMobile ? "s" : isTablet ? "m" : "l"}
                tag="h1"
              >
                {pageTitle}
              </Typography>
            </div>
            <MessageInput
              value={inputValue}
              onChange={onInputChange}
              onSend={onSendMessage}
              onKeyPress={onKeyPress}
            />
            <div
              style={{
                marginTop: 16,
                textAlign: "center",
                color: "#888",
                fontSize: isMobile ? 11 : 13,
                padding: isMobile ? "0 12px" : 0,
              }}
            >
              <Typography
                family="sans"
                purpose="body"
                size="s"
                tag="p"
              >
                {isMobile
                  ? "Enter - отправить"
                  : "Нажмите Enter для отправки, Shift+Enter для новой строки"}
              </Typography>
            </div>
          </div>
        </div>
      ) : (
        // Экран с разделением на 2 колонки
        <>
          <MessageList messages={messages} isLoading={isLoading} />

          {/* Поле ввода снизу */}
          <div
            style={{
              borderTop: "1px solid var(--border-color)",
              paddingTop: isMobile ? 12 : 16,
              paddingBottom: isMobile ? 12 : 16,
              paddingLeft: isMobile ? 0 : 24,
              paddingRight: isMobile ? 0 : 24,
              background: "var(--background)",
            }}
          >
            <div
              style={{
                position: "relative",
                maxWidth: 1200,
                margin: "0 auto",
              }}
            >
              <div
                style={{
                  position: "relative",
                  background: "var(--background)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: `0 2px 16px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--accent-light)`,
                  transition: "box-shadow 0.2s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = `0 2px 20px rgba(0, 0, 0, 0.15), 0 0 0 2px var(--accent-primary)`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = `0 2px 16px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--accent-light)`;
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => {
                    onInputChange(e.target.value);
                    // Немедленно обновляем высоту при изменении
                    requestAnimationFrame(() => {
                      updateTextareaHeight();
                    });
                  }}
                  onKeyDown={onKeyPress}
                  placeholder="Новый запрос..."
                  style={{
                    width: "100%",
                    minHeight: 52,
                    background: "transparent",
                    border: "none",
                    padding: "14px 60px 14px 16px",
                    color: "var(--foreground)",
                    fontSize: 15,
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
                  onClick={onSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 32,
                    height: 32,
                    background: inputValue.trim()
                      ? "var(--accent-primary)"
                      : "rgba(255, 255, 255, 0.1)",
                    border: "none",
                    borderRadius: "50%",
                    color: "#fff",
                    fontSize: 16,
                    cursor: inputValue.trim() ? "pointer" : "not-allowed",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: inputValue.trim() && !isLoading ? 1 : 0.5,
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                    if (inputValue.trim()) {
                      e.currentTarget.style.background =
                        "var(--accent-hover)";
                    }
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.background = inputValue.trim()
                      ? "var(--accent-primary)"
                      : "rgba(255, 255, 255, 0.1)";
                  }}
                >
                  ↑
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

