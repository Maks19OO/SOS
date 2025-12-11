import { useState, useEffect, useCallback } from "react";
import { Chat, Message, ColorMode } from "../types/chat";
import { saveChats, loadChats, saveMessages, loadMessages } from "../utils/storage";

export const useChat = (colorMode: ColorMode) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Загрузка чатов при монтировании или смене режима
  useEffect(() => {
    const loadedChats = loadChats(colorMode);
    
    if (loadedChats.length > 0) {
      // Сортируем по ID (новые сверху) и устанавливаем
      const sortedChats = loadedChats.sort((a, b) => b.id - a.id);
      setChats(sortedChats);
      // Выбираем первый чат (самый новый) при смене режима
      setActiveChat(sortedChats[0].id);
    } else {
      // Если чатов нет, очищаем состояние
      setChats([]);
      setActiveChat(null);
      setMessages([]);
    }
  }, [colorMode]);

  // Загрузка сообщений при смене активного чата
  useEffect(() => {
    if (activeChat !== null) {
      const loadedMessages = loadMessages(colorMode, activeChat);
      setMessages(loadedMessages);
    } else {
      setMessages([]);
    }
  }, [activeChat, colorMode]);

  // Сохранение чатов при изменении
  useEffect(() => {
    if (chats.length > 0) {
      // Сортируем по ID (новые сверху) и сохраняем все чаты
      const sortedChats = [...chats].sort((a, b) => b.id - a.id);
      saveChats(colorMode, sortedChats);
    }
  }, [chats, colorMode]);

  // Сохранение сообщений при изменении (резервное сохранение)
  // Основное сохранение происходит в handleSendMessage после получения ответа
  useEffect(() => {
    if (activeChat !== null && messages.length > 0) {
      // Небольшая задержка, чтобы избежать конфликтов с явным сохранением
      const timeoutId = setTimeout(() => {
        saveMessages(colorMode, activeChat, messages);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, activeChat, colorMode]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    // Создаем новый чат только при отправке первого сообщения
    let currentChatId = activeChat;
    let currentMessages = messages;
    
    if (currentChatId === null) {
      const newChatId = Date.now();
      const newChat: Chat = {
        id: newChatId,
        title: userMessage.length > 50 
          ? userMessage.substring(0, 50) + "..." 
          : userMessage,
        timestamp: new Date().toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      // Добавляем новый чат в начало и сортируем по ID (новые сверху)
      setChats((prevChats) => {
        const updated = [newChat, ...prevChats];
        return updated.sort((a, b) => b.id - a.id);
      });
      setActiveChat(newChatId);
      currentChatId = newChatId;
      // Очищаем сообщения при создании нового чата
      currentMessages = [];
      setMessages([]);
    }

    // Добавляем сообщение пользователя сразу
    const newMessage: Message = {
      text: userMessage,
      response: "",
    };
    const updatedMessages = [...currentMessages, newMessage];
    setMessages(updatedMessages);

    try {
      // Отправка запроса на API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: userMessage,
          colorMode: colorMode,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка API: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.text || "";

      // Обновляем сообщение с ответом
      const finalMessages = [...updatedMessages];
      finalMessages[finalMessages.length - 1] = {
        ...newMessage,
        response: responseText,
      };
      setMessages(finalMessages);
      
      // Сохраняем сообщения сразу после получения ответа
      saveMessages(colorMode, currentChatId, finalMessages);

      // Обновляем заголовок чата, если это первое сообщение
      if (updatedMessages.length === 1 && currentChatId !== null) {
        const title = userMessage.length > 50 
          ? userMessage.substring(0, 50) + "..." 
          : userMessage;
        setChats((prevChats) => {
          const updated = prevChats.map((chat) =>
            chat.id === currentChatId ? { ...chat, title } : chat
          );
          // Сохраняем чаты после обновления заголовка
          saveChats(colorMode, updated.sort((a, b) => b.id - a.id));
          return updated.sort((a, b) => b.id - a.id);
        });
      } else {
        // Сохраняем чаты после обновления сообщений
        setChats((prevChats) => {
          const sorted = prevChats.sort((a, b) => b.id - a.id);
          saveChats(colorMode, sorted);
          return sorted;
        });
      }
    } catch (error) {
      console.error("Ошибка при отправке сообщения:", error);
      const errorMessages = [...updatedMessages];
      errorMessages[errorMessages.length - 1] = {
        ...newMessage,
        response: `Ошибка: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
      };
      setMessages(errorMessages);
      // Сохраняем сообщения даже при ошибке
      saveMessages(colorMode, currentChatId, errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = useCallback(() => {
    // Просто очищаем текущее состояние, чат создастся при отправке первого сообщения
    setActiveChat(null);
    setMessages([]);
    setInputValue("");
  }, []);

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
    isLoading,
    setActiveChat,
    setInputValue,
    handleSendMessage,
    handleNewChat,
    handleKeyPress,
  };
};

