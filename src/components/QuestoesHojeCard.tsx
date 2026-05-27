import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuestoesHoje } from "@/hooks/use-questoes-hoje";
import { CheckCircle2, Flame, BarChart3 } from "lucide-react";

export function QuestoesHojeCard() {
  const { data } = useQuestoesHoje();
  if (!data) return null;

  const { questoes_feitas: feitas, questoes_acertos: acertos, meta_dia: meta, pct_meta: pct } = data;
  const pctNum = Number(pct);
  const acertoPct = feitas > 0 ? Math.round((acertos / feitas) * 100) : 0;
  const falta = Math.max(0, meta - feitas);

  const cumprida = pctNum >= 100;
  const proxima = pctNum >= 70 && pctNum < 100;

  const barColor = cumprida
    ? "bg-emerald-500"
    : proxima
    ? "bg-orange-500"
    : pctNum >= 30
    ? "bg-primary"
    : "bg-muted-foreground/40";

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="w-4 h-4" />
            Questões de hoje
          </div>
          {cumprida ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : proxima ? (
            <Flame className="w-5 h-5 text-orange-500" />
          ) : null}
        </div>

        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full ${barColor} transition-all`}
            style={{ width: `${Math.min(100, pctNum)}%` }}
          />
        </div>

        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold tabular-nums">
            {feitas}
            <span className="text-base font-normal text-muted-foreground"> / {meta}</span>
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">{pctNum}%</div>
        </div>

        <p className="text-xs text-muted-foreground">
          {cumprida
            ? `Meta batida! Acertos: ${acertos}/${feitas} (${acertoPct}%)`
            : proxima
            ? `Quase lá! Só mais ${falta} questões.`
            : feitas > 0
            ? `Acertos: ${acertos}/${feitas} (${acertoPct}%) · Faltam ${falta} pra meta`
            : `Registre suas questões dentro de cada tópico.`}
        </p>
      </CardContent>
    </Card>
  );
}
