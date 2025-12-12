import { ColorMode, ColorModeConfig } from "../types/chat";

export const COLOR_MODE_CONFIG: ColorModeConfig[] = [
  { value: ColorMode.Green, color: "#10b981", label: "Зелёный", title: "Генерация ручных тест-кейсов" },
  { value: ColorMode.Lime, color: "#84cc16", label: "Лайм", title: "Генерация автоматизированных тестов" },
  { value: ColorMode.Blue, color: "#3b82f6", label: "Синий", title: "Оптимизация тест-кейсов" },
  { value: ColorMode.Purple, color: "#a855f7", label: "Фиолетовый", title: "Проверка тест-кейсов на стандарты" },
];

