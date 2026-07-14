import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "שלום נוי — בואי נחשב יחד 💙",
  description:
    "מחשבון מימון רכב אישי: החזר חודשי, בלון, ריבית, אחוז מימון, מקדמה ולוח סילוקין — בזמן אמת מול הלקוח.",
  openGraph: {
    title: "שלום נוי — בואי נחשב יחד 💙",
    description: "מחשבון מימון רכב אישי, מהיר ומדויק.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b2a5e",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body>{children}</body>
    </html>
  );
}
