import type { Metadata } from "next";
import "./globals.css";
import { SnackThemeProvider } from "./providers/SnackThemeProvider";

export const metadata: Metadata = {
  title: "Моё приложение",
  description: "Next + Snack UIKit",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <SnackThemeProvider>{children}</SnackThemeProvider>
      </body>
    </html>
  );
}
