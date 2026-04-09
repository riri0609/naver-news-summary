import OpenAI, { APIError } from "openai";
import { z } from "zod";
import type { NormalizedNewsItem } from "./naver-news";

export const CATEGORY_LABELS = [
  "정치",
  "경제",
  "사회",
  "IT/과학",
  "국제",
  "스포츠",
  "문화",
  "생활",
  "연예",
  "기타",
] as const;

const SENTIMENT_VALUES = ["positive", "negative", "neutral", "mixed"] as const;

function normalizeSentimentLabel(
  raw: unknown,
): "positive" | "negative" | "neutral" | "mixed" {
  const s = String(raw ?? "").toLowerCase().trim();
  if (SENTIMENT_VALUES.includes(s as (typeof SENTIMENT_VALUES)[number])) {
    return s as (typeof SENTIMENT_VALUES)[number];
  }
  return "neutral";
}

/** 0~1 또는 0~100(퍼센트) 형태 모두 허용 */
function normalizeConfidence(raw: unknown): number {
  const n = Number(raw);
  if (Number.isNaN(n)) return 0.5;
  if (n > 1 && n <= 100) return Math.min(1, n / 100);
  return Math.min(1, Math.max(0, n));
}

function normalizeCategory(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if ((CATEGORY_LABELS as readonly string[]).includes(s)) return s;
  return "기타";
}

export const NewsAnalysisSchema = z.object({
  overallSummary: z.string(),
  keywords: z.array(
    z.object({
      term: z.string(),
      importance: z.coerce.number().min(1).max(5),
      reason: z.string().optional(),
    }),
  ),
  overallSentiment: z.object({
    label: z
      .union([z.enum(SENTIMENT_VALUES), z.string()])
      .transform(normalizeSentimentLabel),
    rationale: z.string(),
  }),
  articles: z.array(
    z.object({
      index: z.coerce.number().int().min(0),
      primaryCategory: z.union([z.string(), z.number()]).transform(normalizeCategory),
      categoryConfidence: z
        .union([z.number(), z.string()])
        .transform(normalizeConfidence),
      sentiment: z.object({
        label: z
          .union([z.enum(SENTIMENT_VALUES), z.string()])
          .transform(normalizeSentimentLabel),
        rationale: z.string(),
      }),
    }),
  ),
  trendInsights: z.array(z.string()),
});

export type NewsAnalysis = z.infer<typeof NewsAnalysisSchema>;

/** 문자열 배열 또는 별칭 필드(term 대신 keyword 등)를 스키마에 맞게 보정 */
function normalizeKeywordsField(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  const out: unknown[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    const importanceDefault = Math.min(5, Math.max(1, 5 - i));

    if (typeof item === "string") {
      const term = item.trim();
      if (term) out.push({ term, importance: importanceDefault });
      continue;
    }
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const obj = item as Record<string, unknown>;
      const term = String(
        obj.term ?? obj.keyword ?? obj.word ?? obj.name ?? "",
      ).trim();
      if (!term) continue;
      const imp = obj.importance ?? obj.score ?? obj.weight;
      const reasonRaw = obj.reason ?? obj.rationale ?? obj.note;
      let importance = importanceDefault;
      if (imp !== undefined && imp !== null && String(imp) !== "") {
        const n = Number(imp);
        if (Number.isFinite(n)) importance = Math.min(5, Math.max(1, n));
      }
      out.push({
        term,
        importance,
        ...(reasonRaw != null && String(reasonRaw).trim() !== ""
          ? { reason: String(reasonRaw) }
          : {}),
      });
    }
  }
  return out;
}

/** overallSentiment 가 문자열로 오면 { label, rationale } 객체로 변환 */
function normalizeSentimentField(
  raw: unknown,
): { label: string; rationale: string } | unknown {
  if (typeof raw === "string") {
    const s = raw.trim();
    const lower = s.toLowerCase();
    const label =
      lower.includes("positiv") || lower.includes("긍정")
        ? "positive"
        : lower.includes("negativ") || lower.includes("부정")
          ? "negative"
          : lower.includes("mixed") || lower.includes("혼합")
            ? "mixed"
            : "neutral";
    return { label, rationale: s };
  }
  return raw;
}

/** articles 배열 원소에 index 가 없으면 배열 위치로 채움 */
function normalizeArticlesField(raw: unknown): unknown {
  if (!Array.isArray(raw)) return raw;
  return raw.map((item, i) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const obj = item as Record<string, unknown>;
    const hasIndex =
      obj.index !== undefined &&
      obj.index !== null &&
      !Number.isNaN(Number(obj.index));
    return hasIndex ? obj : { ...obj, index: i };
  });
}

/** 모델이 배열 대신 객체·문자열로 줄 때 1차 보정 */
function coerceAnalysisShape(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = { ...(raw as Record<string, unknown>) };
  if (o.keywords !== undefined) {
    o.keywords = normalizeKeywordsField(o.keywords);
  }
  if (o.overallSentiment !== undefined) {
    o.overallSentiment = normalizeSentimentField(o.overallSentiment);
  }
  if (o.articles !== undefined) {
    if (typeof o.articles === "object" && !Array.isArray(o.articles)) {
      o.articles = Object.values(o.articles as Record<string, unknown>);
    }
    o.articles = normalizeArticlesField(o.articles);
  }
  if (typeof o.trendInsights === "string") {
    o.trendInsights = (o.trendInsights as string)
      .split(/\n/)
      .map((s) => s.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean);
  }
  return o;
}

function buildArticlesPayload(items: NormalizedNewsItem[]) {
  return items.map((it, index) => ({
    index,
    title: it.title.slice(0, 500),
    description: it.description.slice(0, 800),
  }));
}

export async function analyzeNewsWithOpenAI(
  items: NormalizedNewsItem[],
  apiKey: string,
  model: string,
): Promise<NewsAnalysis> {
  if (items.length === 0) {
    throw new Error("분석할 뉴스 기사가 없습니다.");
  }

  const client = new OpenAI({ apiKey });
  const payload = buildArticlesPayload(items);

  const system = `당신은 한국어 뉴스 분석가입니다. 입력은 동일 주제 또는 시기의 뉴스 기사 목록입니다.
반드시 유효한 JSON 객체만 출력하세요. 마크다운·코드펜스·주석은 금지입니다.

필드 이름(영문 키 고정): overallSummary, keywords, overallSentiment, articles, trendInsights

카테고리(primaryCategory)는 다음 중 하나만 사용: ${CATEGORY_LABELS.join(", ")}
감정 라벨(label)은 positive, negative, neutral, mixed 중 하나.

요구사항:
- overallSummary: 전체 맥락을 3~6문장으로 요약
- keywords: 반드시 객체 배열. 각 원소는 {"term":"키워드","importance":1~5} 형태(문자열 배열 금지)
- overallSentiment: 전체 톤과 rationale
- articles: 입력의 각 index마다 한 항목. primaryCategory, categoryConfidence(0~1), sentiment(label, rationale)
- trendInsights: 공통 주제·대립 시각·시의성 등 인사이트 3~7개 (짧은 문장)`;

  const user = JSON.stringify(
    { articles: payload, categories: CATEGORY_LABELS },
    null,
    0,
  );

  let completion;
  try {
    completion = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: user,
        },
      ],
    });
  } catch (e: unknown) {
    if (e instanceof APIError) {
      if (e.status === 401) {
        throw new Error(
          "OpenAI 인증 실패(401): OPENAI_API_KEY 를 확인하세요.",
        );
      }
      if (e.status === 429) {
        throw new Error(
          "OpenAI 요청 한도 초과(429): 잠시 후 다시 시도하세요.",
        );
      }
      throw new Error(
        `OpenAI API 오류${e.status != null ? ` (${e.status})` : ""}: ${e.message}`,
      );
    }
    throw e;
  }

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI 응답이 비어 있습니다.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("OpenAI JSON 파싱에 실패했습니다.");
  }

  const safe = NewsAnalysisSchema.safeParse(coerceAnalysisShape(parsed));
  if (!safe.success) {
    const issues = safe.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(
      `AI 응답 형식이 예상과 다릅니다. ${issues || safe.error.message}`,
    );
  }

  const analysis = safe.data;
  return alignArticles(analysis, items);
}

function alignArticles(
  analysis: NewsAnalysis,
  items: NormalizedNewsItem[],
): NewsAnalysis {
  const byIndex = new Map(analysis.articles.map((a) => [a.index, a]));
  const articles = items.map((_, i) => {
    const found = byIndex.get(i);
    if (found) return found;
    return {
      index: i,
      primaryCategory: "기타",
      categoryConfidence: 0.5,
      sentiment: {
        label: "neutral" as const,
        rationale: "해당 기사에 대한 개별 분석이 생략되었습니다.",
      },
    };
  });
  const keywords = [...analysis.keywords].sort(
    (a, b) => b.importance - a.importance,
  );
  return { ...analysis, articles, keywords };
}
