import { differenceInCalendarDays, parseISO } from "date-fns";

/** Calcula streak (sequência de dias consecutivos com ≥1 sessão concluída). */
export function calcStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const unique = Array.from(new Set(dates)).sort().reverse(); // mais recente primeiro
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Streak conta se a última sessão foi hoje OU ontem (margem).
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
