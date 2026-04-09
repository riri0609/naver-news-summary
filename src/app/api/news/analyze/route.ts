import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeNewsWithOpenAI } from "@/lib/analysis";
import {
  fetchFilteredNews,
  resolveSearchQuery,
  type NewsMode,
} from "@/lib/naver-news";

const BodySchema = z.object({
  mode: z.enum(["keyword", "today", "week"]),
  keyword: z.string().optional(),
});

export async function POST(request: Request) {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() ?? "gpt-4o-mini";

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 이 설정되지 않았습니다. .env.local 을 확인하세요." },
      { status: 500 },
    );
  }
  if (!openaiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY 가 설정되지 않았습니다. .env.local 을 확인하세요." },
      { status: 500 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON 본문이 필요합니다." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "mode(keyword|today|week)와 선택적 keyword만 허용됩니다." },
      { status: 400 },
    );
  }

  const { mode, keyword } = parsed.data;

  let query: string;
  try {
    query = resolveSearchQuery(mode as NewsMode, keyword);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "검색어 오류" },
      { status: 400 },
    );
  }

  let items;
  try {
    items = await fetchFilteredNews({
      clientId,
      clientSecret,
      query,
      mode: mode as NewsMode,
      display: 100,
      sort: "date",
      maxItems: 25,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "뉴스 조회 실패" },
      { status: 502 },
    );
  }

  if (items.length === 0) {
    return NextResponse.json(
      {
        error:
          "조건에 맞는 뉴스가 없습니다. 키워드를 바꾸거나 기간을 넓혀 보세요.",
        items: [],
        analysis: null,
        query,
      },
      { status: 200 },
    );
  }

  try {
    const analysis = await analyzeNewsWithOpenAI(items, openaiKey, model);
    return NextResponse.json({
      query,
      mode,
      items,
      analysis,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "분석 실패", items, query },
      { status: 502 },
    );
  }
}
