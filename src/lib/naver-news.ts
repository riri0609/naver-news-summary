import { getStartOfTodaySeoul, getStartOfWeekMondaySeoul } from "./seoul-date";

const NAVER_NEWS_URL = "https://openapi.naver.com/v1/search/news.json";

export type NewsMode = "keyword" | "today" | "week";

export type NormalizedNewsItem = {
  title: string;
  description: string;
  link: string;
  originallink: string;
  pubDate: string;
  publishedAt: Date;
};

export type NaverNewsSearchOptions = {
  clientId: string;
  clientSecret: string;
  query: string;
  display?: number;
  sort?: "sim" | "date";
  maxItems?: number;
  mode: NewsMode;
};

export function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

function parsePubDate(pubDate: string): Date {
  const t = Date.parse(pubDate);
  if (!Number.isNaN(t)) return new Date(t);
  return new Date(NaN);
}

function inRangeForMode(date: Date, mode: NewsMode, now: Date): boolean {
  if (mode === "keyword") return true;
  if (mode === "today") {
    const start = getStartOfTodaySeoul(now);
    return date >= start && date <= now;
  }
  const weekStart = getStartOfWeekMondaySeoul(now);
  return date >= weekStart && date <= now;
}

type NaverRawItem = {
  title: string;
  description: string;
  link: string;
  originallink: string;
  pubDate: string;
};

type NaverResponse = {
  items?: NaverRawItem[];
  total?: number;
};

async function fetchPage(
  clientId: string,
  clientSecret: string,
  query: string,
  display: number,
  start: number,
  sort: "sim" | "date",
): Promise<NaverResponse> {
  const url = new URL(NAVER_NEWS_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(display));
  url.searchParams.set("start", String(start));
  url.searchParams.set("sort", sort);

  const res = await fetch(url.toString(), {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `네이버 뉴스 API 오류 (${res.status}): ${text.slice(0, 200)}`,
    );
  }

  return res.json() as Promise<NaverResponse>;
}

function normalizeItem(raw: NaverRawItem): NormalizedNewsItem | null {
  const publishedAt = parsePubDate(raw.pubDate);
  if (Number.isNaN(publishedAt.getTime())) return null;
  return {
    title: stripHtml(raw.title),
    description: stripHtml(raw.description),
    link: raw.link,
    originallink: raw.originallink,
    pubDate: raw.pubDate,
    publishedAt,
  };
}

/**
 * 최신순으로 여러 페이지를 조회한 뒤, 오늘/이번주 모드면 pubDate로 필터합니다.
 * 네이버 API: display 최대 100, start 최대 1000.
 */
export async function fetchFilteredNews(
  options: NaverNewsSearchOptions,
): Promise<NormalizedNewsItem[]> {
  const {
    clientId,
    clientSecret,
    query,
    display = 100,
    sort = "date",
    maxItems = 25,
    mode,
  } = options;

  const now = new Date();
  const out: NormalizedNewsItem[] = [];
  const seen = new Set<string>();

  for (let start = 1; start <= 1000 && out.length < maxItems; start += display) {
    const data = await fetchPage(
      clientId,
      clientSecret,
      query,
      Math.min(display, 100),
      start,
      sort,
    );
    const items = data.items ?? [];
    if (items.length === 0) break;

    for (const raw of items) {
      const n = normalizeItem(raw);
      if (!n) continue;
      if (!inRangeForMode(n.publishedAt, mode, now)) continue;
      const key = `${n.link}|${n.pubDate}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(n);
      if (out.length >= maxItems) break;
    }

    if (items.length < Math.min(display, 100)) break;
  }

  return out.sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  );
}

export function resolveSearchQuery(
  mode: NewsMode,
  keyword: string | undefined,
): string {
  const k = keyword?.trim();
  if (mode === "keyword") {
    if (!k) throw new Error("키워드 모드에서는 검색어가 필요합니다.");
    return k;
  }
  return k && k.length > 0 ? k : "주요뉴스";
}
