import type { Metadata, Viewport } from "next";
import { Cinzel_Decorative, IM_Fell_English } from "next/font/google";
import { RegisterSW } from "@/components/pwa/RegisterSW";
import "./globals.css";

/* next/font downloads and self-hosts these at BUILD time. The running app never
   contacts a font CDN, which is what lets the offline PWA render correctly. */
const cinzel = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-cinzel",
  display: "swap",
});

const fell = IM_Fell_English({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-fell",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DungeonDelver",
    template: "%s · DungeonDelver",
  },
  description:
    "An AI-narrated Dungeons & Dragons campaign that writes itself as you play.",
  applicationName: "DungeonDelver",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "DungeonDelver",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0806",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cinzel.variable} ${fell.variable}`}>
      <body className="antialiased">
        <div className="above-atmosphere">{children}</div>
        <RegisterSW />
      </body>
    </html>
  );
}
