/** 서울(Asia/Seoul) 기준 오늘 자정 */
export function getStartOfTodaySeoul(now: Date = new Date()): Date {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m, d] = s.split("-").map(Number);
  return new Date(
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00+09:00`,
  );
}

/** 서울 기준 이번 주 월요일 00:00 (월~일 주간) */
export function getStartOfWeekMondaySeoul(now: Date = new Date()): Date {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m, d] = s.split("-").map(Number);
  const noon = new Date(
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00+09:00`,
  );
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  }).format(noon);
  const order: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dow = order[wd] ?? 0;
  const daysFromMonday = (dow + 6) % 7;
  const mondayNoon = new Date(noon.getTime() - daysFromMonday * 86400000);
  const monStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(mondayNoon);
  const [ym, mm, dm] = monStr.split("-").map(Number);
  return new Date(
    `${ym}-${String(mm).padStart(2, "0")}-${String(dm).padStart(2, "0")}T00:00:00+09:00`,
  );
}
