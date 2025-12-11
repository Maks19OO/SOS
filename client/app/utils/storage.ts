import { Chat, Message, ColorMode } from "../types/chat";

const STORAGE_PREFIX = "chat_history_";

export const getStorageKey = (colorMode: ColorMode): string => {
  return `${STORAGE_PREFIX}${colorMode}`;
};

export const saveChats = (colorMode: ColorMode, chats: Chat[]): void => {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageKey(colorMode);
    localStorage.setItem(key, JSON.stringify(chats));
  } catch (error) {
    console.error("Ошибка сохранения чатов:", error);
  }
};

export const loadChats = (colorMode: ColorMode): Chat[] => {
  if (typeof window === "undefined") return [];
  try {
    const key = getStorageKey(colorMode);
    const data = localStorage.getItem(key);
    if (!data) return [];
    
    const chats: Chat[] = JSON.parse(data);
    // Сортируем чаты по ID (timestamp) в порядке убывания - новые сверху
    return chats.sort((a, b) => b.id - a.id);
  } catch (error) {
    console.error("Ошибка загрузки чатов:", error);
    return [];
  }
};

export const saveMessages = (
  colorMode: ColorMode,
  chatId: number,
  messages: Message[]
): void => {
  if (typeof window === "undefined") return;
  try {
    const key = `${getStorageKey(colorMode)}_messages_${chatId}`;
    localStorage.setItem(key, JSON.stringify(messages));
  } catch (error) {
    console.error("Ошибка сохранения сообщений:", error);
  }
};

export const loadMessages = (
  colorMode: ColorMode,
  chatId: number
): Message[] => {
  if (typeof window === "undefined") return [];
  try {
    const key = `${getStorageKey(colorMode)}_messages_${chatId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Ошибка загрузки сообщений:", error);
    return [];
  }
};

export const clearStorage = (colorMode: ColorMode): void => {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageKey(colorMode);
    localStorage.removeItem(key);
    
    // Удаляем все сообщения для этого режима
    const chats = loadChats(colorMode);
    chats.forEach((chat) => {
      const messageKey = `${key}_messages_${chat.id}`;
      localStorage.removeItem(messageKey);
    });
  } catch (error) {
    console.error("Ошибка очистки хранилища:", error);
  }
};

