import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, Moon, Sun, Bell, Target, CalendarDays } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/configuracoes")({ component: ConfigPage });

function ConfigPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark";
    setDark(isDark);
    if (isDark) document.documentElement.classList.add("dark");
  }, []);

  const toggleDark = (v: boolean) => {
    setDark(v);
    document.documentElement.classList.toggle("dark", v);
    localStorage.setItem("theme", v ? "dark" : "light");
  };

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => { const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single(); return data; },
    enabled: !!user,
  });

  const [nome, setNome] = useState("");
  const [meta, setMeta] = useState(30);
  const [acerto, setAcerto] = useState(70);
  const [ankiAtivo, setAnkiAtivo] = useState(false);
  const [ankiHorario, setAnkiHorario] = useState("20:00");
  const [nivelMeta, setNivelMeta] = useState<"leve"|"normal"|"intenso"|"personalizado">("normal");
  const [metaTopicos, setMetaTopicos] = useState(4);
  useEffect(() => {
    if (profile) {
      setNome(profile.nome ?? ""); setMeta(profile.meta_diaria_questoes); setAcerto(profile.meta_acerto_pct);
      setAnkiAtivo((profile as any).anki_lembrete_ativo ?? false);
      setAnkiHorario(String((profile as any).anki_lembrete_horario ?? "20:00").slice(0, 5));
      setNivelMeta(((profile as any).nivel_meta ?? "normal"));
      setMetaTopicos((profile as any).meta_topicos_dia ?? 4);
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles")
        .update({ nome, meta_diaria_questoes: meta, meta_acerto_pct: acerto })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["profile"] }); },
  });

  const saveMetaDiaria = useMutation({
    mutationFn: async () => {
      const valor = nivelMeta === "leve" ? 2 : nivelMeta === "normal" ? 4 : nivelMeta === "intenso" ? 6 : Math.max(1, Math.min(15, metaTopicos));
      const { error } = await supabase.from("profiles")
        .update({ nivel_meta: nivelMeta, meta_topicos_dia: valor } as any)
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Meta diária atualizada");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["plano-dia"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const saveAnki = useMutation({
    mutationFn: async (patch: { anki_lembrete_ativo?: boolean; anki_lembrete_horario?: string }) => {
      if (patch.anki_lembrete_ativo && typeof Notification !== "undefined" && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      const { error } = await supabase.from("profiles").update(patch as any).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const logout = async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-3xl font-display font-bold">Configurações</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Perfil</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Meta diária de questões</Label><Input type="number" value={meta} onChange={(e) => setMeta(Number(e.target.value))} /></div>
            <div><Label>Meta de % acerto</Label><Input type="number" value={acerto} onChange={(e) => setAcerto(Number(e.target.value))} /></div>
          </div>
          <Button onClick={() => save.mutate()}>Salvar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Aparência</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-2">{dark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}<span>Tema escuro</span></div>
          <Switch checked={dark} onCheckedChange={toggleDark} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4" /> Meta diária</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Quantos tópicos por dia?</p>
          <RadioGroup value={nivelMeta} onValueChange={(v) => setNivelMeta(v as any)} className="space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem value="leve" /> Leve — 2 tópicos
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem value="normal" /> Normal — 4 tópicos <span className="text-xs text-muted-foreground">(recomendado)</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem value="intenso" /> Intenso — 6 tópicos
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem value="personalizado" /> Personalizado
              {nivelMeta === "personalizado" && (
                <Input type="number" min={1} max={15} value={metaTopicos}
                  onChange={(e) => setMetaTopicos(Number(e.target.value))}
                  className="w-20 h-7 ml-2" />
              )}
            </label>
          </RadioGroup>
          <Button onClick={() => saveMetaDiaria.mutate()} disabled={saveMetaDiaria.isPending}>Salvar</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Prova e Cronograma</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Configure data da prova, modo de atraso e veja suas 3 fases.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/cronograma">Abrir cronograma</Link>
          </Button>
        </CardContent>
      </Card>


      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4" /> Notificações</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Lembrar de fazer Anki</div>
              <div className="text-xs text-muted-foreground">Aviso diário se você não revisou os flashcards</div>
            </div>
            <Switch
              checked={ankiAtivo}
              onCheckedChange={(v) => { setAnkiAtivo(v); saveAnki.mutate({ anki_lembrete_ativo: v }); }}
            />
          </div>
          {ankiAtivo && (
            <div>
              <Label>Horário do lembrete</Label>
              <Input
                type="time"
                value={ankiHorario}
                onChange={(e) => setAnkiHorario(e.target.value)}
                onBlur={() => saveAnki.mutate({ anki_lembrete_horario: ankiHorario })}
              />
            </div>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardContent className="p-4">
          <Button variant="destructive" className="w-full" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
