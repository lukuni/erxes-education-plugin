import { useMutation } from "@apollo/client";
import { useEffect, useMemo, useState } from "react";
import type { EducationCardsQuery } from "~/gql/graphql";
import { CARD_REVIEW } from "../graphql";
import { confettiFrom, sound } from "../lib/fx";
import { useVoice } from "../lib/voice";

type Card = EducationCardsQuery["educationCards"][number];

const GRADE_INFO: Record<number, { label: string; tone: string; emoji: string }> = {
  1: { label: "Хэцүү", tone: "coral", emoji: "😓" },
  2: { label: "Сайн", tone: "amber", emoji: "🙂" },
  3: { label: "Амархан", tone: "mint", emoji: "🤩" },
};

const fmtWait = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s} сек`;
};

/** One card: listen → type → see the back → server grades and schedules it. */
const SrsCard = ({ card, onDone }: { card: Card; onDone: () => void }) => {
  const voice = useVoice();
  const [review, reviewState] = useMutation(CARD_REVIEW, { refetchQueries: ["educationCards", "educationMe"] });
  const [typed, setTyped] = useState("");
  const [peeked, setPeeked] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const result = reviewState.data?.educationCardReview;
  const preview = typed.trim().toLowerCase() === card.cyrillic.toLowerCase();

  useEffect(() => {
    if (!voice.ready) return undefined;
    const timer = window.setTimeout(() => void voice.speak(card.cyrillic), 300);
    return () => window.clearTimeout(timer);
    // play once per card when the voice is ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.code, voice.ready]);

  const check = () => {
    setFlipped(true);
    if (preview) sound("good");
    else sound("bad");
  };

  const save = async (selfGrade?: number, element?: HTMLElement) => {
    const res = await review({
      variables: {
        code: card.code,
        typed: typed.trim() || null,
        selfGrade: selfGrade ?? null,
      },
    }).catch(() => null);
    const grade = res?.data?.educationCardReview.grade;
    if (grade === 3) {
      sound("win");
      confettiFrom(element ?? null);
    }
  };

  const needsSelfGrade = !typed.trim();

  return (
    <div className="edu-stage edu-rise" style={{ padding: 0 }}>
      <div className={`edu-flip${flipped ? " edu-flip--back" : ""}`} style={{ height: 460, cursor: "default" }}>
        <div className="edu-flip__inner">
          <div className="edu-flip__face edu-flip__front">
            <span style={{ fontSize: 48 }}>{card.emoji}</span>
            <button
              type="button"
              className="edu-btn edu-btn--round"
              onClick={() => void voice.speak(card.cyrillic)}
              disabled={voice.loading}
              aria-label="Сонсох"
            >
              {voice.loading ? "⏳" : "🔊"}
            </button>
            <span style={{ fontSize: 34, fontWeight: 900, letterSpacing: peeked ? 0 : 6 }}>
              {peeked ? card.cyrillic : "＿ ".repeat(Math.min(card.cyrillic.length, 8))}
            </span>
            <span className="edu-muted" style={{ fontSize: 13 }}>
              {card.meaningMn || card.meaning}
            </span>
            <input
              className="edu-input"
              style={{ textAlign: "center", fontSize: 20, fontWeight: 800, maxWidth: 260 }}
              placeholder="Сонсоод бич…"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && check()}
              autoFocus
            />
            <div className="edu-row" style={{ justifyContent: "center" }}>
              <button type="button" className="edu-btn edu-btn--ghost edu-btn--sm" onClick={() => setPeeked(true)}>
                👁 Харах
              </button>
              <button type="button" className="edu-btn edu-btn--sm" onClick={check}>
                {typed.trim() ? "✓ Шалгах" : "Эргүүлэх ↻"}
              </button>
            </div>
          </div>

          <div className="edu-flip__face edu-flip__back" style={{ justifyContent: "flex-start", gap: 8, overflowY: "auto" }}>
            {typed.trim() && (
              <span className={`edu-tag ${preview ? "edu-tag--mint" : "edu-tag--coral"}`} style={{ background: "#fff" }}>
                {preview ? "✓ Зөв бичлээ" : `✗ «${typed.trim()}»`}
              </span>
            )}
            <span style={{ fontSize: 36, fontWeight: 900 }}>{card.cyrillic}</span>
            <span style={{ opacity: 0.9 }}>
              {card.meaningMn}
              {card.meaning ? ` · ${card.meaning}` : ""}
            </span>
            {card.rule && (
              <span style={{ fontSize: 13, background: "rgba(255,255,255,0.14)", borderRadius: 14, padding: "8px 12px" }}>
                📌 {card.rule}
              </span>
            )}
            {card.example && (
              <button
                type="button"
                onClick={() => void voice.speak(card.example)}
                style={{ all: "unset", cursor: "pointer", fontSize: 14, fontStyle: "italic" }}
              >
                🔊 «{card.example}»
              </button>
            )}
            <span className="edu-script edu-script--sm" lang="mn-Mong">
              {card.script}
            </span>
            <span className="edu-galig">{card.galig}</span>
          </div>
        </div>
      </div>

      {flipped && !result && (
        <div className="edu-glass edu-rise education:flex education:flex-col education:items-center education:gap-3" style={{ width: "min(520px, 100%)" }}>
          {needsSelfGrade ? (
            <>
              <span className="edu-muted">Бичээгүй тул өөрөө үнэл:</span>
              <div className="edu-row" style={{ justifyContent: "center" }}>
                {[1, 2, 3].map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`edu-btn edu-btn--sm edu-btn--${GRADE_INFO[g]?.tone}`}
                    disabled={reviewState.loading}
                    onClick={(e) => void save(g, e.currentTarget)}
                  >
                    {GRADE_INFO[g]?.emoji} {g} · {GRADE_INFO[g]?.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button
              type="button"
              className="edu-btn edu-btn--mint"
              disabled={reviewState.loading}
              onClick={(e) => void save(undefined, e.currentTarget)}
            >
              {reviewState.loading ? "Үнэлж байна…" : "✓ Үнэлгээ авах"}
            </button>
          )}
          {reviewState.error && <span className="edu-muted">{reviewState.error.message}</span>}
        </div>
      )}

      {result && (
        <div className="edu-glass edu-rise education:flex education:flex-col education:items-center education:gap-3" style={{ width: "min(520px, 100%)" }}>
          <span className={`edu-tag edu-tag--${GRADE_INFO[result.grade]?.tone}`} style={{ fontSize: 16, padding: "6px 14px" }}>
            {GRADE_INFO[result.grade]?.emoji} {result.grade} · {GRADE_INFO[result.grade]?.label} — дахин {result.nextLabel}
          </span>
          {result.spelling && !result.spelling.isCorrect && (
            <div className="edu-rule edu-rule--bad">
              <div className="edu-rule__icon">✏️</div>
              <div className="education:flex education:flex-col">
                <span>
                  <span className="edu-diff-wrong">{result.spelling.originalWord}</span> →{" "}
                  <span className="edu-diff-right">{result.spelling.correctedWord}</span>{" "}
                  <span className="edu-tag edu-tag--coral">{result.spelling.errorType}</span>
                </span>
                <span className="edu-muted">{result.spelling.explanationMn}</span>
              </div>
            </div>
          )}
          <span className="edu-pill edu-pill--gem">+{result.xpEarned} XP</span>
          <button type="button" className="edu-btn edu-btn--lg" onClick={onDone} autoFocus>
            Дараагийн карт →
          </button>
        </div>
      )}
    </div>
  );
};

/** Spaced-repetition session over the unlocked cards that are due now. */
export const SrsDeck = ({ cards }: { cards: Card[] }) => {
  const [now, setNow] = useState(() => Date.now());
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const open = cards.filter((c) => !c.locked);
  const due = useMemo(
    () =>
      open
        .filter((c) => !c.dueAt || Date.parse(c.dueAt) <= now)
        .sort((a, b) => (a.dueAt ? Date.parse(a.dueAt) : 0) - (b.dueAt ? Date.parse(b.dueAt) : 0)),
    [open, now],
  );
  // Pin the card being studied so refetches after grading don't swap it out.
  const firstDue = due[0]?.code;
  useEffect(() => {
    if (!currentCode && firstDue) setCurrentCode(firstDue);
  }, [currentCode, firstDue]);
  const current = open.find((c) => c.code === currentCode);
  const nextDue = open
    .filter((c) => c.dueAt && Date.parse(c.dueAt) > now)
    .map((c) => Date.parse(c.dueAt as string))
    .sort((a, b) => a - b)[0];
  const counts = [1, 2, 3].map((g) => open.filter((c) => c.grade === g).length);
  const fresh = open.filter((c) => c.reps === 0).length;

  return (
    <div className="education:flex education:flex-col education:gap-4">
      <div className="edu-row" style={{ justifyContent: "center" }}>
        <span className="edu-pill">🆕 {fresh} шинэ</span>
        <span className="edu-pill">⏰ {due.length} давтах</span>
        <span className="edu-pill" style={{ color: "var(--edu-coral-d)" }}>😓 {counts[0]}</span>
        <span className="edu-pill" style={{ color: "#9a5b00" }}>🙂 {counts[1]}</span>
        <span className="edu-pill edu-pill--mint">🤩 {counts[2]}</span>
      </div>
      {current ? (
        <SrsCard
          key={`${current.code}-${round}`}
          card={current}
          onDone={() => {
            setRound((r) => r + 1);
            setCurrentCode(null);
          }}
        />
      ) : (
        <div className="edu-glass edu-stage">
          <div style={{ fontSize: 56 }}>✅</div>
          <h2 className="edu-h2">Одоогоор давтах карт алга!</h2>
          <p className="edu-muted" style={{ margin: 0 }}>
            {nextDue ? `Дараагийн карт ${fmtWait(nextDue - now)}-ийн дараа гарна.` : "Маргааш дахин ирээрэй."}
          </p>
          <p className="edu-muted" style={{ margin: 0, fontSize: 13 }}>
            1 · Хэцүү → 1 минут · 2 · Сайн → 10 минут · 3 · Амархан → маргааш
          </p>
        </div>
      )}
    </div>
  );
};
