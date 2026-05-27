import { differenceInCalendarDays, parseISO } from "date-fns";

/** Streak de dias consecutivos com Anki feito (considera hoje OU ontem como início válido). */
export function calcAnkiStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const unique = Array.from(new Set(dates)).sort().reverse();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = differenceInCalendarDays(today, parseISO(unique[0]));
  if (diff > 1) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const d = differenceInCalendarDays(parseISO(unique[i - 1]), parseISO(unique[i]));
    if (d === 1) streak++; else break;
  }
  return streak;
}

/** % de aderência ao Anki no mês corrente (dias feitos / dias decorridos do mês). */
export function calcAderenciaMes(dates: string[]): number {
  const hoje = new Date();
  const ano = hoje.getFullYear(), mes = hoje.getMonth();
  const diasDecorridos = hoje.getDate();
  const feitosNoMes = new Set(
    dates.filter((d) => {
      const dt = parseISO(d);
      return dt.getFullYear() === ano && dt.getMonth() === mes;
    })
  ).size;
  return Math.round((feitosNoMes / diasDecorridos) * 100);
}
