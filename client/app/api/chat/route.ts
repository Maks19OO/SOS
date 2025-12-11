import { NextRequest, NextResponse } from "next/server";

// Эндпоинты для разных режимов
const ENDPOINTS: Record<string, string> = {
  Green: process.env.API_ENDPOINT_GREEN || "https://localhost:8000/green",
  Lime: process.env.API_ENDPOINT_LIME || "https://localhost:8000/lime",
  Blue: process.env.API_ENDPOINT_BLUE || "https://localhost:8000/blue",
  Purple: process.env.API_ENDPOINT_PURPLE || "https://localhost:8000/purple",
};

export async function POST(request: NextRequest) {
  let colorMode = "Green";
  
  try {
    const body = await request.json();
    const { text, colorMode: mode } = body;
    colorMode = mode || "Green";

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Текст запроса обязателен" },
        { status: 400 }
      );
    }

    if (!ENDPOINTS[colorMode]) {
      return NextResponse.json(
        { error: "Неверный режим цвета" },
        { status: 400 }
      );
    }

    const endpoint = ENDPOINTS[colorMode];

    // Отправка запроса на внешний API
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`API вернул ошибку: ${response.status}`);
    }

    const data = await response.json();
    
    // Если API возвращает объект с полем text или response, извлекаем его
    // Иначе возвращаем весь ответ как текст
    const responseText = data.text || data.response || JSON.stringify(data, null, 2);

    return NextResponse.json({ text: responseText });
  } catch (error) {
    console.error("Ошибка при отправке запроса:", error);
    
    // В случае ошибки возвращаем заглушку для разработки
    return NextResponse.json(
      { 
        text: `Ошибка подключения к API. Проверьте переменные окружения.\n\nОшибка: ${error instanceof Error ? error.message : "Неизвестная ошибка"}\n\nЭндпоинт: ${ENDPOINTS[colorMode] || "не указан"}` 
      },
      { status: 500 }
    );
  }
}

