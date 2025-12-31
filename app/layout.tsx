import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Memo Generator",
    template: "%s | Memo Generator",
  },
  description: "Generate a memo Word document from a template.",
  applicationName: "Memo Generator",
  appleWebApp: {
    title: "Memo Generator",
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
      <body>{children}</body>
    </html>
  );
}

