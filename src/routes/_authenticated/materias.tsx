import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { progressoTopico, type Topico, type Disciplina } from "@/lib/estudos";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/materias")({ component: MateriasPage });

function MateriasPage() {
  const { user } = useAuth();
  const { data: disciplinas } = useQuery({
    queryKey: ["disciplinas"],
    queryFn: async () => {
      const { data } = await supabase.from("disciplinas").select("*").order("id");
      return (data ?? []) as Disciplina[];
    },
  });
  const { data: topicos } = useQuery({
    queryKey: ["topicos", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("topicos").select("*");
      return (data ?? []) as Topico[];
    },
    enabled: !!user,
  });

  const stats = (id: number) => {
    const ts = topicos?.filter((t) => t.disciplina_id === id) ?? [];
    const total = ts.length;
    const prog = total === 0 ? 0 : Math.round(ts.reduce((s, t) => s + progressoTopico(t), 0) / total);
    return { total, prog };
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-3xl font-display font-bold">Matérias</h1>
      <p className="text-sm text-muted-foreground">Toque em uma disciplina para ver seus tópicos.</p>
      <div className="grid grid-cols-2 gap-3">
        {disciplinas?.map((d, i) => {
          const s = stats(d.id);
          return (
            <motion.div key={d.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
              <Link to="/materias/$id" params={{ id: String(d.id) }}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow active:scale-95 transition-transform">
                  <div className="h-2" style={{ backgroundColor: d.cor }} />
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">{d.area}</div>
                    <h3 className="font-display font-semibold mt-0.5">{d.nome}</h3>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <div className="text-2xl font-bold" style={{ color: d.cor }}>{s.prog}%</div>
                        <div className="text-xs text-muted-foreground">{s.total} tópicos</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
