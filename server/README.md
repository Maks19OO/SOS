# Allure Test Generator Server

Сервер для генерации Python кода тестов с Allure декораторами на основе текстовых требований.

## Установка

1. Установите зависимости:
```bash
pip install -r requirements.txt
```

2. Настройте переменные окружения (опционально):
```bash
export OPENAI_API_KEY="your-api-key"
export OPENAI_BASE_URL="https://foundation-models.api.cloud.ru/v1"
```

## Запуск

```bash
python main.py
```

Или через uvicorn:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Сервер будет доступен по адресу: `http://localhost:8000`

## API Endpoints

### POST /generate
Генерирует Python код тестов Allure на основе текстовых требований.

**Request:**
```json
{
  "text": "Текстовое описание тест-кейсов"
}
```

**Response:**
```json
{
  "code": "import allure\nimport pytest\n..."
}
```

### GET /health
Проверка здоровья сервера.

**Response:**
```json
{
  "status": "ok"
}
```

## Пример использования

```bash
curl -X POST "http://localhost:8000/generate" \
  -H "Content-Type: application/json" \
  -d '{"text": "Тест регистрации пользователя"}'
```

