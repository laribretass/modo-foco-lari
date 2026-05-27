import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronRight, MoreVertical, CalendarPlus, CalendarDays, X } from "lucide-react";
import { differenceInCalendarDays, addDays } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Disciplina } from "@/lib/estudos";

type AgendaItem = {
  id: number;
  user_id: string;
  data_prevista: string;
  topico_id: number;
  disciplina_id: number;
  proxima_acao: string;
  status: string;
};

type Topico = { id: number; tema: string; subtema: string | null };

function diasAtraso(dataPrevista: string): number {
  return differenceInCalendarDays(new Date(), new Date(dataPrevista + "T00:00:00"));
}

function badgeAtraso(dias: number) {
  if (dias <= 1) return { label: `Atrasado ${dias}d`, cls: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30" };
  if (dias <= 3) return { label: `Atrasado ${dias}d`, cls: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30" };
  if (dias <= 7) return { label: `Atrasado ${dias}d`, cls: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" };
  return { label: `Atrasado ${dias}d`, cls: "bg-red-600 text-white border-red-700" };
}

export function AtrasadosCard({ disciplinas }: { disciplinas: Disciplina[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [expandido, setExpandido] = useState(false);
  const hoje = new Date().toISOString().slice(0, 10);

  const { data: atrasados } = useQuery({
    queryKey: ["agenda-atrasados", user?.id, hoje],
    queryFn: async () => {
      const { data } = await supabase
        .from("agenda_diaria")
        .select("*")
        .eq("status", "pendente")
        .lt("data_prevista", hoje)
        .order("data_prevista", { ascending: true });
      return (data ?? []) as AgendaItem[];
    },
    enabled: !!user,
  });

  const topicoIds = Array.from(new Set((atrasados ?? []).map((a) => a.topico_id)));
  const { data: topicos } = useQuery({
    queryKey: ["agenda-topicos", topicoIds],
    queryFn: async () => {
      if (topicoIds.length === 0) return [];
      const { data } = await supabase.from("topicos").select("id, tema, subtema").in("id", topicoIds);
      return (data ?? []) as Topico[];
    },
    enabled: topicoIds.length > 0,
  });

  const replanejar = useMutation({
    mutationFn: async ({ acao, item }: { acao: "hoje" | "7dias" | "dispensar"; item: AgendaItem }) => {
      if (acao === "dispensar") {
        const { error } = await supabase.from("agenda_diaria")
          .update({ status: "dispensado" }).eq("id", item.id);
        if (error) throw error;
        return;
      }
      if (acao === "hoje") {
        const { error } = await supabase.from("agenda_diaria")
          .update({ data_prevista: hoje }).eq("id", item.id);
        if (error) throw error;
        return;
      }
      // 7dias: distribui em data aleatória entre amanhã e +7
      const offset = Math.floor(Math.random() * 7) + 1;
      const novaData = addDays(new Date(), offset).toISOString().slice(0, 10);
      const { error } = await supabase.from("agenda_diaria")
        .update({ data_prevista: novaData }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Replanejado");
      qc.invalidateQueries({ queryKey: ["agenda-atrasados"] });
      qc.invalidateQueries({ queryKey: ["hoje"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  if (!atrasados || atrasados.length === 0) return null;

  const discMap = new Map(disciplinas.map((d) => [d.id, d]));
  const topMap = new Map((topicos ?? []).map((t) => [t.id, t]));
  const visiveis = expandido ? atrasados : atrasados.slice(0, 5);

  return (
    <Card className="border-orange-500/30 bg-orange-500/5">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <h3 className="font-semibold text-sm">
            Em atraso <span className="text-muted-foreground font-normal">· {atrasados.length}</span>
          </h3>
        </div>
        <p className="text-[11px] text-muted-foreground -mt-1">
          Primeiro foque no plano de hoje. Estes não contam pra meta.
        </p>
        <div className="space-y-1.5">
          {visiveis.map((item) => {
            const d = discMap.get(item.disciplina_id);
            const t = topMap.get(item.topico_id);
            const dias = diasAtraso(item.data_prevista);
            const b = badgeAtraso(dias);
            return (
              <div key={item.id} className="flex items-center gap-2 rounded-md bg-background/60 p-2">
                <div className="w-1 self-stretch rounded" style={{ backgroundColor: d?.cor ?? "#888" }} />
                <Link
                  to="/materias/$id"
                  params={{ id: String(item.disciplina_id) }}
                  className="flex-1 min-w-0"
                >
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: d?.cor }}>
                      {d?.nome}
                    </span>
                    <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${b.cls}`}>{b.label}</Badge>
                  </div>
                  <div className="text-sm font-medium truncate">{t?.tema ?? "Tópico"}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    Próximo: <span className="font-semibold">{item.proxima_acao}</span>
                  </div>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => replanejar.mutate({ acao: "hoje", item })}>
                      <CalendarPlus className="w-4 h-4 mr-2" /> Mover pra hoje
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => replanejar.mutate({ acao: "7dias", item })}>
                      <CalendarDays className="w-4 h-4 mr-2" /> Distribuir em 7 dias
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => replanejar.mutate({ acao: "dispensar", item })}
                      className="text-destructive focus:text-destructive"
                    >
                      <X className="w-4 h-4 mr-2" /> Dispensar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            );
          })}
        </div>
        {atrasados.length > 5 && (
          <Button
            variant="ghost" size="sm" className="w-full h-7 text-xs"
            onClick={() => setExpandido((v) => !v)}
          >
            {expandido ? "Mostrar menos" : `Ver todos (${atrasados.length})`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
