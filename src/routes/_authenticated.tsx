import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Home, BookOpen, TrendingUp, FileCheck, Calendar, PenLine, Heart, Settings, LogOut, Sparkles, Menu, Lightbulb } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuickQuestionsFAB } from "@/components/QuickQuestionsFAB";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AuthLayout,
});

const bottomTabs = [
  { to: "/", label: "Hoje", icon: Home },
  { to: "/materias", label: "Matérias", icon: BookOpen },
  { to: "/progresso", label: "Progresso", icon: TrendingUp },
  { to: "/simulados", label: "Simulados", icon: FileCheck },
];

const moreItems = [
  { to: "/grade", label: "Grade Semanal", icon: Calendar },
  { to: "/redacao", label: "Redação", icon: PenLine },
  { to: "/repertorios", label: "Meus Repertórios", icon: Lightbulb },
  { to: "/coragem", label: "Caixa de Coragem", icon: Heart },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

function AuthLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isActive = (to: string) => to === "/" ? path === "/" : path.startsWith(to);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const allItems = [...bottomTabs, ...moreItems];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-card/40 sticky top-0 h-screen">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg px-6 h-16 border-b">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          Foco Total
        </Link>
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          {allItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive(item.to) ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"
                )}
              >
                <Icon className="w-4 h-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-muted text-destructive"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile/tablet top bar */}
        <header className="lg:hidden sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
          <div className="flex items-center justify-between px-4 h-14 max-w-6xl mx-auto w-full">
            <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              Foco Total
            </Link>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon"><Menu className="w-5 h-5" /></Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader><SheetTitle>Menu</SheetTitle></SheetHeader>
                <nav className="mt-6 flex flex-col gap-1">
                  {allItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                          isActive(item.to) ? "bg-accent text-accent-foreground font-medium" : "hover:bg-muted"
                        )}
                      >
                        <Icon className="w-4 h-4" /> {item.label}
                      </Link>
                    );
                  })}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-muted text-destructive mt-4"
                  >
                    <LogOut className="w-4 h-4" /> Sair
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex-1 pb-24 lg:pb-8 max-w-6xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      <QuickQuestionsFAB />

      {/* Bottom tab bar — mobile only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-md safe-bottom">
        <div className="grid grid-cols-4 max-w-6xl mx-auto">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.to);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-xs transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-transform", active && "scale-110")} />
                <span className={cn(active && "font-semibold")}>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

