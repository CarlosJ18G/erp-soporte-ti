export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background-light p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_90%_at_10%_0%,rgba(236,91,19,0.08),transparent),radial-gradient(70%_70%_at_90%_100%,rgba(15,23,42,0.09),transparent)]" />
      {children}
    </main>
  );
}
