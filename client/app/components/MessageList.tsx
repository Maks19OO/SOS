"use client";

import { Message } from "../types/chat";
import { useResponsive } from "../hooks/useMediaQuery";
import { Typography } from "@snack-uikit/typography";
import { CodeEditorWrapper } from "./CodeEditorWrapper";

type MessageListProps = {
  messages: Message[];
  isLoading?: boolean;
};

export const MessageList = ({ messages, isLoading = false }: MessageListProps) => {
  const { isMobile, isTablet } = useResponsive();

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        paddingTop: 80,
        paddingBottom: isMobile ? 16 : 24,
        paddingLeft: 0,
        paddingRight: 0,
      }}
    >
      {messages.map((message, index) => {
        // Проверяем, является ли это последним сообщением и идет ли загрузка
        const isLastMessage = index === messages.length - 1;
        const isMessageLoading = isLastMessage && isLoading && !message.response;
        
        // Вычисляем максимальную высоту для синхронизации запроса и результата
        // Используем максимальное значение из запроса и ответа для одинаковой высоты
        const requestLineCount = message.text ? message.text.split("\n").length : 1;
        const responseLineCount = message.response ? message.response.split("\n").length : 1;
        const maxLineCount = Math.max(requestLineCount, responseLineCount);
        // Увеличена максимальная высота с 600 до 1000px
        const maxHeight = Math.max(300, Math.min(1000, maxLineCount * 20 + 40));
        
        return (
        <div
          key={index}
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: isMobile ? 12 : isTablet ? 16 : 24,
            paddingLeft: isMobile ? 12 : 24,
            paddingRight: isMobile ? 12 : 24,
            paddingTop: 0,
            paddingBottom: 0,
            marginBottom: isMobile ? 16 : 24,
          }}
        >
          {/* Левая колонка - запрос пользователя */}
          <div
            style={{
              background: "var(--sidebar-bg)",
              border: "1px solid var(--border-color)",
              borderRadius: isMobile ? 8 : 12,
              padding: isMobile ? 12 : 20,
              display: "flex",
              flexDirection: "column",
              maxHeight: maxHeight,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                color: "#888",
                fontSize: isMobile ? 10 : 12,
                fontWeight: 600,
                marginBottom: isMobile ? 8 : 12,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                flexShrink: 0,
              }}
            >
              <Typography
                family="sans"
                purpose="label"
                size="s"
                tag="span"
              >
                Запрос
              </Typography>
            </div>
            <div
              style={{
                color: "var(--foreground)",
                fontSize: isMobile ? 14 : 15,
                fontFamily: "var(--font-inter), inherit",
                lineHeight: 1.6,
                letterSpacing: "-0.01em",
                margin: 0,
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
              }}
            >
              <Typography
                family="sans"
                purpose="body"
                size={isMobile ? "s" : "m"}
                tag="span"
              >
                {message.text}
              </Typography>
            </div>
          </div>

          {/* Правая колонка - ответ */}
          <div
            style={{
              background: "var(--accent-light)",
              border: "1px solid var(--accent-primary)",
              borderRadius: isMobile ? 8 : 12,
              padding: isMobile ? 12 : 20,
              display: "flex",
              flexDirection: "column",
              maxHeight: maxHeight,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                color: "var(--accent-primary)",
                fontSize: isMobile ? 10 : 12,
                fontWeight: 600,
                marginBottom: isMobile ? 8 : 12,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              <Typography
                family="sans"
                purpose="label"
                size="s"
                tag="span"
              >
                Результат
              </Typography>
            </div>
            <div style={{ flex: 1 }}>
              <CodeEditorWrapper
                value={message.response || ""}
                height="auto"
                isLoading={isMessageLoading}
              />
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
};

