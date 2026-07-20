import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { getDefaultMetadata } from "@/lib/metadata";
import "@/styles/globals.css";

export { getDefaultMetadata as metadata };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-screen bg-black font-sans text-white antialiased">
        {children}
      </body>
    </html>
  );
}
