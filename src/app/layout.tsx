import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import { Toaster } from "@/components/Toaster";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudySprint",
  description: "An exam study planner.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme is set by THEME_SCRIPT before the page is drawn, so React must
    // accept the value it finds there (suppressHydrationWarning).
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <NavBar />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
