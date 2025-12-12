# -*- coding: utf-8 -*-
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field
from openai import OpenAI
from schemas.AllureTestOps import AllureTestOpsReport
from typing import Optional, Dict, Any
import os
import json
import sys
import io
import traceback
import httpx
import yaml
from starlette.middleware.base import BaseHTTPMiddleware

# Убеждаемся, что используется UTF-8 для всех операций
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

app = FastAPI()

# Middleware для увеличения лимита размера тела запроса
class LargeRequestMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Увеличиваем лимит размера тела запроса до 200MB
        if request.method == "POST":
            # Читаем тело запроса с увеличенным лимитом
            body = await request.body()
            # Создаем новый request с прочитанным телом
            async def receive():
                return {"type": "http.request", "body": body}
            request._receive = receive
        response = await call_next(request)
        return response

app.add_middleware(LargeRequestMiddleware)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Конфигурация OpenAI
# Загружаем API ключ из переменной окружения или используем дефолтное значение
env_api_key = os.getenv("OPENAI_API_KEY")
default_api_key = "OGM3MWNiOTUtMjQzZi00NjIxLTg0ZjktNGIwNzg2MWY5NGU3.6005fbcea80d9e11b159148d75016cc8"

if env_api_key:
    api_key = env_api_key
    print(f"[DEBUG] API ключ загружен из переменной окружения OPENAI_API_KEY", file=sys.stderr)
else:
    api_key = default_api_key
    print(f"[DEBUG] Используется дефолтный API ключ (переменная OPENAI_API_KEY не установлена)", file=sys.stderr)

url = os.getenv("OPENAI_BASE_URL", "https://foundation-models.api.cloud.ru/v1")

# Проверяем, что API ключ не пустой
if not api_key or len(api_key.strip()) == 0:
    print(f"[ERROR] API ключ пустой или не найден!", file=sys.stderr)
    raise ValueError("API ключ не может быть пустым! Установите переменную окружения OPENAI_API_KEY или проверьте дефолтное значение.")

# Удаляем пробелы в начале и конце (на случай, если они там есть)
api_key = api_key.strip()

# Проверяем длину и содержимое API ключа
# ВАЖНО: НЕ удаляем не-ASCII символы из API ключа, так как это может быть частью ключа
# Вместо этого просто проверяем и логируем
try:
    api_key.encode('ascii')
    is_ascii = True
except UnicodeEncodeError:
    is_ascii = False
    print(f"[WARNING] API ключ содержит не-ASCII символы. Это может быть проблемой, если сервер API не поддерживает такие ключи.", file=sys.stderr)
    # Показываем какие символы не-ASCII (для отладки)
    non_ascii_chars = [c for c in api_key if ord(c) > 127]
    if non_ascii_chars:
        print(f"[DEBUG] Найдены не-ASCII символы: {set(non_ascii_chars)}", file=sys.stderr)

# Логируем информацию о ключе для отладки (безопасно - только первые и последние символы)
if len(api_key) > 10:
    print(f"[DEBUG] API ключ загружен: {api_key[:5]}...{api_key[-5:]} (длина: {len(api_key)}, ASCII: {is_ascii})", file=sys.stderr)
else:
    print(f"[WARNING] API ключ очень короткий: {api_key[:min(20, len(api_key))]} (длина: {len(api_key)})", file=sys.stderr)
    print(f"[WARNING] Это может быть проблемой! API ключи обычно длиннее.", file=sys.stderr)

# Патч для httpx.Headers для правильной обработки не-ASCII символов
# Проблема: httpx пытается закодировать заголовки в ASCII, но попадаются не-ASCII символы
# Решение: используем latin-1 для значений, которые не могут быть закодированы в ASCII
# Это безопасно, так как latin-1 может хранить любые байты без потери данных
try:
    _original_normalize_header_value = httpx._models._normalize_header_value
    
    def _safe_normalize_header_value(value, encoding=None):
        """Безопасная нормализация значения заголовка с поддержкой не-ASCII символов"""
        if isinstance(value, str):
            # Пытаемся закодировать в указанную кодировку (обычно ASCII)
            try:
                return value.encode(encoding or "ascii")
            except UnicodeEncodeError:
                # Если не получается закодировать в ASCII, проверяем тип заголовка
                # Проверяем, не является ли это Authorization заголовком
                if value.startswith("Bearer "):
                    # Для Authorization заголовков используем latin-1 кодировку
                    # latin-1 может хранить любые байты (0-255) без потери данных
                    # Это безопасно для API ключей с не-ASCII символами
                    try:
                        # Преобразуем UTF-8 в latin-1 (безопасно, так как latin-1 покрывает все байты)
                        utf8_bytes = value.encode('utf-8')
                        latin1_str = utf8_bytes.decode('latin-1', errors='strict')
                        # Используем latin-1 для кодирования, если исходная кодировка была ASCII
                        if encoding == "ascii" or encoding is None:
                            return latin1_str.encode("latin-1")
                        else:
                            return latin1_str.encode(encoding)
                    except Exception as e:
                        # Если не получается, логируем ошибку и пробуем оригинальную функцию
                        print(f"[WARNING] Проблема с кодировкой Authorization заголовка: {e}", file=sys.stderr)
                        try:
                            return _original_normalize_header_value(value, encoding)
                        except:
                            # В крайнем случае используем UTF-8 -> latin-1 с заменой ошибок
                            utf8_bytes = value.encode('utf-8')
                            latin1_str = utf8_bytes.decode('latin-1', errors='replace')
                            return latin1_str.encode(encoding or "latin-1")
                else:
                    # Для других заголовков используем latin-1
                    try:
                        # Преобразуем UTF-8 в latin-1 (безопасно, так как latin-1 покрывает все байты)
                        utf8_bytes = value.encode('utf-8')
                        latin1_str = utf8_bytes.decode('latin-1', errors='replace')
                        return latin1_str.encode(encoding or "latin-1")
                    except:
                        # В крайнем случае удаляем не-ASCII символы (только для не-критичных заголовков)
                        safe_value = value.encode('ascii', errors='ignore').decode('ascii')
                        if safe_value != value:
                            print(f"[WARNING] Удалены не-ASCII символы из заголовка: {value[:50]}...", file=sys.stderr)
                        return safe_value.encode(encoding or "ascii")
        return _original_normalize_header_value(value, encoding)
    
    # Применяем патч
    httpx._models._normalize_header_value = _safe_normalize_header_value
except (AttributeError, ImportError) as e:
    # Если не удалось применить патч, логируем предупреждение
    print(f"[WARNING] Не удалось применить патч для httpx: {e}", file=sys.stderr)

# Создаем клиент OpenAI
# ВАЖНО: Кириллица должна быть только в теле запроса (в messages), а не в заголовках
# Увеличиваем timeout до 300 секунд (5 минут) для больших запросов
print(f"[DEBUG] Создание клиента OpenAI с API ключом длиной {len(api_key)} символов", file=sys.stderr)
client = OpenAI(
    api_key=api_key,
    base_url=url,
    timeout=300.0,  # 5 минут для больших запросов
)

# Проверяем, что клиент получил правильный ключ
if hasattr(client, 'api_key'):
    client_api_key = client.api_key
    if client_api_key != api_key:
        print(f"[ERROR] Несоответствие API ключа! Переданный: {len(api_key)} символов, клиент получил: {len(client_api_key) if client_api_key else 0} символов", file=sys.stderr)
    else:
        print(f"[DEBUG] Клиент OpenAI успешно создан с API ключом длиной {len(client_api_key)} символов", file=sys.stderr)
else:
    print(f"[WARNING] Не удалось проверить API ключ клиента", file=sys.stderr)


class GenerateRequest(BaseModel):
    text: str


class GenerateFromOpenAPIRequest(BaseModel):
    openapi_spec: str = Field(..., min_length=1, description="OpenAPI спецификация в формате YAML или JSON (строка)")


class GenerateResponse(BaseModel):
    code: str


def safe_str(obj) -> str:
    """Безопасное преобразование объекта в строку с поддержкой UTF-8"""
    try:
        if obj is None:
            return ""
        if isinstance(obj, bytes):
            return obj.decode('utf-8', errors='replace')
        if isinstance(obj, str):
            # Убеждаемся, что строка правильно закодирована
            try:
                obj.encode('utf-8')
                return obj
            except UnicodeEncodeError:
                return obj.encode('utf-8', errors='replace').decode('utf-8')
        # Для других типов используем стандартное преобразование
        result = str(obj)
        try:
            result.encode('utf-8')
            return result
        except UnicodeEncodeError:
            return result.encode('utf-8', errors='replace').decode('utf-8')
    except Exception:
        return "Ошибка преобразования в строку"


def escape_string(s: str) -> str:
    """Безопасное экранирование строк для Python кода"""
    if not s:
        return ""
    # Преобразуем в безопасную строку
    s = safe_str(s)
    # Экранируем кавычки и обратные слеши
    s = s.replace("\\", "\\\\")
    s = s.replace('"', '\\"')
    s = s.replace("\n", "\\n")
    s = s.replace("\r", "\\r")
    s = s.replace("\t", "\\t")
    return s


def generate_allure_test_code(report: AllureTestOpsReport) -> str:
    """Генерирует Python код с Allure декораторами на основе отчета"""
    try:
        code_lines = []
        
        # Импорты (добавляем только один раз)
        code_lines.append("import allure")
        code_lines.append("import pytest")
        code_lines.append("from pytest import mark")
        code_lines.append("from contextlib import contextmanager")
        code_lines.append("")
        code_lines.append("")
        code_lines.append("@contextmanager")
        code_lines.append("def allure_step(step_name: str):")
        code_lines.append('    """Контекстный менеджер для шагов Allure"""')
        code_lines.append("    with allure.step(step_name):")
        code_lines.append("        yield")
        code_lines.append("")
        code_lines.append("")
        
        for test_case in report.testCases:
            test = test_case.test
            steps = test_case.steps
            
            # Безопасно обрабатываем все строки
            owner = safe_str(test.owner)
            feature = safe_str(test.feature)
            story = safe_str(test.story)
            test_type = safe_str(test.test_type)
            title = safe_str(test.title) if test.title else None
            
            # Определяем имя класса на основе feature или test_type
            class_name = f"{feature.replace(' ', '').replace('-', '')}Tests"
            if test_type:
                class_name = f"{test_type.replace(' ', '').replace('-', '')}Tests"
            
            # Декораторы класса
            code_lines.append("@allure.manual")
            code_lines.append("")
            code_lines.append(f'@allure.label("owner", "{escape_string(owner)}")')
            code_lines.append(f'@allure.feature("{escape_string(feature)}")')
            code_lines.append(f'@allure.story("{escape_string(story)}")')
            code_lines.append(f'@allure.suite("{escape_string(test_type)}")')
            code_lines.append("@mark.manual")
            code_lines.append(f"class {class_name}:")
            code_lines.append("")
            
            # Определяем имя функции теста
            if title:
                function_name = "test_" + title.lower().replace(" ", "_").replace("-", "_")
            else:
                function_name = "test_function"
            function_name = "".join(c if c.isalnum() or c == "_" else "_" for c in function_name)
            
            # Декораторы метода
            if title:
                code_lines.append(f'    @allure.title("{escape_string(title)}")')
            
            # Jira ссылка (если есть в labels)
            jira_link = safe_str(test.labels.get("jira_link", ""))
            jira_name = safe_str(test.labels.get("jira_name", ""))
            if jira_link:
                code_lines.append(f'    @allure.link("{escape_string(jira_link)}", name="{escape_string(jira_name)}")')
            
            # Теги и приоритет
            if test.tags:
                # Берем первый тег как основной (CRITICAL, NORMAL, LOW)
                main_tag = safe_str(test.tags[0] if test.tags else test.priority.value)
                code_lines.append(f'    @allure.tag("{escape_string(main_tag)}")')
            
            priority = safe_str(test.priority.value)
            code_lines.append(f'    @allure.label("priority", "{escape_string(priority)}")')
            code_lines.append(f"    def {function_name}(self) -> None:")
            
            # Шаги теста
            for i, step in enumerate(steps):
                step_name = escape_string(safe_str(step.step_name))
                step_action = escape_string(safe_str(step.step_action)) if step.step_action else ""
                
                code_lines.append(f'        with allure_step("{step_name}"):')
                
                if step.attachments:
                    for attachment in step.attachments:
                        attachment_path = escape_string(safe_str(attachment))
                        attachment_name = escape_string(safe_str(attachment.split("/")[-1]))
                        code_lines.append(f"            allure.attach.file(")
                        code_lines.append(f'                "{attachment_path}",')
                        code_lines.append(f'                name="{attachment_name}",')
                        code_lines.append(f"                attachment_type=allure.attachment_type.PNG,")
                        code_lines.append(f"            )")
                else:
                    code_lines.append("            pass")
            
            code_lines.append("")
            code_lines.append("")
        
        # Объединяем все строки
        result = "\n".join(code_lines)
        
        # Убеждаемся, что результат правильно закодирован
        if isinstance(result, bytes):
            result = result.decode('utf-8', errors='replace')
        result.encode('utf-8')  # Проверка кодировки
        
        return result
    except Exception as e:
        # Если произошла ошибка при генерации, логируем и пробрасываем
        error_msg = safe_str(e)
        print(f"[ERROR] Ошибка в generate_allure_test_code: {error_msg}", file=sys.stderr)
        raise


@app.post("/generate", response_model=GenerateResponse)
async def generate_test_code(request: GenerateRequest):
    """Генерирует код тестов Allure на основе текстовых требований"""
    try:
        # Логируем начало обработки (для отладки)
        print(f"[DEBUG] Начало обработки запроса, длина текста: {len(request.text)}")
        # Системный промпт для генерации тест-кейсов
        system_prompt = '''Ты — Senior QA Automation Engineer и Python-разработчик, эксперт по тест-дизайну, Allure TestOps as Code и паттерну AAA (Arrange-Act-Assert).

Твоя задача — по текстовым требованиям генерировать ручные тест-кейсы в виде корректного Python-кода в формате Allure TestOps as Code.

Входные данные могут содержать различные сценарии и типы тестов, включая как UI, так и API. Твои задачи следующие:

Если указано, что это UI-тестирование, то необходимо сгенерировать тесты для проверки интерфейса пользователя, учитывая указанные блоки UI.

Если указано, что это API-тестирование, генерировать тесты для проверки функциональности API, включая авторизацию и работу с REST-запросами.

Ты всегда возвращаешь ТОЛЬКО Python-код. Без объяснений, без markdown, без текста вокруг.

Каждый тест-кейс должен:

Использовать строгий паттерн AAA:
with allure_step("Arrange: ...")
with allure_step("Act: ...")
with allure_step("Assert: ...");

Включать обязательные декораторы:
@allure.manual
@allure.label("owner", "<owner>")
@allure.feature("<feature>")
@allure.story("<story>")
@allure.suite("<suite>")
@mark.manual

Иметь корректные:
@allure.title(...), @allure.link(...), @allure.tag("CRITICAL" | "NORMAL" | "LOW"), @allure.label("priority", ...).

Код должен быть синтаксически валидным Python: корректные импорты, отступы, структура классов и методов.

В начале файла всегда создавай импорты:
import allure
from pytest import mark
from allure_commons._allure import step as allure_step

Не придумывай значения owner/feature/story/priority — используй те, что переданы во входных данных пользователя.

Если пользователь не просит иное, ориентируйся на 25–35 тест-кейсов. Если указано точное число — соблюдай его.

Ты обязан соблюдать:
- структуру кода;
- паттерн AAA;
- стандарты Allure и naming-conventions;
- корректное именование методов (test_*).
- Все тестовые шаги, описания и имена тестов внутри должны быть на русском языке, **если не указано иное**. Однако, если **в требованиях или тексте** шагов или названий тестов прямо указано, что шаг должен быть на английском языке, то такой шаг или название должно быть на английском. В остальных случаях — всё на русском.

Возвращай только готовый Python-код.

'''
        
        # Формируем сообщения для OpenAI
        # Используем только данные, которые приходят с фронтенда
        # Убеждаемся, что все строки правильно обработаны
        user_content = safe_str(request.text)
        system_content = safe_str(system_prompt)
        
        messages = [
            {
                "role": "system",
                "content": system_content
            },
            {
                "role": "user",
                "content": user_content
            }
        ]
        
        # Вызываем OpenAI API
        # Используем стандартный метод create и парсим JSON ответ
        try:
            # Получаем API ключ из клиента для логирования
            client_api_key = getattr(client, 'api_key', api_key) if hasattr(client, 'api_key') else api_key
            client_api_key_str = str(client_api_key) if client_api_key else "НЕТ"
            
            # Логируем информацию о запросе для отладки
            print(f"[DEBUG] Отправка запроса к OpenAI API, модель: Qwen/Qwen3-235B-A22B-Instruct-2507", file=sys.stderr)
            if client_api_key_str and len(client_api_key_str) > 10:
                print(f"[DEBUG] API ключ клиента (первые 10 символов): {client_api_key_str[:10]}... (длина: {len(client_api_key_str)})", file=sys.stderr)
            else:
                print(f"[ERROR] API ключ клиента пустой или слишком короткий: '{client_api_key_str}' (длина: {len(client_api_key_str) if client_api_key_str else 0})", file=sys.stderr)
            print(f"[DEBUG] Base URL: {url}", file=sys.stderr)
            
            response = client.chat.completions.create(
                model="Qwen/Qwen3-235B-A22B-Instruct-2507",
                max_tokens=5000,  # Увеличено для полных ответов (предыдущая ошибка была из-за обрезанного JSON)
                temperature=0.5,
                presence_penalty=0,
                top_p=0.95,
                messages=messages,
                response_format={"type": "json_object"}  # Указываем, что нужен JSON ответ
            )
        except Exception as api_error:
            # Детальное логирование ошибки API
            error_type = type(api_error).__name__
            error_msg = safe_str(api_error)
            client_api_key = getattr(client, 'api_key', api_key) if hasattr(client, 'api_key') else api_key
            client_api_key_str = str(client_api_key) if client_api_key else "НЕТ"
            
            print(f"[ERROR] Ошибка при вызове OpenAI API:", file=sys.stderr)
            print(f"[ERROR] Тип ошибки: {error_type}", file=sys.stderr)
            print(f"[ERROR] Сообщение: {error_msg}", file=sys.stderr)
            if client_api_key_str and len(client_api_key_str) > 10:
                print(f"[ERROR] API ключ клиента (первые 10 символов): {client_api_key_str[:10]}... (длина: {len(client_api_key_str)})", file=sys.stderr)
            else:
                print(f"[ERROR] API ключ клиента пустой или слишком короткий: '{client_api_key_str}' (длина: {len(client_api_key_str) if client_api_key_str else 0})", file=sys.stderr)
            print(f"[ERROR] Base URL: {url}", file=sys.stderr)
            
            # Специальная обработка timeout ошибок
            if "timeout" in error_msg.lower() or "APITimeoutError" in error_type:
                print(f"[WARNING] Запрос превысил время ожидания (timeout). Возможно, запрос слишком большой или сервер перегружен.", file=sys.stderr)
                raise HTTPException(
                    status_code=504,
                    detail="Запрос к API превысил время ожидания. Попробуйте уменьшить размер запроса или повторить попытку позже."
                )
            
            # Пробрасываем ошибку дальше
            raise
        
        # Получаем текст ответа
        response_text = response.choices[0].message.content
        
        # Проверяем, не был ли ответ обрезан
        finish_reason = response.choices[0].finish_reason if hasattr(response.choices[0], 'finish_reason') else None
        if finish_reason == "length":
            print(f"[WARNING] Ответ был обрезан из-за достижения лимита max_tokens!", file=sys.stderr)
            print(f"[WARNING] Рекомендуется увеличить max_tokens для полного ответа.", file=sys.stderr)
        
        if not response_text:
            raise HTTPException(status_code=500, detail="Пустой ответ от OpenAI")
        
        # Логируем информацию о ответе для отладки
        response_length = len(response_text)
        print(f"[DEBUG] Получен ответ от OpenAI, длина: {response_length} символов", file=sys.stderr)
        if response_length > 200:
            print(f"[DEBUG] Начало ответа: {response_text[:100]}...", file=sys.stderr)
            print(f"[DEBUG] Конец ответа: ...{response_text[-100:]}", file=sys.stderr)
        else:
            print(f"[DEBUG] Полный ответ: {response_text}", file=sys.stderr)
        
        # Парсим JSON ответ в Pydantic модель
        try:
            response_json = json.loads(response_text)
            report = AllureTestOpsReport(**response_json)
        except json.JSONDecodeError as e:
            error_msg = safe_str(e)
            error_pos = getattr(e, 'pos', None)
            error_line = getattr(e, 'lineno', None)
            error_col = getattr(e, 'colno', None)
            
            print(f"[ERROR] Ошибка парсинга JSON:", file=sys.stderr)
            print(f"[ERROR] Сообщение: {error_msg}", file=sys.stderr)
            if error_pos:
                print(f"[ERROR] Позиция ошибки: {error_pos} (символ {error_pos} из {response_length})", file=sys.stderr)
            if error_line:
                print(f"[ERROR] Строка: {error_line}, колонка: {error_col}", file=sys.stderr)
            
            # Показываем контекст вокруг ошибки
            if error_pos:
                start = max(0, error_pos - 100)
                end = min(response_length, error_pos + 100)
                context = response_text[start:end]
                print(f"[ERROR] Контекст вокруг ошибки: ...{context}...", file=sys.stderr)
            
            # Пытаемся найти и исправить обрезанный JSON
            if error_pos and error_pos > response_length * 0.9:
                print(f"[WARNING] Возможно, JSON ответ обрезан. Пытаемся исправить...", file=sys.stderr)
                # Пытаемся найти последнюю закрывающую скобку
                last_brace = response_text.rfind('}')
                last_bracket = response_text.rfind(']')
                if last_brace > 0 or last_bracket > 0:
                    cut_pos = max(last_brace, last_bracket) + 1
                    try:
                        fixed_json = response_text[:cut_pos]
                        response_json = json.loads(fixed_json)
                        print(f"[INFO] JSON успешно исправлен, обрезано {response_length - cut_pos} символов", file=sys.stderr)
                        report = AllureTestOpsReport(**response_json)
                    except:
                        pass
            
            raise HTTPException(
                status_code=500, 
                detail=f"Ошибка парсинга JSON ответа от OpenAI: {error_msg}. Возможно, ответ обрезан или содержит невалидный JSON."
            )
        except ValueError as e:
            error_msg = safe_str(e)
            print(f"[ERROR] Ошибка валидации данных: {error_msg}", file=sys.stderr)
            raise HTTPException(status_code=500, detail=f"Ошибка валидации ответа от OpenAI: {error_msg}")
        
        # Генерируем код
        try:
            code = generate_allure_test_code(report)
            # Убеждаемся, что код правильно закодирован в UTF-8
            if isinstance(code, bytes):
                code = code.decode('utf-8', errors='replace')
            # Проверяем, что код можно закодировать обратно (для валидации)
            code.encode('utf-8')
        except Exception as gen_error:
            error_msg = safe_str(gen_error)
            raise HTTPException(status_code=500, detail=f"Ошибка при генерации кода: {error_msg}")
        
        return GenerateResponse(code=code)
        
    except HTTPException:
        # Пробрасываем HTTPException как есть
        raise
    except Exception as e:
        # Безопасная обработка ошибок с поддержкой UTF-8
        try:
            # Получаем информацию об ошибке безопасным способом
            error_type = type(e).__name__
            error_msg = safe_str(e)
            
            # Пытаемся получить traceback для отладки
            try:
                tb_str = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
                tb_str = safe_str(tb_str)
                # Логируем полный traceback в консоль (для отладки)
                print(f"[ERROR] Traceback: {tb_str}", file=sys.stderr)
            except:
                pass
            
            # Формируем сообщение об ошибке
            if error_msg:
                detail_msg = f"Ошибка при генерации кода ({error_type}): {error_msg}"
            else:
                detail_msg = f"Ошибка при генерации кода ({error_type})"
            
            # Ограничиваем длину сообщения
            if len(detail_msg) > 500:
                detail_msg = detail_msg[:500] + "..."
            
            # Убеждаемся, что сообщение можно закодировать в UTF-8
            try:
                detail_msg.encode('utf-8')
            except UnicodeEncodeError:
                detail_msg = f"Ошибка при генерации кода ({error_type})"
            
            raise HTTPException(status_code=500, detail=detail_msg)
        except HTTPException:
            # Если это уже HTTPException, пробрасываем
            raise
        except Exception as inner_e:
            # Если произошла ошибка при обработке ошибки, используем базовое сообщение
            try:
                print(f"[ERROR] Ошибка при обработке ошибки: {safe_str(inner_e)}", file=sys.stderr)
            except:
                pass
            raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера")


def parse_openapi_spec(spec_str: str) -> Dict[str, Any]:
    """Парсит OpenAPI спецификацию из YAML или JSON"""
    try:
        # Проверяем, что строка не пустая
        if not spec_str or len(spec_str.strip()) == 0:
            raise ValueError("OpenAPI спецификация пустая")
        
        spec_length = len(spec_str)
        print(f"[DEBUG] Размер OpenAPI спецификации для парсинга: {spec_length} символов ({(spec_length / 1024 / 1024):.2f} MB)", file=sys.stderr)
        
        # Показываем первые 200 символов для отладки
        preview = spec_str[:200] if len(spec_str) > 200 else spec_str
        print(f"[DEBUG] Начало спецификации: {preview}...", file=sys.stderr)
        
        # Пытаемся распарсить как YAML
        try:
            spec = yaml.safe_load(spec_str)
            if spec is None:
                raise ValueError("YAML парсер вернул None - возможно, файл пустой или невалидный")
            print(f"[DEBUG] Успешно распарсено как YAML", file=sys.stderr)
            return spec
        except yaml.YAMLError as yaml_error:
            print(f"[DEBUG] Не удалось распарсить как YAML: {safe_str(yaml_error)}", file=sys.stderr)
            # Если не получилось, пытаемся как JSON
            try:
                spec = json.loads(spec_str)
                if spec is None:
                    raise ValueError("JSON парсер вернул None - возможно, файл пустой или невалидный")
                print(f"[DEBUG] Успешно распарсено как JSON", file=sys.stderr)
                return spec
            except json.JSONDecodeError as json_error:
                error_msg = safe_str(json_error)
                print(f"[ERROR] Не удалось распарсить как JSON: {error_msg}", file=sys.stderr)
                raise ValueError(f"Не удалось распарсить OpenAPI спецификацию. YAML ошибка: {safe_str(yaml_error)}, JSON ошибка: {error_msg}")
    except ValueError:
        # Пробрасываем ValueError как есть
        raise
    except Exception as e:
        error_msg = safe_str(e)
        print(f"[ERROR] Неожиданная ошибка при парсинге: {error_msg}", file=sys.stderr)
        raise ValueError(f"Ошибка при парсинге OpenAPI спецификации: {error_msg}")


def generate_tests_from_openapi(openapi_spec: Dict[str, Any]) -> str:
    """Генерирует Python код тестов на основе OpenAPI спецификации с использованием LLM"""
    try:
        # Системный промпт для генерации автоматизированных тестов из OpenAPI
        system_prompt = '''Ты — Senior QA Automation Engineer и Python-разработчик, эксперт по тест-дизайну, Allure TestOps as Code и паттерну AAA (Arrange-Act-Assert).

Твоя задача — по текстовым требованиям генерировать ручные тест-кейсы в виде корректного Python-кода в формате Allure TestOps as Code.

Входные данные могут содержать различные сценарии и типы тестов, включая как UI, так и API. Твои задачи следующие:

Если указано, что это UI-тестирование, то необходимо сгенерировать тесты для проверки интерфейса пользователя, учитывая указанные блоки UI.

Если указано, что это API-тестирование, генерировать тесты для проверки функциональности API, включая авторизацию и работу с REST-запросами.

Ты всегда возвращаешь ТОЛЬКО Python-код. Без объяснений, без markdown, без текста вокруг.

Каждый тест-кейс должен:

Использовать строгий паттерн AAA:
with allure_step("Arrange: ...")
with allure_step("Act: ...")
with allure_step("Assert: ...");

Включать обязательные декораторы:
@allure.manual
@allure.label("owner", "<owner>")
@allure.feature("<feature>")
@allure.story("<story>")
@allure.suite("<suite>")
@mark.manual

Иметь корректные:
@allure.title(...), @allure.link(...), @allure.tag("CRITICAL" | "NORMAL" | "LOW"), @allure.label("priority", ...).

Код должен быть синтаксически валидным Python: корректные импорты, отступы, структура классов и методов.

В начале файла всегда создавай импорты:
import allure
from pytest import mark
from allure_commons._allure import step as allure_step

Не придумывай значения owner/feature/story/priority — используй те, что переданы во входных данных пользователя.

Если пользователь не просит иное, ориентируйся на 25–35 тест-кейсов. Если указано точное число — соблюдай его.

Ты обязан соблюдать:
- структуру кода;
- паттерн AAA;
- стандарты Allure и naming-conventions;
- корректное именование методов (test_*).
- Все тестовые шаги, описания и имена тестов внутри должны быть на русском языке, **если не указано иное**. Однако, если **в требованиях или тексте** шагов или названий тестов прямо указано, что шаг должен быть на английском языке, то такой шаг или название должно быть на английском. В остальных случаях — всё на русском.

Возвращай только готовый Python-код.
'''
        
        # Преобразуем OpenAPI спецификацию в JSON строку для промпта
        openapi_json = json.dumps(openapi_spec, ensure_ascii=False, indent=2)
        
        # Формируем сообщения для OpenAI
        user_content = f'''Сгенерируй автоматизированные тесты на Python для следующей OpenAPI спецификации:

{openapi_json}

Создай полный набор тестов со всеми необходимыми проверками, обработкой параметров и валидацией ответов.'''
        
        messages = [
            {
                "role": "system",
                "content": safe_str(system_prompt)
            },
            {
                "role": "user",
                "content": safe_str(user_content)
            }
        ]
        
        print(f"[DEBUG] Отправка запроса к OpenAI API для генерации тестов из OpenAPI", file=sys.stderr)
        print(f"[DEBUG] Размер OpenAPI спецификации (JSON): {len(openapi_json)} символов", file=sys.stderr)
        
        # Вызываем OpenAI API
        try:
            response = client.chat.completions.create(
                model="Qwen/Qwen3-235B-A22B-Instruct-2507",
                max_tokens=8000,  # Увеличено для больших спецификаций
                temperature=0.3,  # Низкая температура для более детерминированного кода
                presence_penalty=0,
                top_p=0.95,
                messages=messages,
            )
            
            # Получаем текст ответа
            response_text = response.choices[0].message.content
            
            if not response_text:
                raise ValueError("Пустой ответ от OpenAI")
            
            # Очищаем ответ от markdown блоков, если они есть
            code = response_text.strip()
            if code.startswith("```python"):
                code = code[9:]  # Убираем ```python
            if code.startswith("```"):
                code = code[3:]  # Убираем ```
            if code.endswith("```"):
                code = code[:-3]  # Убираем закрывающий ```
            code = code.strip()
            
            print(f"[DEBUG] Получен ответ от OpenAI, длина: {len(code)} символов", file=sys.stderr)
            
            return code
            
        except Exception as api_error:
            error_type = type(api_error).__name__
            error_msg = safe_str(api_error)
            print(f"[ERROR] Ошибка при вызове OpenAI API: {error_type} - {error_msg}", file=sys.stderr)
            raise
        
        # Импорты
        code_lines.append("import allure")
        code_lines.append("import pytest")
        code_lines.append("from pytest import mark")
        code_lines.append("import requests")
        code_lines.append("from typing import Optional, Dict, Any")
        code_lines.append("")
        code_lines.append("")
        
        # Получаем информацию об API
        info = openapi_spec.get("info", {})
        api_title = safe_str(info.get("title", "API"))
        api_version = safe_str(info.get("version", "1.0.0"))
        
        # Базовый URL (если есть в спецификации)
        servers = openapi_spec.get("servers", [])
        base_url = servers[0].get("url", "https://api.example.com") if servers else "https://api.example.com"
        base_url = safe_str(base_url)
        
        # Генерируем тесты для каждого endpoint
        paths = openapi_spec.get("paths", {})
        
        # Группируем тесты по тегам
        tests_by_tag: Dict[str, list] = {}
        
        for path, path_item in paths.items():
            if not isinstance(path_item, dict):
                continue
                
            for method, operation in path_item.items():
                if method.lower() not in ["get", "post", "put", "delete", "patch"]:
                    continue
                    
                if not isinstance(operation, dict):
                    continue
                
                operation_id = safe_str(operation.get("operationId", f"{method}_{path.replace('/', '_').replace('{', '').replace('}', '')}"))
                summary = safe_str(operation.get("summary", operation_id))
                tags = operation.get("tags", ["API"])
                tag = safe_str(tags[0] if tags else "API")
                
                if tag not in tests_by_tag:
                    tests_by_tag[tag] = []
                
                tests_by_tag[tag].append({
                    "path": path,
                    "method": method,
                    "operation": operation,
                    "operation_id": operation_id,
                    "summary": summary
                })
        
        # Генерируем классы тестов для каждого тега
        for tag, tests in tests_by_tag.items():
            class_name = f"{tag.replace(' ', '').replace('-', '')}Tests"
            
            code_lines.append(f"@allure.feature(\"{escape_string(tag)}\")")
            code_lines.append(f"@allure.suite(\"{escape_string(api_title)}\")")
            code_lines.append(f"class {class_name}:")
            code_lines.append("")
            
            for test_info in tests:
                path = test_info["path"]
                method = test_info["method"]
                operation = test_info["operation"]
                operation_id = test_info["operation_id"]
                summary = test_info["summary"]
                
                # Создаем имя метода теста
                test_method_name = f"test_{operation_id.lower().replace('-', '_').replace(' ', '_')}"
                # Очищаем имя метода от недопустимых символов
                test_method_name = "".join(c if c.isalnum() or c == "_" else "_" for c in test_method_name)
                
                code_lines.append(f"    @allure.story(\"{escape_string(summary)}\")")
                code_lines.append(f"    @allure.title(\"{escape_string(summary)}\")")
                code_lines.append(f"    def {test_method_name}(self):")
                code_lines.append(f"        \"\"\"Тест для {method.upper()} {path}\"\"\"")
                code_lines.append(f"        with allure.step(f\"Выполнение запроса {method.upper()} {path}\"):")
                
                # Обрабатываем path parameters
                path_params = [p for p in operation.get("parameters", []) if p.get("in") == "path"]
                if path_params:
                    # Заменяем {param} на {param} в f-string
                    url_path = path
                    for param in path_params:
                        param_name = param.get("name")
                        url_path = url_path.replace(f"{{{param_name}}}", f"{{{{'{param_name}'}}}}")
                    code_lines.append(f"            # Заполните path параметры перед использованием")
                    code_lines.append(f"            url = f\"{base_url}{url_path}\"")
                else:
                    code_lines.append(f"            url = f\"{base_url}{path}\"")
                
                # Обрабатываем query параметры
                query_params = [p for p in operation.get("parameters", []) if p.get("in") == "query"]
                if query_params:
                    code_lines.append("            params = {}")
                    for param in query_params:
                        param_name = safe_str(param.get("name"))
                        param_desc = safe_str(param.get("description", ""))
                        param_schema = param.get("schema", {})
                        param_type = param_schema.get("type", "string")
                        param_default = param_schema.get("default")
                        
                        if param_default is not None:
                            if param_type == "boolean":
                                code_lines.append(f"            params[\"{escape_string(param_name)}\"] = {param_default}")
                            elif param_type == "integer":
                                code_lines.append(f"            params[\"{escape_string(param_name)}\"] = {param_default}")
                            else:
                                code_lines.append(f"            params[\"{escape_string(param_name)}\"] = \"{escape_string(str(param_default))}\"")
                        else:
                            code_lines.append(f"            # params[\"{escape_string(param_name)}\"] = \"значение\"  # {param_desc}")
                    code_lines.append("            ")
                else:
                    code_lines.append("            params = None")
                    code_lines.append("            ")
                
                # Обрабатываем request body для POST/PUT/PATCH
                has_body = False
                if method.lower() in ["post", "put", "patch"]:
                    request_body = operation.get("requestBody")
                    if request_body:
                        has_body = True
                        code_lines.append("            json_data = {}")
                        code_lines.append("            # Заполните json_data необходимыми данными согласно схеме requestBody")
                        code_lines.append("            ")
                
                # Генерируем запрос
                if method.lower() == "get":
                    code_lines.append("            response = requests.get(url, params=params)")
                elif method.lower() == "post":
                    if has_body:
                        code_lines.append("            response = requests.post(url, json=json_data, params=params)")
                    else:
                        code_lines.append("            response = requests.post(url, params=params)")
                elif method.lower() == "put":
                    if has_body:
                        code_lines.append("            response = requests.put(url, json=json_data, params=params)")
                    else:
                        code_lines.append("            response = requests.put(url, params=params)")
                elif method.lower() == "delete":
                    code_lines.append("            response = requests.delete(url, params=params)")
                elif method.lower() == "patch":
                    if has_body:
                        code_lines.append("            response = requests.patch(url, json=json_data, params=params)")
                    else:
                        code_lines.append("            response = requests.patch(url, params=params)")
                
                # Обрабатываем ответы
                responses = operation.get("responses", {})
                code_lines.append("")
                code_lines.append("        with allure.step(\"Проверка статус кода\"):")
                
                # Определяем ожидаемый статус код
                expected_statuses = []
                if "200" in responses:
                    expected_statuses.append(200)
                if "201" in responses:
                    expected_statuses.append(201)
                if "204" in responses:
                    expected_statuses.append(204)
                
                if expected_statuses:
                    if len(expected_statuses) == 1:
                        code_lines.append(f"            assert response.status_code == {expected_statuses[0]}, f\"Ожидался статус {expected_statuses[0]}, получен {{response.status_code}}\"")
                    else:
                        statuses_str = ", ".join(map(str, expected_statuses))
                        code_lines.append(f"            assert response.status_code in [{statuses_str}], f\"Ожидался один из статусов [{statuses_str}], получен {{response.status_code}}\"")
                else:
                    code_lines.append("            assert response.status_code < 400, f\"Ожидался успешный статус код, получен {response.status_code}\"")
                
                code_lines.append("")
                code_lines.append("        with allure.step(\"Проверка структуры ответа\"):")
                code_lines.append("            if response.status_code != 204:")
                code_lines.append("                response_json = response.json()")
                code_lines.append("                assert isinstance(response_json, (dict, list)), \"Ответ должен быть JSON объектом или массивом\"")
                
                code_lines.append("")
                code_lines.append("")
        
        return "\n".join(code_lines)
    except Exception as e:
        error_msg = safe_str(e)
        print(f"[ERROR] Ошибка при генерации тестов из OpenAPI: {error_msg}", file=sys.stderr)
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}", file=sys.stderr)
        raise


@app.post("/lime", response_model=GenerateResponse)
async def generate_tests_from_openapi_endpoint(request: GenerateFromOpenAPIRequest):
    """Генерирует автоматизированные тесты на основе OpenAPI спецификации (режим Lime)"""
    try:
        if not request.openapi_spec:
            raise HTTPException(status_code=400, detail="OpenAPI спецификация не может быть пустой")
        
        spec_size = len(request.openapi_spec)
        print(f"[DEBUG] Начало обработки OpenAPI спецификации (режим Lime), размер: {(spec_size / 1024 / 1024):.2f} MB", file=sys.stderr)
        print(f"[DEBUG] Тип данных: {type(request.openapi_spec)}, длина строки: {spec_size}", file=sys.stderr)
        
        # Парсим OpenAPI спецификацию
        try:
            openapi_spec = parse_openapi_spec(request.openapi_spec)
            print(f"[DEBUG] OpenAPI спецификация успешно распарсена", file=sys.stderr)
        except ValueError as e:
            error_detail = safe_str(e)
            print(f"[ERROR] Ошибка парсинга: {error_detail}", file=sys.stderr)
            raise HTTPException(status_code=400, detail=f"Ошибка парсинга OpenAPI спецификации: {error_detail}")
        
        # Генерируем тесты
        try:
            code = generate_tests_from_openapi(openapi_spec)
            # Убеждаемся, что код правильно закодирован
            if isinstance(code, bytes):
                code = code.decode('utf-8', errors='replace')
            code.encode('utf-8')  # Проверка кодировки
        except Exception as gen_error:
            error_msg = safe_str(gen_error)
            print(f"[ERROR] Ошибка при генерации кода: {error_msg}", file=sys.stderr)
            raise HTTPException(status_code=500, detail=f"Ошибка при генерации кода: {error_msg}")
        
        return GenerateResponse(code=code)
        
    except HTTPException:
        raise
    except Exception as e:
        error_type = type(e).__name__
        error_msg = safe_str(e)
        print(f"[ERROR] Неожиданная ошибка в generate_tests_from_openapi_endpoint: {error_type} - {error_msg}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {error_msg}")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    # Настройки для больших запросов (до 50MB)
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8000,
        limit_concurrency=100,
        limit_max_requests=1000,
        timeout_keep_alive=75,
    )
