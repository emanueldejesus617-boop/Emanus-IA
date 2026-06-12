"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  classe?: string;
  curso?: string;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (!token || !storedUser) {
      router.push("/");
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  if (!user) return null;

  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Tutor IA", href: "/dashboard/tutor" },
    { name: "Simulador de Exames", href: "/dashboard/exams" },
    { name: "Aulas", href: "/dashboard/lessons" },
    { name: "Horário", href: "/dashboard/schedule" },
  ];

  // If the user has an admin role, add the admin panel link to the sidebar
  if (user.role === "admin") {
    navItems.push({ name: "Painel Admin", href: "/dashboard/admin" });
  }

  return (
    <div className="flex h-screen bg-dark flex-col md:flex-row overflow-hidden">
      {/* Mobile Header Bar */}
      <header className="flex md:hidden items-center justify-between px-6 py-4 bg-surface border-b border-muted/10 h-16 w-full flex-shrink-0">
        <h1 className="text-xl font-bold text-primary">TUTOR IA</h1>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-dark/40 text-text hover:text-primary transition-colors cursor-pointer border border-muted/15"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
        />
      )}

      {/* Sidebar - responsive absolute drawer on mobile, static on desktop */}
      <aside className={`
        fixed md:static inset-y-0 left-0 w-64 border-r border-surface bg-surface flex flex-col z-50 transition-transform duration-300 md:translate-x-0
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">TUTOR IA</h1>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg bg-dark/40 text-muted hover:text-text border border-muted/10 cursor-pointer"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 space-y-1 px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={"flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors " + (isActive ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface hover:text-text")}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-text truncate max-w-[150px]">{user.name}</p>
              <p className="text-xs text-muted capitalize">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={() => {
              localStorage.clear();
              router.push("/");
            }}
            className="mt-4 w-full text-left text-sm text-danger hover:underline cursor-pointer"
          >
            Terminar Sessão
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-dark">
        {children}
      </main>
    </div>
  );
}
