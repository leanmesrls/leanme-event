export default function LeanEventRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-[100dvh] bg-black text-white">{children}</div>
  );
}
