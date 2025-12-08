import { useState } from "react";
import { Chat, Message } from "../types/chat";
import { MOCK_RESPONSE } from "../constants/colorModes";

export const useChat = () => {
  const [chats, setChats] = useState<Chat[]>([
    { id: 1, title: "Создание тестов для формы", timestamp: "" },
    { id: 2, title: "Автоматизация API тестов", timestamp: "" },
    { id: 3, title: "Настройка CI/CD", timestamp: "" },
  ]);
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    setMessages([
      ...messages,
      {
        text: inputValue,
        response: MOCK_RESPONSE,
      },
    ]);
    setInputValue("");
  };

  const handleNewChat = () => {
    const newChat: Chat = {
      id: chats.length + 1,
      title: `История ${chats.length + 1}`,
      timestamp: new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setChats([newChat, ...chats]);
    setActiveChat(newChat.id);
    setMessages([]);
    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return {
    chats,
    activeChat,
    inputValue,
    messages,
    setActiveChat,
    setInputValue,
    handleSendMessage,
    handleNewChat,
    handleKeyPress,
  };
};

