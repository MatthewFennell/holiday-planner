import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Holiday Planner",
  description: "Plan your holidays day by day",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Holiday Planner",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-gray-50 min-h-screen">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
