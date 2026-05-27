import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { useMemo, useState, useEffect } from "react";
import { CheckCircle2, ChevronRight, RotateCcw, CalendarDays } from "lucide-react";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { Disciplina } from "@/lib/estudos";

type Revisao = {
  id: number;
  user_id: string;
  topico_id: number;
  disciplina_id: number;
  numero_revisao: number;
  data_prevista: string;
  status: "futura" | "pendente" | "atrasada" | "concluida";
  concluido_em: string | null;
};

type TopicoLite = { id: number; tema: string; subtema: string | null; modulo: string | null };

export const Route = createFileRoute("/_authenticated/revisoes")({ component: RevisoesPage });

function RevisoesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const hoje = new Date().toISOString().slice(0, 10);

  // Atualiza status de futura→pendente / →atrasada no carregamento
  useEffect(() => {
    if (!user) return;
    supabase.rpc("atualizar_status_revisoes", { p_user_id: user.id }).then(() => {
      qc.invalidateQueries({ queryKey: ["revisoes"] });
    });
  }, [user?.id]);

  const { data: disciplinas } = useQuery({
    queryKey: ["disciplinas"],
    queryFn: async () => {
      const { data } = await supabase.from("disciplinas").select("*").order("id");
      return (data ?? []) as Disciplina[];
    },
  });

  const { data: revisoes } = useQuery({
    queryKey: ["revisoes", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("revisoes_agendadas").select("*")
        .order("data_prevista", { ascending: true });
      return (data ?? []) as Revisao[];
    },
    enabled: !!user,
  });

  const topicoIds = useMemo(
    () => Array.from(new Set((revisoes ?? []).map((r) => r.topico_id))),
    [revisoes],
  );
  const { data: topicos } = useQuery({
    queryKey: ["revisoes-topicos", topicoIds],
    queryFn: async () => {
      if (topicoIds.length === 0) return [];
      const { data } = await supabase.from("topicos")
        .select("id, tema, subtema, modulo").in("id", topicoIds);
      return (data ?? []) as TopicoLite[];
    },
    enabled: topicoIds.length > 0,
  });

  const discMap = new Map((disciplinas ?? []).map((d) => [d.id, d]));
  const topMap = new Map((topicos ?? []).map((t) => [t.id, t]));

  const concluir = useMutation({
    mutationFn: async (rev: Revisao) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from("revisoes_agendadas")
        .update({ status: "concluida", concluido_em: now })
        .eq("id", rev.id);
      if (error) throw error;
      await supabase.from("sessoes_estudo").upsert({
        user_id: user!.id, topico_id: rev.topico_id,
        tipo_atividade: `Revisão ${rev.numero_revisao}`,
        data: hoje, concluido: true, concluido_em: now,
      }, { onConflict: "user_id,topico_id,data,tipo_atividade" });
    },
    onSuccess: () => {
      toast.success("Revisão concluída ✨");
      qc.invalidateQueries({ queryKey: ["revisoes"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const reabrir = useMutation({
    mutationFn: async (rev: Revisao) => {
      const status = rev.data_prevista < hoje ? "atrasada"
                   : rev.data_prevista === hoje ? "pendente" : "futura";
      const { error } = await supabase.from("revisoes_agendadas")
        .update({ status, concluido_em: null }).eq("id", rev.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["revisoes"] }),
  });

  const pendentes = (revisoes ?? []).filter((r) => r.status === "pendente");
  const atrasadas = (revisoes ?? []).filter((r) => r.status === "atrasada");
  const futuras = (revisoes ?? []).filter((r) => r.status === "futura");

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-3xl font-display font-bold">Revisões</h1>
        <p className="text-sm text-muted-foreground">
          Curva de esquecimento automática · 1d · 7d · 15d · 30d · 60d
        </p>
      </div>

      <Tabs defaultValue="hoje" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="hoje">Hoje <CountBadge n={pendentes.length} /></TabsTrigger>
          <TabsTrigger value="atrasadas">Atrasadas <CountBadge n={atrasadas.length} variant="danger" /></TabsTrigger>
          <TabsTrigger value="proximas">Próximas <CountBadge n={futuras.length} /></TabsTrigger>
          <TabsTrigger value="calendario"><CalendarDays className="w-4 h-4" /></TabsTrigger>
        </TabsList>

        <TabsContent value="hoje" className="space-y-2 mt-4">
          {pendentes.length === 0 ? (
            <EmptyState text="Nada agendado para hoje. Continue estudando 💪" />
          ) : pendentes.map((r) => (
            <RevisaoCard key={r.id} rev={r}
              disciplina={discMap.get(r.disciplina_id)} topico={topMap.get(r.topico_id)}
              onConcluir={() => concluir.mutate(r)} />
          ))}
        </TabsContent>

        <TabsContent value="atrasadas" className="space-y-2 mt-4">
          {atrasadas.length === 0 ? (
            <EmptyState text="Sem revisões atrasadas. Mandou bem!" />
          ) : atrasadas.map((r) => (
            <RevisaoCard key={r.id} rev={r}
              disciplina={discMap.get(r.disciplina_id)} topico={topMap.get(r.topico_id)}
              onConcluir={() => concluir.mutate(r)} />
          ))}
        </TabsContent>

        <TabsContent value="proximas" className="space-y-2 mt-4">
          {futuras.length === 0 ? (
            <EmptyState text="Conclua um conteúdo (teoria + exercícios) e ele entra aqui." />
          ) : futuras.map((r) => (
            <RevisaoCard key={r.id} rev={r}
              disciplina={discMap.get(r.disciplina_id)} topico={topMap.get(r.topico_id)} />
          ))}
        </TabsContent>

        <TabsContent value="calendario" className="mt-4">
          <CalendarioRevisoes
            revisoes={revisoes ?? []}
            discMap={discMap}
            topMap={topMap}
            onConcluir={(r) => concluir.mutate(r)}
            onReabrir={(r) => reabrir.mutate(r)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CountBadge({ n, variant }: { n: number; variant?: "danger" }) {
  if (n === 0) return null;
  return (
    <span className={`ml-1.5 text-[10px] font-bold px-1.5 rounded-full ${
      variant === "danger" ? "bg-destructive text-destructive-foreground" : "bg-primary/15 text-primary"
    }`}>{n}</span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
      {text}
    </CardContent></Card>
  );
}

function RevisaoCard({
  rev, disciplina, topico, onConcluir,
}: {
  rev: Revisao;
  disciplina: Disciplina | undefined;
  topico: TopicoLite | undefined;
  onConcluir?: () => void;
}) {
  const data = parseISO(rev.data_prevista);
  const diff = differenceInCalendarDays(data, new Date());
  const concluida = rev.status === "concluida";
  const atrasada = rev.status === "atrasada";

  const statusLabel = concluida ? "Concluída"
    : atrasada ? `Atrasada ${Math.abs(diff)}d`
    : rev.status === "pendente" ? "Hoje"
    : `Em ${diff}d`;

  const statusCls = concluida ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
    : atrasada ? "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30"
    : rev.status === "pendente" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
    : "bg-muted text-muted-foreground border-border";

  return (
    <Card className={`overflow-hidden ${concluida ? "opacity-60" : ""}`}>
      <div className="h-1" style={{ backgroundColor: disciplina?.cor ?? "#888" }} />
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <Badge variant="secondary"
                style={{ backgroundColor: `${disciplina?.cor}22`, color: disciplina?.cor }}
                className="text-[10px] h-4 px-1.5">
                {disciplina?.nome}
              </Badge>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                Revisão {rev.numero_revisao}
              </Badge>
              <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${statusCls}`}>
                {statusLabel}
              </Badge>
            </div>
            {topico?.modulo && (
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {topico.modulo}
              </div>
            )}
            <div className={`font-semibold text-sm leading-tight ${concluida ? "line-through" : ""}`}>
              {topico?.tema ?? "Conteúdo"}
            </div>
            {topico?.subtema && (
              <div className="text-[11px] text-muted-foreground truncate">{topico.subtema}</div>
            )}
            <div className="text-[11px] text-muted-foreground mt-1">
              {format(data, "dd 'de' MMM, yyyy", { locale: ptBR })}
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {!concluida && onConcluir && (
              <Button size="sm" variant="outline" className="h-7" onClick={onConcluir}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Feita
              </Button>
            )}
            <Link to="/materias/$id" params={{ id: String(rev.disciplina_id) }}>
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarioRevisoes({
  revisoes, discMap, topMap, onConcluir, onReabrir,
}: {
  revisoes: Revisao[];
  discMap: Map<number, Disciplina>;
  topMap: Map<number, TopicoLite>;
  onConcluir: (r: Revisao) => void;
  onReabrir: (r: Revisao) => void;
}) {
  const [selecionado, setSelecionado] = useState<Date | undefined>(new Date());

  const porData = useMemo(() => {
    const m = new Map<string, Revisao[]>();
    revisoes.forEach((r) => {
      const arr = m.get(r.data_prevista) ?? [];
      arr.push(r); m.set(r.data_prevista, arr);
    });
    return m;
  }, [revisoes]);

  const hoje = new Date(); hoje.setHours(0,0,0,0);

  const datasAtrasadas: Date[] = [];
  const datasHoje: Date[] = [];
  const datasFuturas: Date[] = [];
  const datasConcluidas: Date[] = [];
  porData.forEach((items, dataStr) => {
    const d = parseISO(dataStr);
    const todasConcluidas = items.every((i) => i.status === "concluida");
    if (todasConcluidas) { datasConcluidas.push(d); return; }
    if (d.getTime() === hoje.getTime()) datasHoje.push(d);
    else if (d < hoje) datasAtrasadas.push(d);
    else datasFuturas.push(d);
  });

  const dataKey = selecionado ? selecionado.toISOString().slice(0,10) : "";
  const revsDoDia = porData.get(dataKey) ?? [];

  return (
    <div className="grid md:grid-cols-[auto_1fr] gap-4">
      <Card>
        <CardContent className="p-2 flex justify-center">
          <Calendar
            mode="single"
            selected={selecionado}
            onSelect={setSelecionado}
            locale={ptBR}
            modifiers={{
              atrasada: datasAtrasadas,
              hoje: datasHoje,
              futura: datasFuturas,
              concluida: datasConcluidas,
            }}
            modifiersClassNames={{
              atrasada: "bg-red-500/20 text-red-700 dark:text-red-400 font-bold rounded-md",
              hoje: "bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold rounded-md",
              futura: "bg-primary/15 text-primary font-semibold rounded-md",
              concluida: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-md",
            }}
            className="pointer-events-auto"
          />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap px-1">
          <Legenda cor="bg-blue-500/40" label="Hoje" />
          <Legenda cor="bg-red-500/40" label="Atrasada" />
          <Legenda cor="bg-primary/40" label="Futura" />
          <Legenda cor="bg-emerald-500/40" label="Concluída" />
        </div>
        <div className="text-sm font-semibold">
          {selecionado ? format(selecionado, "dd 'de' MMMM, yyyy", { locale: ptBR }) : "Selecione uma data"}
        </div>
        {revsDoDia.length === 0 ? (
          <EmptyState text="Nenhuma revisão nesta data." />
        ) : (
          <div className="space-y-2">
            {revsDoDia.map((r) => (
              <RevisaoCard key={r.id} rev={r}
                disciplina={discMap.get(r.disciplina_id)} topico={topMap.get(r.topico_id)}
                onConcluir={r.status === "concluida" ? undefined : () => onConcluir(r)} />
            ))}
            {revsDoDia.some((r) => r.status === "concluida") && (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 px-1">
                <RotateCcw className="w-3 h-3" />
                Pode reabrir uma revisão concluída clicando em outro dia se precisar.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Legenda({ cor, label }: { cor: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-2.5 h-2.5 rounded-sm ${cor}`} />
      <span>{label}</span>
    </div>
  );
}
