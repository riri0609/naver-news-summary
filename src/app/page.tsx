"use client";

import { useState } from "react";
import type { NewsAnalysis } from "@/lib/analysis";
import type { NormalizedNewsItem } from "@/lib/naver-news";

type Mode = "keyword" | "today" | "week";

type AnalyzeResponse = {
  query?: string;
  mode?: Mode;
  items?: NormalizedNewsItem[];
  analysis?: NewsAnalysis | null;
  error?: string;
};

type SentimentKey = "positive" | "negative" | "neutral" | "mixed";

const SENTIMENT_KO: Record<SentimentKey, string> = {
  positive: "긍정",
  negative: "부정",
  neutral: "중립",
  mixed: "혼합",
};

const SENTIMENT_COLORS: Record<SentimentKey, string> = {
  positive:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  negative:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  neutral:
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
  mixed:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
};

function sentimentColor(label: string): string {
  return (
    SENTIMENT_COLORS[label as SentimentKey] ?? SENTIMENT_COLORS.neutral
  );
}

function sentimentKo(label: string): string {
  return SENTIMENT_KO[label as SentimentKey] ?? label;
}

function keywordSizeClass(importance: number): string {
  if (importance >= 5) return "text-base font-bold px-4 py-1.5";
  if (importance >= 4) return "text-sm font-semibold px-3 py-1";
  if (importance >= 3) return "text-sm font-medium px-3 py-1";
  if (importance >= 2) return "text-xs font-normal px-2.5 py-0.5";
  return "text-xs font-normal px-2 py-0.5 opacity-75";
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="skeleton mb-3 h-4 w-1/3" />
          <div className="skeleton mb-2 h-3 w-full" />
          <div className="skeleton mb-2 h-3 w-full" />
          <div className="skeleton h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="spinner mr-2 h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg
      className="h-8 w-8 text-indigo-200"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"
      />
    </svg>
  );
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("keyword");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setExpandedIndex(null);
    try {
      const res = await fetch("/api/news/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          keyword: keyword.trim() || undefined,
        }),
      });
      const data = (await res.json()) as AnalyzeResponse;
      if (!res.ok && !data.error) {
        setResult({ error: `서버 오류 (${res.status}). 잠시 후 다시 시도하세요.` });
        return;
      }
      setResult(data);
    } catch {
      setResult({ error: "요청에 실패했습니다. 네트워크를 확인하세요." });
    } finally {
      setLoading(false);
    }
  }

  const MODES: { value: Mode; label: string }[] = [
    { value: "keyword", label: "키워드 검색" },
    { value: "today", label: "오늘" },
    { value: "week", label: "이번 주" },
  ];

  return (
    <div className="flex min-h-full flex-col">
      {/* ── 헤더 배너 ── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 px-4 py-10 sm:px-6">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:32px_32px]" />
        <div className="relative mx-auto flex max-w-3xl items-center gap-4">
          <NewsIcon />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              실시간 뉴스 요약
            </h1>
            <p className="mt-1 text-sm text-indigo-200">
              네이버 뉴스 검색 후 AI가 요약 · 키워드 · 감정 · 분류 · 트렌드를 분석합니다
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
        {/* ── 검색 폼 ── */}
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          {/* 세그먼트 버튼 */}
          <div className="mb-4 inline-flex w-full rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
            {MODES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  mode === value
                    ? "bg-white text-indigo-600 shadow dark:bg-zinc-700 dark:text-indigo-300"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 검색어 입력 */}
          <div className="mb-4 flex flex-col gap-1.5">
            <label
              htmlFor="kw"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              검색어
              {mode === "keyword" ? (
                <span className="ml-1 text-rose-500"> *</span>
              ) : (
                <span className="ml-1 font-normal text-zinc-400">
                  (비우면 주요뉴스)
                </span>
              )}
            </label>
            <input
              id="kw"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={
                mode === "keyword" ? "예: 인공지능, 반도체, 환율" : "특정 주제 입력 또는 비워두기"
              }
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-indigo-800"
            />
          </div>

          {/* 실행 버튼 */}
          <button
            type="submit"
            disabled={loading || (mode === "keyword" && !keyword.trim())}
            className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow transition hover:from-indigo-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <SpinnerIcon />}
            {loading ? "분석 중…" : "뉴스 분석 시작"}
          </button>
        </form>

        {/* ── 로딩 스켈레톤 ── */}
        {loading && <Skeleton />}

        {/* ── 에러 ── */}
        {!loading && result?.error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
          >
            <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            <span>{result.error}</span>
          </div>
        )}

        {/* ── 결과 ── */}
        {!loading && result && !result.error && result.analysis && result.items && (
          <div className="flex flex-col gap-6">

            {/* 검색 메타 */}
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {result.mode === "keyword" ? "키워드" : result.mode === "today" ? "오늘" : "이번 주"}
              </span>
              <span>검색어: <strong className="text-zinc-700 dark:text-zinc-200">{result.query}</strong></span>
              <span>· 기사 {result.items.length}건</span>
            </div>

            {/* 전체 요약 */}
            <section className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-l-4 border-indigo-500 px-5 py-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-500">
                  AI 전체 요약
                </h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {result.analysis.overallSummary}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-zinc-500">전체 감정</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${sentimentColor(result.analysis.overallSentiment.label)}`}
                  >
                    {sentimentKo(result.analysis.overallSentiment.label)}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {result.analysis.overallSentiment.rationale}
                  </span>
                </div>
              </div>
            </section>

            {/* 키워드 */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-indigo-500">
                핵심 키워드 (중요도순)
              </h2>
              <div className="flex flex-wrap gap-2">
                {result.analysis.keywords.map((k, idx) => (
                  <span
                    key={`${k.term}-${idx}`}
                    className={`inline-block rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 ${keywordSizeClass(k.importance)}`}
                    title={k.reason ?? `중요도 ${k.importance}`}
                  >
                    {k.term}
                  </span>
                ))}
              </div>
            </section>

            {/* 트렌드 인사이트 */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-indigo-500">
                트렌드 인사이트
              </h2>
              <ol className="flex flex-col gap-3">
                {result.analysis.trendInsights.map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <p className="pt-0.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{t}</p>
                  </li>
                ))}
              </ol>
            </section>

            {/* 기사별 분석 */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-indigo-500">
                기사별 분석 ({result.items.length}건)
              </h2>
              <ul className="flex flex-col gap-2.5">
                {result.items.map((item, i) => {
                  const a = result.analysis?.articles[i];
                  const isOpen = expandedIndex === i;
                  return (
                    <li
                      key={`${item.link}-${i}`}
                      className="rounded-xl border border-zinc-100 bg-zinc-50/60 transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/40"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedIndex(isOpen ? null : i)}
                        className="flex w-full items-start gap-3 p-3 text-left"
                        aria-expanded={isOpen}
                      >
                        {/* 번호 */}
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                          {i + 1}
                        </span>

                        <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
                          >
                            {item.title}
                          </a>

                          {a && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="rounded-md bg-zinc-200 px-1.5 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                                {a.primaryCategory}
                              </span>
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${sentimentColor(a.sentiment.label)}`}
                              >
                                {sentimentKo(a.sentiment.label)}
                              </span>
                              <span className="text-[11px] text-zinc-400">
                                {new Date(item.publishedAt).toLocaleDateString("ko-KR", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 아코디언 화살표 */}
                        <svg
                          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                      </button>

                      {/* 펼쳐지는 상세 */}
                      {isOpen && a && (
                        <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
                          <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                            <span className="font-medium">감정 분석:</span>{" "}
                            {a.sentiment.rationale}
                          </p>
                          {item.description && (
                            <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500 line-clamp-3">
                              {item.description}
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        )}

        {!loading && result && !result.error && result.items?.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-zinc-400">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-sm">조건에 맞는 기사가 없습니다.</p>
            <p className="text-xs">키워드를 바꾸거나 기간을 넓혀 보세요.</p>
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-200 py-4 text-center text-xs text-zinc-400 dark:border-zinc-800">
        네이버 뉴스 검색 + OpenAI 분석 · 이용약관 및 일일 API 한도를 준수하세요
      </footer>
    </div>
  );
}
