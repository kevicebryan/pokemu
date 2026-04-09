import type { Metadata } from "next";
import { mantineHtmlProps } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Pokemu",
  description: "8-bit cultural restoration adventure",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head />
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
