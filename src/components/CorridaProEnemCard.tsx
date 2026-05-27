import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, ChevronRight } from "lucide-react";
import { useEffect } from "react";

type Status = {
  fase_atual_numero: number;
  fase_atual_nome: string;
  fase_data_inicio: string;
  fase_data_fim: string;
  dias_restantes_fase: number;
  dias_restantes_prova: number;
  meta_total: number;
  feitos: number;
  faltam: number;
  topicos_dia_necessario: number;
  topicos_dia_ritmo_atual: number;
  dias_atraso: number;
  severidade: "no_ritmo" | "leve" | "moderado" | "alto" | "critico";
  mensagem: string;
};

const FASE_EMOJI: Record<number, string> = { 1: "🌱", 2: "🔁", 3: "🎯" };

const SEV_STYLES: Record<Status["severidade"], { bg: string; border: string; bar: string; icon: string; label: string }> = {
  no_ritmo: { bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-200 dark:border-green-800", bar: "bg-green-500", icon: "✅", label: "text-green-700 dark:text-green-300" },
  leve:     { bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-300 dark:border-yellow-700", bar: "bg-yellow-500", icon: "⚠️", label: "text-yellow-800 dark:text-yellow-200" },
  moderado: { bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-300 dark:border-orange-700", bar: "bg-orange-500", icon: "🟠", label: "text-orange-800 dark:text-orange-200" },
  alto:     { bg: "bg-orange-100 dark:bg-orange-950/40", border: "border-orange-400 dark:border-orange-600", bar: "bg-orange-600", icon: "🟠", label: "text-orange-900 dark:text-orange-100" },
  critico:  { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-400 dark:border-red-700", bar: "bg-red-500", icon: "🔴", label: "text-red-800 dark:text-red-200" },
};

export function CorridaProEnemCard() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile-prova", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("data_prova, modo_atraso").eq("id", user!.id).single();
      return data as any;
    },
    enabled: !!user,
  });

  const { data: status, refetch } = useQuery({
    queryKey: ["cronograma-status", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("calcular_status_cronograma", { p_user_id: user!.id });
      if (error) throw error;
      return (data as Status[])?.[0] ?? null;
    },
    enabled: !!user && !!profile?.data_prova,
  });

  // Ajuste automático silencioso (modo rigoroso)
  useEffect(() => {
    if (!user || !profile?.data_prova) return;
    supabase.rpc("ajustar_meta_diaria_automatica", { p_user_id: user.id }).then(() => refetch());
  }, [user?.id, profile?.data_prova]);

  if (!user) return null;

  if (!profile?.data_prova) {
    return (
      <Card className="p-4 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-start gap-3">
          <Target className="w-6 h-6 text-primary shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-base">Defina a data da prova</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Pra montar sua corrida pro ENEM, defina a data nas configurações.
            </p>
            <Button asChild size="sm" className="mt-3">
              <Link to="/configuracoes">Configurar agora</Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!status) return null;

  const sev = SEV_STYLES[status.severidade];
  const pct = status.meta_total > 0 ? Math.min(100, Math.round((status.feitos / status.meta_total) * 100)) : 0;
  const dias = status.dias_restantes_prova;

  const diasClass =
    dias <= 7 ? "font-bold text-red-600 animate-pulse"
    : dias <= 30 ? "font-bold text-orange-600"
    : "font-medium";

  // Estimativa: em quantos dias termina a fase no ritmo atual
  const ritmo = Number(status.topicos_dia_ritmo_atual);
  const diasParaTerminar = ritmo > 0 ? Math.ceil(status.faltam / ritmo) : null;

  return (
    <Card className={`p-4 border-2 ${sev.border} ${sev.bg}`}>
      <Link to="/cronograma" className="block space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <span className="font-bold text-base">ENEM 2026</span>
            <span className={`text-sm ${diasClass}`}>— Faltam {dias} dias</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>

        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{FASE_EMOJI[status.fase_atual_numero]} Fase {status.fase_atual_numero}: {status.fase_atual_nome}</span>
            <span className="tabular-nums text-muted-foreground">{pct}%</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div className={`h-full ${sev.bar} transition-all`} style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs text-muted-foreground mt-1 tabular-nums">
            {status.feitos} / {status.meta_total} tópicos
            {status.fase_atual_numero === 1 && " vistos"}
            {status.fase_atual_numero === 2 && " revisados"}
            {status.fase_atual_numero === 3 && " dominados"}
          </div>
        </div>

        <div className={`text-sm ${sev.label}`}>
          <span className="mr-1">{sev.icon}</span>
          {status.mensagem}
        </div>

        {status.severidade === "no_ritmo" && diasParaTerminar != null && (
          <p className="text-xs text-muted-foreground">
            No ritmo atual: termina em ~{diasParaTerminar} dias.
          </p>
        )}
        {status.severidade !== "no_ritmo" && status.severidade !== "critico" && (
          <p className="text-xs text-muted-foreground">
            Meta de hoje: {Math.max(2, Math.min(8, Math.ceil(Number(status.topicos_dia_necessario))))} tópicos.
          </p>
        )}
        {status.severidade === "critico" && (
          <p className="text-xs text-muted-foreground">
            Considere focar nos tópicos de Alta recorrência (60% do total).
          </p>
        )}
      </Link>
    </Card>
  );
}
