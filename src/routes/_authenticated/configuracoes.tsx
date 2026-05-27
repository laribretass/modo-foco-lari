import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, Moon, Sun, Bell } from "lucide-react";

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
  useEffect(() => {
    if (profile) {
      setNome(profile.nome ?? ""); setMeta(profile.meta_diaria_questoes); setAcerto(profile.meta_acerto_pct);
      setAnkiAtivo((profile as any).anki_lembrete_ativo ?? false);
      setAnkiHorario(String((profile as any).anki_lembrete_horario ?? "20:00").slice(0, 5));
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
