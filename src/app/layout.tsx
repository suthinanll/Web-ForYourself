import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const themeScript = `
  (function () {
    try {
      const storedTheme = localStorage.getItem('theme');
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = storedTheme === 'light' ? false : storedTheme === 'dark' ? true : systemPrefersDark;

      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Theme initialization failed', error);
    }
  })();
`;

const kanit = Kanit({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  display: "swap",
  variable: "--font-kanit",
  preload: false,
});

// 1. ตั้งค่า Metadata สำหรับ PWA
export const metadata: Metadata = {
  title: "LogLife",
  description: "แอปพลิเคชันจัดการชีวิตส่วนตัวของคุณแบบครบวงจร",
  manifest: "/manifest.json", // ลิงก์ไปยังไฟล์ manifest
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LogLife",
  },
};

// 2. ตั้งค่า Viewport (แยกออกมาตามโครงสร้างใหม่ของ Next.js)
export const viewport: Viewport = {
  themeColor: "#000000", // เปลี่ยนเป็นสีธีมหลักของแอปคุณได้
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={`${kanit.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${kanit.variable} min-h-full flex flex-col font-sans transition-colors duration-300`}>
        {children}
      </body>
    </html>
  );
}