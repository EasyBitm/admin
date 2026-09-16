import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "easyBITM Admin",
  description: "Private content administration for easyBITM.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
