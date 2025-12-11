"use client";

import { Chat } from "../types/chat";
import { ButtonSimple } from "@snack-uikit/button";
import { Typography } from "@snack-uikit/typography";
import { PlusSVG } from "@snack-uikit/icons";

type SidebarProps = {
  chats: Chat[];
  activeChat: number | null;
  onChatSelect: (id: number) => void;
  onNewChat: () => void;
};

export const Sidebar = ({
  chats,
  activeChat,
  onChatSelect,
  onNewChat,
}: SidebarProps) => {
  return (
    <div
      style={{
        width: 260,
        borderRight: "1px solid var(--border-color)",
        background: "var(--sidebar-bg)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 12,
          paddingRight: 12,
        }}
      >
        <ButtonSimple
          onClick={onNewChat}
          label="Новый чат"
          icon={<PlusSVG />}
          size="m"
          appearance="neutral"
          fullWidth
          className="new-chat-button"
        />
      </div>

      <div
        style={{
          paddingTop: 12,
          paddingBottom: 8,
          paddingLeft: 16,
          paddingRight: 16,
          color: "#888",
          fontSize: 12,
          fontWeight: 600,
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
          История
        </Typography>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 8,
          paddingRight: 8,
        }}
      >
        {chats.map((chat, index) => (
          <div key={chat.id}>
            <div
                  onClick={() => onChatSelect(chat.id)}
                  style={{
                    paddingTop: 12,
                    paddingBottom: 12,
                    paddingLeft: 12,
                    paddingRight: 12,
                    background:
                      activeChat === chat.id
                        ? "rgba(255, 255, 255, 0.08)"
                        : "transparent",
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "background 0.15s",
                    borderLeft:
                      activeChat === chat.id
                        ? "3px solid var(--accent-primary)"
                        : "3px solid transparent",
                  }}
              onMouseEnter={(e) => {
                if (activeChat !== chat.id) {
                  e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.04)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeChat !== chat.id) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <div
                style={{
                  color: "var(--foreground)",
                  fontSize: 14,
                  fontFamily: "var(--font-inter), inherit",
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <Typography
                  family="sans"
                  purpose="body"
                  size="m"
                  tag="span"
                >
                  {chat.title}
                </Typography>
              </div>
            </div>
            {index < chats.length - 1 && (
              <div
                style={{
                  height: 1,
                  background:
                    "linear-gradient(to right, transparent, var(--border-color), transparent)",
                  marginTop: 8,
                  marginBottom: 8,
                  marginLeft: 12,
                  marginRight: 12,
                  opacity: 0.5,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

