import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ICONES_CATEGORIA } from "@/components/RepertorioCard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/repertorios")({
  component: RepertoriosPage,
});

type Item = {
  id: number;
  categoria: string;
  nome: string;
  subtitulo: string | null;
  descricao: string;
  dica_uso: string | null;
  visto_em: string;
  salvo?: boolean;
  ja_conhece?: boolean;
};

function RepertoriosPage() {
  const { user } = useAuth();
  const [aberto, setAberto] = useState<Item | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["meus-repertorios", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repertorios_diarios")
        .select("visto_em, salvo, ja_conhece, repertorios_catalogo(*)")
        .eq("user_id", user!.id)
        .order("visto_em", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r.repertorios_catalogo,
        visto_em: r.visto_em,
        salvo: r.salvo,
        ja_conhece: r.ja_conhece,
      })) as Item[];
    },
    enabled: !!user,
  });

  const salvos = data?.filter((i) => i.salvo) ?? [];
  const conhecidos = data?.filter((i) => i.ja_conhece) ?? [];

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold">Meus Repertórios</h1>
        <p className="text-sm text-muted-foreground">
          Suas referências para a redação do ENEM
        </p>
      </div>

      <Tabs defaultValue="salvos">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="salvos">Salvos ({salvos.length})</TabsTrigger>
          <TabsTrigger value="historico">Histórico ({data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="conhecidos">Já conheço ({conhecidos.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="salvos" className="mt-4">
          <Lista items={salvos} loading={isLoading} onOpen={setAberto} />
        </TabsContent>
        <TabsContent value="historico" className="mt-4">
          <Lista items={data ?? []} loading={isLoading} onOpen={setAberto} />
        </TabsContent>
        <TabsContent value="conhecidos" className="mt-4">
          <Lista items={conhecidos} loading={isLoading} onOpen={setAberto} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!aberto} onOpenChange={(o) => !o && setAberto(null)}>
        <DialogContent className="max-w-lg">
          {aberto && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">{ICONES_CATEGORIA[aberto.categoria] ?? "✨"}</span>
                  {aberto.nome}
                </DialogTitle>
                {aberto.subtitulo && (
                  <p className="text-sm text-muted-foreground">{aberto.subtitulo}</p>
                )}
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm leading-relaxed">{aberto.descricao}</p>
                {aberto.dica_uso && (
                  <div className="border-l-4 border-amber-500 bg-amber-50 rounded-r-md px-3 py-2">
                    <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide mb-0.5">
                      💡 Use em
                    </div>
                    <div className="text-sm text-amber-950">{aberto.dica_uso}</div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Visto em {format(new Date(aberto.visto_em), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Lista({
  items, loading, onOpen,
}: { items: Item[]; loading: boolean; onOpen: (i: Item) => void }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Você ainda não tem repertórios aqui. Volte amanhã pra mais ideias!
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <button
          key={`${i.id}-${i.visto_em}`}
          onClick={() => onOpen(i)}
          className="w-full text-left"
        >
          <Card className="hover:bg-muted/50 transition-colors">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="text-2xl shrink-0">{ICONES_CATEGORIA[i.categoria] ?? "✨"}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold leading-tight truncate">{i.nome}</div>
                {i.subtitulo && (
                  <div className="text-xs text-muted-foreground truncate">{i.subtitulo}</div>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground shrink-0">
                {format(new Date(i.visto_em), "dd/MM", { locale: ptBR })}
              </div>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}
