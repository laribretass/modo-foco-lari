import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const MARCOS: Array<{ dias: number; mensagem: string; tom: "info"|"warning"|"critical" }> = [
  { dias: 100, mensagem: "Faltam 100 dias! Hora de começar simulados completos semanais.", tom: "info" },
  { dias: 50, mensagem: "50 dias. Foco em revisão e pontos críticos. Reduza matéria nova.", tom: "info" },
  { dias: 30, mensagem: "30 dias. Reta final. Sem conteúdo novo. Só revisar e fazer simulados.", tom: "warning" },
  { dias: 14, mensagem: "Duas semanas. Diminua intensidade pra chegar descansado.", tom: "warning" },
  { dias: 7, mensagem: "Última semana. Revisão leve. Durma bem. Cuide da cabeça.", tom: "critical" },
  { dias: 3, mensagem: "3 dias. Confia no que estudou. Foca no descanso e na alimentação.", tom: "critical" },
  { dias: 1, mensagem: "Amanhã é o dia. Você se preparou. Vai dar tudo certo.", tom: "critical" },
];

const TOM_CLASS = {
  info: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:text-blue-100",
  warning: "bg-orange-50 border-orange-300 text-orange-900 dark:bg-orange-950/30 dark:text-orange-100",
  critical: "bg-red-50 border-red-300 text-red-900 dark:bg-red-950/30 dark:text-red-100",
};

export function AlertasEstrategicos() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<number[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("alertas_dismissed");
    if (raw) try { setDismissed(JSON.parse(raw)); } catch {}
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["profile-prova", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("data_prova").eq("id", user!.id).single();
      return data as any;
    },
    enabled: !!user,
  });

  if (!profile?.data_prova) return null;
  const dias = Math.max(0, Math.ceil((new Date(profile.data_prova).getTime() - new Date().setHours(0,0,0,0)) / 86400000));

  // pega o marco mais próximo dentro de tolerância
  const marco = MARCOS.find(m => Math.abs(m.dias - dias) <= 1);
  if (!marco || dismissed.includes(marco.dias)) return null;

  const dismiss = () => {
    const novo = [...dismissed, marco.dias];
    setDismissed(novo);
    localStorage.setItem("alertas_dismissed", JSON.stringify(novo));
  };

  return (
    <div className={`border-2 rounded-lg p-3 flex items-start gap-2 ${TOM_CLASS[marco.tom]}`}>
      <div className="flex-1 text-sm font-medium">{marco.mensagem}</div>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={dismiss}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
