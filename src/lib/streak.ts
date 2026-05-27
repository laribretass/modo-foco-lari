import { differenceInCalendarDays, parseISO } from "date-fns";

/** Calcula streak (sequência de dias consecutivos com ≥1 sessão concluída). */
export function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const unique = Array.from(new Set(dates)).sort().reverse();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMostRecent = differenceInCalendarDays(today, parseISO(unique[0]));
  if (diffMostRecent > 1) return 0;

  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const diff = differenceInCalendarDays(parseISO(unique[i - 1]), parseISO(unique[i]));
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

/**
 * Calcula streak de dias em que a META foi cumprida.
 * Recebe um Map(dia -> {planejados, concluidos}). Dia conta se concluidos >= planejados > 0.
 */
export function calcStreakMeta(daily: Map<string, { meta: number; done: number }>): number {
  const cumpridos = Array.from(daily.entries())
    .filter(([, v]) => v.meta > 0 && v.done >= v.meta)
    .map(([d]) => d)
    .sort()
    .reverse();
  if (cumpridos.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMostRecent = differenceInCalendarDays(today, parseISO(cumpridos[0]));
  if (diffMostRecent > 1) return 0;

  let streak = 1;
  for (let i = 1; i < cumpridos.length; i++) {
    const diff = differenceInCalendarDays(parseISO(cumpridos[i - 1]), parseISO(cumpridos[i]));
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}
