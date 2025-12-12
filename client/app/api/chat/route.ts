import { NextRequest, NextResponse } from "next/server";

// Конфигурация для больших запросов (до 50MB)
export const maxDuration = 300; // 5 минут
export const runtime = 'nodejs';

// Эндпоинт для генерации кода тестов Allure
const ALLURE_GENERATOR_ENDPOINT = process.env.ALLURE_GENERATOR_ENDPOINT || "http://localhost:8000/generate";

// Эндпоинты для разных режимов (старые, для обратной совместимости)
const ENDPOINTS: Record<string, string> = {
  Green: process.env.API_ENDPOINT_GREEN || "http://localhost:8000/green",
  Lime: process.env.API_ENDPOINT_LIME || "http://localhost:8000/lime",
  Blue: process.env.API_ENDPOINT_BLUE || "http://localhost:8000/blue",
  Purple: process.env.API_ENDPOINT_PURPLE || "http://localhost:8000/purple",
};

export async function POST(request: NextRequest) {
  let colorMode = "Green";
  
  try {
    // Читаем тело запроса как текст для больших данных
    const requestText = await request.text();
    let body;
    
    try {
      body = JSON.parse(requestText);
    } catch (parseError) {
      return NextResponse.json(
        { error: "Невалидный JSON в теле запроса" },
        { status: 400 }
      );
    }
    
    const { text, colorMode: mode, openapiSpec } = body;
    colorMode = mode || "Green";
    
    // Логируем размер данных для отладки
    const dataSize = requestText.length;
    console.log(`[DEBUG] Размер данных запроса: ${(dataSize / 1024 / 1024).toFixed(2)} MB`);

    // Режим Lime - обработка OpenAPI спецификации
    if (colorMode === "Lime") {
      const LIME_ENDPOINT = process.env.API_ENDPOINT_LIME || "http://localhost:8000/lime";
      
      if (!openapiSpec || typeof openapiSpec !== "string") {
        return NextResponse.json(
          { error: "OpenAPI спецификация обязательна для режима Lime" },
          { status: 400 }
        );
      }

      const response = await fetch(LIME_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ openapi_spec: openapiSpec }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API вернул ошибку: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const responseText = data.code || data.text || data.response || "";

      return NextResponse.json({ text: responseText });
    }

    // Режим Green и другие - генерация из текста
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Текст запроса обязателен" },
        { status: 400 }
      );
    }

    // Используем новый эндпоинт для генерации Allure тестов
    const response = await fetch(ALLURE_GENERATOR_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API вернул ошибку: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Новый эндпоинт возвращает { code: string }
    const responseText = data.code || data.text || data.response || "";

    return NextResponse.json({ text: responseText });
  } catch (error) {
    console.error("Ошибка при отправке запроса:", error);
    
    // В случае ошибки возвращаем сообщение об ошибке
    return NextResponse.json(
      { 
        text: `Ошибка подключения к API генерации тестов.\n\nОшибка: ${error instanceof Error ? error.message : "Неизвестная ошибка"}\n\nУбедитесь, что сервер запущен на порту 8000.` 
      },
      { status: 500 }
    );
  }
}

