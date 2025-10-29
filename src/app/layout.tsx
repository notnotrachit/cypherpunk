import type { Metadata } from "next";
import { Hanken_Grotesk, Fauna_One, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import NextAuthProvider from "@/components/NextAuthProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-sans",
});

const crete = Fauna_One({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-serif",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Rivo",
  description:
    "Set AUTH_JWT_SECRET in your environment to enable secure wallet auth.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://tweakcn.com/live-preview.min.js"></script>
      </head>
      <body className={`${hanken.variable} ${crete.variable} ${jetbrains.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <NextAuthProvider>{children}</NextAuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
