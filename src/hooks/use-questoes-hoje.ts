import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type QuestoesHoje = {
  questoes_feitas: number;
  questoes_acertos: number;
  meta_dia: number;
  pct_meta: number;
  sessoes_realizadas: number;
};

export function useQuestoesHoje() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["questoes-hoje", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<QuestoesHoje | null> => {
      const { data, error } = await supabase.rpc("questoes_de_hoje" as any, {
        p_user_id: user!.id,
      });
      if (error) throw error;
      const row = (data as any[])?.[0];
      if (!row) return null;
      return {
        questoes_feitas: Number(row.questoes_feitas ?? 0),
        questoes_acertos: Number(row.questoes_acertos ?? 0),
        meta_dia: Number(row.meta_dia ?? 0),
        pct_meta: Number(row.pct_meta ?? 0),
        sessoes_realizadas: Number(row.sessoes_realizadas ?? 0),
      };
    },
  });
}
