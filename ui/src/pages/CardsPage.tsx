import { useMutation, useQuery } from "@apollo/client";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { IconCards } from "@tabler/icons-react";
import { toast } from "erxes-ui";
import { BASE, ErrorBlock, LoadingBlock, Shell } from "../components/Shell";
import { CARDS_QUERY, CARD_STUDIED } from "../graphql";
import { confettiFrom, sound } from "../lib/fx";
import { useVoice } from "../lib/voice";
import { SrsDeck } from "../components/SrsDeck";

const FONT_ID = "edu-mongolian-font";

/** Loads a Mongolian script web font once (falls back to system fonts offline). */
const useMongolianFont = () => {
  useEffect(() => {
    if (document.getElementById(FONT_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_ID;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Mongolian&display=swap";
    document.head.appendChild(link);
  }, []);
};

type Mode = "srs" | "script";

export const CardsPage = () => {
  useMongolianFont();
  const { data, loading, error, refetch } = useQuery(CARDS_QUERY);
  const [studied] = useMutation(CARD_STUDIED, { refetchQueries: ["educationMe"] });
  const { speak } = useVoice();
  const [mode, setMode] = useState<Mode>("srs");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [galig, setGalig] = useState(true);
  const [learned, setLearned] = useState<string[]>([]);

  const cards = data?.educationCards ?? [];
  const open = cards.filter((c) => !c.locked);
  const card = open[index % Math.max(open.length, 1)];

  const go = (step: number) => {
    setFlipped(false);
    setIndex((i) => (i + step + open.length) % open.length);
  };

  const markLearned = async (element: HTMLElement) => {
    if (!card) return;
    sound("good");
    confettiFrom(element);
    setLearned((l) => (l.includes(card.code) ? l : [...l, card.code]));
    try {
      await studied({ variables: { code: card.code } });
      toast({ title: "+2 XP", description: `«${card.cyrillic}» картыг давтлаа` });
    } catch (e) {
      toast({ title: "Хадгалж чадсангүй", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
    go(1);
  };

  return (
    <Shell title="Флаш карт" icon={IconCards}>
      <div className="edu-row" style={{ justifyContent: "center" }}>
        <button
          type="button"
          className={`edu-btn edu-btn--sm ${mode === "srs" ? "" : "edu-btn--ghost"}`}
          onClick={() => setMode("srs")}
        >
          🧠 Давтах (SRS)
        </button>
        <button
          type="button"
          className={`edu-btn edu-btn--sm ${mode === "script" ? "" : "edu-btn--ghost"}`}
          onClick={() => setMode("script")}
        >
          ᠮ Монгол бичиг + Галиг
        </button>
      </div>
      {loading ? (
        <LoadingBlock height={420} />
      ) : error ? (
        <ErrorBlock message={error.message} onRetry={() => refetch()} />
      ) : !card ? (
        <ErrorBlock message="Карт алга" />
      ) : mode === "srs" ? (
        <SrsDeck cards={cards} />
      ) : (
        <>
          <section className="edu-glass edu-stage edu-rise">
            <div className="edu-between" style={{ width: "100%" }}>
              <span className="edu-tag">
                {index % open.length + 1} / {open.length} · Давтсан {learned.length}
              </span>
              <label className="edu-switch">
                <input type="checkbox" checked={galig} onChange={(e) => setGalig(e.target.checked)} />
                Галиг
              </label>
            </div>

            <button
              type="button"
              className={`edu-flip${flipped ? " edu-flip--back" : ""}`}
              onClick={() => setFlipped((f) => !f)}
              aria-label="Картыг эргүүлэх"
            >
              <div className="edu-flip__inner">
                <div className="edu-flip__face edu-flip__front">
                  <span style={{ fontSize: 36 }}>{card.emoji}</span>
                  <span className="edu-script" lang="mn-Mong">
                    {card.script}
                  </span>
                  {galig && <span className="edu-galig">{card.galig}</span>}
                  <span className="edu-muted" style={{ fontSize: 12 }}>
                    Дарж эргүүлнэ үү ↻
                  </span>
                </div>
                <div className="edu-flip__face edu-flip__back">
                  <span style={{ fontSize: 44 }}>{card.emoji}</span>
                  <span style={{ fontSize: 40, fontWeight: 900 }}>{card.cyrillic}</span>
                  <span className="edu-galig">{card.galig}</span>
                  <span style={{ opacity: 0.85 }}>{card.meaning}</span>
                  <span className="edu-script edu-script--sm" lang="mn-Mong">
                    {card.script}
                  </span>
                </div>
              </div>
            </button>

            <div className="edu-row" style={{ justifyContent: "center" }}>
              <button type="button" className="edu-btn edu-btn--ghost" onClick={() => go(-1)} aria-label="Өмнөх">
                ◀
              </button>
              <button type="button" className="edu-btn edu-btn--ghost" onClick={() => void speak(card.cyrillic)}>
                🔊 Сонсох
              </button>
              <button
                type="button"
                className="edu-btn edu-btn--mint"
                onClick={(e) => void markLearned(e.currentTarget)}
              >
                ✓ Мэдлээ
              </button>
              <button type="button" className="edu-btn edu-btn--ghost" onClick={() => go(1)} aria-label="Дараах">
                ▶
              </button>
            </div>
          </section>

          <div className="edu-between">
            <h2 className="edu-h2">Бүх карт</h2>
            {cards.some((c) => c.locked) && (
              <Link to={`${BASE}/shop`} className="edu-btn edu-btn--amber edu-btn--sm">
                🎴 Алтан картыг нээх
              </Link>
            )}
          </div>
          <div className="edu-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
            {cards.map((c) => {
              const openIndex = open.findIndex((o) => o.code === c.code);
              return (
                <button
                  key={c.code}
                  type="button"
                  className={`edu-glass edu-mini${c.locked ? " edu-mini--locked" : ""}${card.code === c.code ? " edu-mini--active" : ""}`}
                  disabled={c.locked}
                  onClick={() => {
                    setFlipped(false);
                    setIndex(openIndex);
                  }}
                  title={c.locked ? "Дэлгүүрээс нээнэ" : c.cyrillic}
                >
                  <span className="edu-script edu-script--sm" lang="mn-Mong">
                    {c.script}
                  </span>
                  <strong>
                    {c.locked ? "🔒 " : learned.includes(c.code) ? "✅ " : ""}
                    {c.cyrillic}
                  </strong>
                </button>
              );
            })}
          </div>
        </>
      )}
    </Shell>
  );
};
