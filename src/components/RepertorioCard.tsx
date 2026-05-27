import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Bookmark, Check, RotateCw } from "lucide-react";

export const ICONES_CATEGORIA: Record<string, string> = {
  filosofo: "🧠",
  dado: "📊",
  filme: "🎬",
  obra: "📖",
  lei: "⚖️",
};

const LABELS_CATEGORIA: Record<string, string> = {
  filosofo: "Filósofo",
  dado: "Dado",
  filme: "Filme",
  obra: "Obra",
  lei: "Lei",
};

type Catalogo = {
  id: number;
  categoria: string;
  nome: string;
  subtitulo: string | null;
  descricao: string;
  dica_uso: string | null;
  temas_relacionados: string[] | null;
};

type Diario = {
  id: number;
  repertorio_id: number;
  salvo: boolean;
  ja_conhece: boolean;
};

const hojeStr = () => new Date().toISOString().slice(0, 10);

export function RepertorioCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const data = hojeStr();

  const repQuery = useQuery({
    queryKey: ["repertorio-hoje", user?.id, data],
    queryFn: async () => {
      const { data: id, error } = await supabase.rpc("sortear_repertorio_dia", {
        p_user_id: user!.id,
      });
      if (error) throw error;
      if (!id) return null;

      const [{ data: cat }, { data: diario }, { data: profile }] = await Promise.all([
        supabase.from("repertorios_catalogo").select("*").eq("id", id).single(),
        supabase
          .from("repertorios_diarios")
          .select("*")
          .eq("user_id", user!.id)
          .eq("data", data)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("repertorios_trocas_count, repertorios_trocas_data")
          .eq("id", user!.id)
          .single(),
      ]);

      const trocasHoje =
        profile?.repertorios_trocas_data === data
          ? profile?.repertorios_trocas_count ?? 0
          : 0;

      return {
        catalogo: cat as Catalogo,
        diario: diario as Diario | null,
        trocasHoje,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("repertorios_diarios")
        .update({ salvo: true })
        .eq("user_id", user!.id)
        .eq("data", data);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Salvo em Meus Repertórios");
      qc.invalidateQueries({ queryKey: ["repertorio-hoje"] });
      qc.invalidateQueries({ queryKey: ["meus-repertorios"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const jaConheco = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("repertorios_diarios")
        .update({ ja_conhece: true })
        .eq("user_id", user!.id)
        .eq("data", data);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anotado. Não vamos mostrar de novo.");
      qc.invalidateQueries({ queryKey: ["repertorio-hoje"] });
      qc.invalidateQueries({ queryKey: ["meus-repertorios"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const trocar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("trocar_repertorio_dia", {
        p_user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["repertorio-hoje"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Não foi possível trocar"),
  });

  if (repQuery.isLoading) {
    return (
      <Card className="border-2 border-amber-300/60 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (repQuery.isError || !repQuery.data?.catalogo) {
    return (
      <Card className="border-amber-300/60 bg-amber-50/50">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Não conseguimos carregar seu repertório agora. Tente recarregar a página.
        </CardContent>
      </Card>
    );
  }

  const { catalogo, diario, trocasHoje } = repQuery.data;
  const trocasRestantes = Math.max(0, 3 - trocasHoje);
  const icone = ICONES_CATEGORIA[catalogo.categoria] ?? "✨";
  const podeTrocar = trocasRestantes > 0 && !trocar.isPending;

  return (
    <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-amber-600" />
          <h3 className="font-display font-semibold text-amber-900">
            Repertório do dia
          </h3>
          <span className="ml-auto text-[10px] uppercase tracking-wide font-semibold text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-full">
            {LABELS_CATEGORIA[catalogo.categoria] ?? catalogo.categoria}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={catalogo.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="text-[32px] leading-none shrink-0">{icone}</div>
              <div className="min-w-0">
                <div className="font-bold text-lg sm:text-xl text-amber-950 leading-tight">
                  {catalogo.nome}
                </div>
                {catalogo.subtitulo && (
                  <div className="text-xs text-amber-800/70 mt-0.5">
                    {catalogo.subtitulo}
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm text-amber-950/90 leading-relaxed">
              {catalogo.descricao}
            </p>

            {catalogo.dica_uso && (
              <div className="border-l-4 border-amber-500 bg-amber-100/50 rounded-r-md px-3 py-2">
                <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide mb-0.5">
                  💡 Use em
                </div>
                <div className="text-sm text-amber-950">{catalogo.dica_uso}</div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400 bg-white/60 hover:bg-amber-100 text-amber-900"
            disabled={!!diario?.salvo || salvar.isPending}
            onClick={() => salvar.mutate()}
          >
            {diario?.salvo ? (
              <><Check className="w-3.5 h-3.5 mr-1" /> Salvo</>
            ) : (
              <><Bookmark className="w-3.5 h-3.5 mr-1" /> Salvar</>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="border-amber-400 bg-white/60 hover:bg-amber-100 text-amber-900"
            disabled={!!diario?.ja_conhece || jaConheco.isPending}
            onClick={() => jaConheco.mutate()}
          >
            {diario?.ja_conhece ? (
              <><Check className="w-3.5 h-3.5 mr-1" /> Marcado</>
            ) : (
              <><Check className="w-3.5 h-3.5 mr-1" /> Já conheço</>
            )}
          </Button>

          {podeTrocar ? (
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 bg-white/60 hover:bg-amber-100 text-amber-900"
              onClick={() => trocar.mutate()}
              disabled={trocar.isPending}
            >
              <RotateCw className={`w-3.5 h-3.5 mr-1 ${trocar.isPending ? "animate-spin" : ""}`} />
              Outro ({trocasRestantes}/3)
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block w-full">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    className="w-full border-amber-300/40 bg-white/40 text-amber-900/50"
                  >
                    <RotateCw className="w-3.5 h-3.5 mr-1" />
                    Outro (0/3)
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Volte amanhã para mais</TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
