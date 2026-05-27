import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Flame, Plus, Moon } from "lucide-react";

export function VitoriaDialog({
  open, onOpenChange, meta, streak, totalSessoes, materias, onAdicionarMais,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meta: number;
  streak: number;
  totalSessoes: number;
  materias: string[];
  onAdicionarMais: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md text-center p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500/15 via-primary/10 to-amber-400/15 p-6 space-y-4">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
            className="text-6xl"
          >
            🎉
          </motion.div>
          <div>
            <h2 className="text-2xl font-display font-bold">Tarefa cumprida!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Você concluiu seus {meta} tópicos de hoje.
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-400 text-sm font-semibold">
              <Flame className="w-4 h-4" /> Sequência: {streak} {streak === 1 ? "dia" : "dias"}
            </div>
          </div>

          <div className="border-t border-border/40 pt-3 text-left space-y-1 text-sm">
            <div className="font-semibold mb-1.5 text-center">Resumo do dia</div>
            <div>• {totalSessoes} {totalSessoes === 1 ? "sessão registrada" : "sessões registradas"}</div>
            <div>• Meta diária: {meta} tópicos ✅</div>
            {materias.length > 0 && (
              <div className="line-clamp-2">• Matérias: {materias.join(", ")}</div>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              <Moon className="w-4 h-4 mr-2" /> Descansar bem 😌
            </Button>
            <button
              onClick={onAdicionarMais}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mx-auto"
            >
              <Plus className="w-3 h-3" /> Quer continuar? Adicionar mais 1
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
