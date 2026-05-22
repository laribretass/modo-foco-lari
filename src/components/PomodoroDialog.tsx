import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Coffee, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "foco" | "pausa";
const FOCO_SEG = 25 * 60;
const PAUSA_SEG = 5 * 60;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulo: string;
  subtitulo?: string;
  cor?: string;
  /** Chamado quando o ciclo de foco termina (registra sessão). */
  onFocoCompleto: () => void;
}

export function PomodoroDialog({ open, onOpenChange, titulo, subtitulo, cor, onFocoCompleto }: Props) {
  const [mode, setMode] = useState<Mode>("foco");
  const [seconds, setSeconds] = useState(FOCO_SEG);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setMode("foco");
      setSeconds(FOCO_SEG);
      setRunning(false);
    }
  }, [open]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s - 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  useEffect(() => {
    if (seconds < 0) {
      // ping audível simples
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ctx.createOscillator();
        o.frequency.value = mode === "foco" ? 880 : 660;
        o.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.25);
      } catch {}

      if (mode === "foco") {
        onFocoCompleto();
        setMode("pausa");
        setSeconds(PAUSA_SEG);
      } else {
        setMode("foco");
        setSeconds(FOCO_SEG);
        setRunning(false);
      }
    }
  }, [seconds, mode, onFocoCompleto]);

  const total = mode === "foco" ? FOCO_SEG : PAUSA_SEG;
  const pct = Math.max(0, Math.min(100, (seconds / total) * 100));
  const mm = String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, "0");
  const ss = String(Math.max(0, seconds) % 60).padStart(2, "0");
  const accent = cor ?? "hsl(var(--primary))";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "foco" ? <Brain className="w-5 h-5" /> : <Coffee className="w-5 h-5" />}
            {mode === "foco" ? "Foco" : "Pausa"} · Pomodoro
          </DialogTitle>
        </DialogHeader>

        <div className="text-center space-y-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Estudando</div>
          <div className="font-semibold leading-tight">{titulo}</div>
          {subtitulo && <div className="text-xs text-muted-foreground">{subtitulo}</div>}
        </div>

        <div className="relative w-48 h-48 mx-auto my-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke={accent} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - pct / 100)}`}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold tabular-nums">{mm}:{ss}</div>
            <div className={cn("text-xs mt-1", mode === "foco" ? "text-primary" : "text-orange-500")}>
              {mode === "foco" ? "Mantenha o foco" : "Respira fundo"}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => setRunning((r) => !r)}>
            {running ? <><Pause className="w-4 h-4 mr-1" /> Pausar</> : <><Play className="w-4 h-4 mr-1" /> Iniciar</>}
          </Button>
          <Button variant="outline" onClick={() => { setSeconds(total); setRunning(false); }}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
