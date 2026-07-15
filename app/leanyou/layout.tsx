export default function LeanYouRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="fixed inset-0 z-[120] min-h-[100dvh] overflow-y-auto bg-black text-white">
      {children}
    </div>
  );
}
