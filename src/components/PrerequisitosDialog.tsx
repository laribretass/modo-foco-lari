import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

type PrereqRow = {
  prerequisito_id: number;
  prerequisito_tema: string;
  prerequisito_subtema: string | null;
  pct_acertos: number;
  pct_consolidacao: number;
  dominado: boolean;
  proxima_acao: string;
};

export function PrerequisitosDialog({
  open, onOpenChange, topicoId, topicoTema, disciplinaId, onPular,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  topicoId: number;
  topicoTema: string;
  disciplinaId: number;
  onPular?: () => void;
}) {
  const { user } = useAuth();

  const { data: prereqs, isLoading } = useQuery({
    queryKey: ["prereqs", topicoId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listar_prerequisitos_com_progresso", {
        p_topico_id: topicoId,
        p_user_id: user!.id,
      });
      if (error) throw error;
      return (data ?? []) as PrereqRow[];
    },
    enabled: open && !!user,
  });

  const pendentes = (prereqs ?? []).filter((p) => !p.dominado);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-2 border-amber-400 bg-amber-50/40 dark:bg-amber-950/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Recomendamos estudar antes
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm">
            Antes de estudar <span className="font-semibold">{topicoTema}</span>, vale revisar:
          </div>

          {isLoading && <div className="h-20 rounded-md bg-muted animate-pulse" />}

          {!isLoading && pendentes.length === 0 && (
            <div className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Todos os pré-requisitos já estão dominados!
            </div>
          )}

          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {pendentes.map((p) => (
              <div key={p.prerequisito_id} className="rounded-lg border bg-background p-3 space-y-2">
                <div className="font-semibold text-sm">📌 {p.prerequisito_tema}</div>
                {p.prerequisito_subtema && (
                  <div className="text-[11px] text-muted-foreground -mt-1">{p.prerequisito_subtema}</div>
                )}
                <ProgRow label="Acertos" pct={p.pct_acertos} />
                <ProgRow label="Consolidação" pct={p.pct_consolidacao} consol />
                <div className="text-[11px] text-muted-foreground">
                  → Próximo: <span className="font-semibold text-foreground">{p.proxima_acao}</span>
                </div>
                <Link
                  to="/materias/$id"
                  params={{ id: String(disciplinaId) }}
                  onClick={() => onOpenChange(false)}
                >
                  <Button size="sm" variant="outline" className="w-full mt-1">
                    Estudar agora <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="text-xs text-muted-foreground text-center">
              Já estudei esse conteúdo na escola:
            </div>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => { onPular?.(); onOpenChange(false); }}>
              Pular recomendação
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProgRow({ label, pct, consol }: { label: string; pct: number; consol?: boolean }) {
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
