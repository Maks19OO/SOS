"use client";

import { useContext, useMemo, useState } from "react";
import { SnackThemeContext } from "./providers/SnackThemeProvider";
import { ColorModeSelector } from "./components/ColorModeSelector";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { MobileMenu } from "./components/MobileMenu";
import { useChat } from "./hooks/useChat";
import { useResponsive } from "./hooks/useMediaQuery";
import { ColorMode } from "./types/chat";
import { COLOR_MODE_CONFIG } from "./constants/colorModes";

export default function HomePage() {
  const { colorMode, changeColorMode } = useContext(SnackThemeContext);
  const { isMobile } = useResponsive();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const {
    chats,
    activeChat,
    inputValue,
    messages,
    setActiveChat,
    setInputValue,
    handleSendMessage,
    handleNewChat,
    handleKeyPress,
  } = useChat();

  const pageTitle = useMemo(() => {
    const config = COLOR_MODE_CONFIG.find(
      (config) => config.value === (colorMode as unknown as ColorMode)
    );
    return config?.title || "QA Test Generation";
  }, [colorMode]);

  const handleChatSelect = (id: number) => {
    setActiveChat(id);
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleNewChatClick = () => {
    handleNewChat();
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--background)",
        position: "relative",
      }}
    >
      {/* Верхний хедер с селектором цветов */}
      <ColorModeSelector
        colorMode={colorMode as unknown as ColorMode}
        onColorModeChange={(mode) => changeColorMode(mode as any)}
        onMenuClick={isMobile ? () => setIsMobileMenuOpen(true) : undefined}
      />

      {/* Основная область */}
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* Левая панель - История */}
        {isMobile ? (
          <MobileMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            <Sidebar
              chats={chats}
              activeChat={activeChat}
              onChatSelect={handleChatSelect}
              onNewChat={handleNewChatClick}
            />
          </MobileMenu>
        ) : (
          <Sidebar
            chats={chats}
            activeChat={activeChat}
            onChatSelect={setActiveChat}
            onNewChat={handleNewChat}
          />
        )}

        {/* Центральная область */}
        <ChatArea
          messages={messages}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          onKeyPress={handleKeyPress}
          pageTitle={pageTitle}
        />
      </div>
    </div>
  );
}
