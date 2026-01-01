import type { Metadata } from "next";
import { GoogleAnalytics } from '@next/third-parties/google'
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "49 Generator",
    template: "%s | 49 Generator",
  },
  description: "Generate a 49 in Word.",
  applicationName: "49 Generator",
  appleWebApp: {
    title: "49 Generator",
    capable: true,
    statusBarStyle: "default",
  },
  // optional:
  // icons: {
  //   icon: "/favicon.ico",
  //   apple: "/apple-touch-icon.png",
  // },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <GoogleAnalytics gaId="G-1QRK2L46FN" />
      </body>
    </html>
  );
}