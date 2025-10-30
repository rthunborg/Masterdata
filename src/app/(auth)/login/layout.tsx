export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/stena-bg.jpg')" }}
    >
      {/* Dark overlay for text contrast */}
      <div className="absolute inset-0 bg-black/50 -z-10" />
      
      <main className="relative w-full max-w-md px-6 py-12">
        {children}
      </main>
    </div>
  );
}
