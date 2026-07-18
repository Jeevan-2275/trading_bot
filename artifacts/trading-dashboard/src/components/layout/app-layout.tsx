import { TopNav } from "./top-nav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <TopNav />
      <main className="pt-12 min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
