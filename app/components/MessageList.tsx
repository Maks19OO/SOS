"use client";

import { Message } from "../types/chat";
import { useResponsive } from "../hooks/useMediaQuery";
import { Typography } from "@snack-uikit/typography";

type MessageListProps = {
  messages: Message[];
};

export const MessageList = ({ messages }: MessageListProps) => {
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
      {messages.map((message, index) => (
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
                lineHeight: 1.6,
                margin: 0,
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
            <pre
              style={{
                color: "var(--foreground)",
                fontSize: isMobile ? 11 : 13,
                fontFamily:
                  "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              <Typography
                family="mono"
                purpose="body"
                size={isMobile ? "s" : "m"}
                tag="span"
              >
                {message.response}
              </Typography>
            </pre>
          </div>
        </div>
      ))}
    </div>
  );
};

