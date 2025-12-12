"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import React from "react";

// Динамический импорт CodeEditor только на клиенте
const CodeEditor = dynamic(
  async () => {
    const [{ CodeEditor, loader }, monacoModule] = await Promise.all([
      import("@snack-uikit/code-editor"),
      import("monaco-editor"),
    ]);
    
    const monaco = monacoModule.default || monacoModule;
    
    // Настройка Monaco Editor только на клиенте
    if (typeof window !== "undefined") {
      loader.config({ monaco });
    }
    
    return CodeEditor;
  },
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: 200,
          background: "var(--sidebar-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--foreground)",
        }}
      >
        Загрузка редактора...
      </div>
    ),
  }
);

// Определяем язык на основе содержимого
const detectLanguage = (text: string): string => {
  if (!text) return "plaintext";
  
  const trimmed = text.trim();
  
  // Python
  if (trimmed.includes("def ") || trimmed.includes("import ") || trimmed.includes("@") && trimmed.includes("class ")) {
    return "python";
  }
  
  // JavaScript/TypeScript
  if (trimmed.includes("function ") || trimmed.includes("const ") || trimmed.includes("export ")) {
    return "javascript";
  }
  
  // JSON
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      // Не JSON
    }
  }
  
  // YAML
  if (trimmed.includes(":") && (trimmed.includes("- ") || trimmed.split("\n").length > 2)) {
    return "yaml";
  }
  
  // HTML
  if (trimmed.includes("<") && trimmed.includes(">")) {
    return "html";
  }
  
  // CSS
  if (trimmed.includes("{") && trimmed.includes("}") && trimmed.includes(":")) {
    return "css";
  }
  
  return "plaintext";
};

type CodeEditorWrapperProps = {
  value: string;
  height?: string | number;
  isLoading?: boolean;
};

export const CodeEditorWrapper = ({ 
  value, 
  height = "300px",
  isLoading = false 
}: CodeEditorWrapperProps) => {
  const [language, setLanguage] = useState<string>("plaintext");
  const [isMounted, setIsMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (value) {
      setLanguage(detectLanguage(value));
    }
  }, [value]);

  if (!isMounted) {
    return (
      <div
        style={{
          height,
          background: "var(--sidebar-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--foreground)",
        }}
      >
        Загрузка редактора...
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        style={{
          height,
          background: "var(--sidebar-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--foreground)",
        }}
      >
        Загрузка...
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Ошибка копирования:", error);
      // Fallback для старых браузеров
      const textArea = document.createElement("textarea");
      textArea.value = value;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Ошибка копирования через fallback:", err);
      }
      document.body.removeChild(textArea);
    }
  };

  // Вычисляем минимальную высоту на основе количества строк
  // Увеличена максимальная высота с 600 до 1000px для больших результатов
  const lineCount = value ? value.split("\n").length : 1;
  const minHeight = Math.max(300, Math.min(1000, lineCount * 20 + 40));

  return (
    <div style={{ borderRadius: 8, overflow: "hidden", minHeight, position: "relative" }}>
      <CodeEditor
        value={value || ""}
        language={language}
        theme="vs-dark"
        height={typeof height === "string" && height === "auto" ? minHeight : height}
        width="100%"
        options={{
          readOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          lineHeight: 20,
          fontFamily: "var(--font-jetbrains-mono), 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
          wordWrap: "on",
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
        }}
        hasBackground={false}
        hasHeader={false}
        onCopyClick={handleCopy}
      />
      {/* Кнопка копирования */}
      {value && (
        <button
          onClick={handleCopy}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            padding: "6px 12px",
            background: copied ? "var(--accent-primary)" : "rgba(0, 0, 0, 0.6)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "all 0.2s",
            zIndex: 10,
            backdropFilter: "blur(4px)",
          }}
          onMouseEnter={(e) => {
            if (!copied) {
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.8)";
            }
          }}
          onMouseLeave={(e) => {
            if (!copied) {
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.6)";
            }
          }}
        >
          {copied ? (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Скопировано
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Копировать
            </>
          )}
        </button>
      )}
    </div>
  );
};

