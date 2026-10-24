import { useMutation, useQuery } from "@apollo/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { IconAlphabetCyrillic } from "@tabler/icons-react";
import type { EducationCardsQuery } from "~/gql/graphql";
import { BASE, EmptyBlock, ErrorBlock, LoadingBlock, Shell } from "../components/Shell";
import { CARDS_QUERY, SCRIPT_ANSWER } from "../graphql";
import { confettiFrom, shuffle, sound } from "../lib/fx";
import { useVoice } from "../lib/voice";

type Word = EducationCardsQuery["educationCards"][number];
type Mode = "choice" | "typing";

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

// A believable misspelling of the right answer, so the choice tests spelling, not just recognition.
const NEAR_MISSES: [RegExp, string][] = [
  [/ь/g, ""],
  [/уу/g, "у"],
  [/аа/g, "а"],
  [/ээ/g, "э"],
  [/үү/g, "ү"],
  [/э/g, "а"],
  [/г/g, "гг"],
  [/н$/g, ""],
];

const nearMiss = (word: string) => {
  for (const [pattern, replacement] of NEAR_MISSES) {
    const variant = word.replace(pattern, replacement);
    if (variant !== word && variant.length > 1) return variant;
  }
  return `${word}ь`;
};

const optionsFor = (word: Word, all: Word[], seed: number) => {
  const others = shuffle(
    all.filter((w) => w.code !== word.code).map((w) => w.cyrillic),
    seed,
  ).slice(0, 2);
  return shuffle([word.cyrillic, nearMiss(word.cyrillic), ...others], seed + 1).slice(0, 4);
};

const useShake = () => {
  const ref = useRef<HTMLDivElement>(null);
  const shake = () => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("edu-shake");
    void el.offsetWidth;
    el.classList.add("edu-shake");
  };
  return { ref, shake };
};

const ScriptTask = ({
  word,
  all,
  mode,
  showGalig,
  seed,
  onDone,
}: {
  word: Word;
  all: Word[];
  mode: Mode;
  showGalig: boolean;
  seed: number;
  onDone: (correct: boolean) => void;
}) => {
  const [answer, { data, loading, error }] = useMutation(SCRIPT_ANSWER, { refetchQueries: ["educationMe"] });
  const voice = useVoice();
  const { ref, shake } = useShake();
  const [typed, setTyped] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const options = useMemo(() => optionsFor(word, all, seed), [word, all, seed]);
  const result = data?.educationScriptAnswer;

  const submit = async (value: string, element: HTMLElement | null) => {
    if (result || loading || !value.trim()) return;
    setChosen(value);
    const res = await answer({ variables: { code: word.code, answer: value, mode } }).catch(() => null);
    const ok = res?.data?.educationScriptAnswer.isCorrect;
    if (ok) {
      sound("good");
      confettiFrom(element);
    } else if (res) {
      sound("bad");
      shake();
    }
  };

  return (
    <div className="edu-stage edu-rise">
      <span className={`edu-tag ${mode === "choice" ? "" : "edu-tag--mint"}`}>
        {mode === "choice" ? "А · Монгол бичгийг кирилл үгтэй тааруул" : "Б · Монгол бичгийг кириллээр бич"}
      </span>

      <div className="edu-glass education:flex education:items-center education:gap-6" style={{ padding: "24px 36px" }}>
        <span className="edu-script" lang="mn-Mong" style={{ fontSize: 80 }}>
          {word.script}
        </span>
        <div className="education:flex education:flex-col education:items-start education:gap-2">
          {showGalig && (
            <>
              <span className="edu-muted" style={{ fontSize: 12, fontWeight: 700 }}>
                ГАЛИГ
              </span>
              <span className="edu-galig" style={{ fontSize: 26 }}>
                {word.galig}
              </span>
            </>
          )}
          <button type="button" className="edu-btn edu-btn--ghost edu-btn--sm" onClick={() => setHint(true)} disabled={hint}>
            💡 {hint ? `${word.emoji} ${word.meaningMn || word.meaning}` : "Санамж"}
          </button>
        </div>
      </div>

      <div ref={ref} className="education:flex education:flex-col education:items-center education:gap-4" style={{ width: "100%" }}>
        {mode === "choice" ? (
          <div className="edu-chips">
            {options.map((option) => {
              const state = !result
                ? ""
                : option === result.correctWord
                  ? " edu-chip--correct"
                  : option === chosen
                    ? " edu-chip--wrong"
                    : " edu-chip--dim";
              return (
                <button
                  key={option}
                  type="button"
                  className={`edu-chip${state}`}
                  disabled={!!result || loading}
                  onClick={(e) => void submit(option, e.currentTarget)}
                >
                  {option}
                </button>
              );
            })}
          </div>
        ) : (
          <form
            className="edu-row"
            style={{ justifyContent: "center" }}
            onSubmit={(e) => {
              e.preventDefault();
              void submit(typed, e.currentTarget);
            }}
          >
            <input
              className="edu-input"
              style={{ width: 260, textAlign: "center", fontSize: 22, fontWeight: 800 }}
              placeholder="Кирилл үг…"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={!!result}
              autoFocus
            />
            <button type="submit" className="edu-btn edu-btn--mint" disabled={!!result || loading || !typed.trim()}>
              {loading ? "…" : "✓ Шалгах"}
            </button>
          </form>
        )}
      </div>

      {error && <ErrorBlock message={error.message} />}

      {result && (
        <>
          <div className={`edu-rule edu-rule--${result.isCorrect ? "good" : "bad"}`}>
            <div className="edu-rule__icon">{result.isCorrect ? "🎉" : "✏️"}</div>
            <div className="education:flex education:flex-col education:gap-1">
              <strong>
                {result.isCorrect ? "Зөв! " : "Буруу. "}
                <span style={{ fontSize: 20 }}>{result.correctWord}</span>{" "}
                <span className="edu-pill edu-pill--gem" style={{ padding: "2px 10px", fontSize: 12 }}>
                  +{result.xpEarned} XP
                </span>
              </strong>
              {!result.isCorrect && (
                <span>
                  <span className="edu-diff-wrong">{result.check.originalWord}</span> →{" "}
                  <span className="edu-diff-right">{result.check.correctedWord}</span>{" "}
                  <span className="edu-tag edu-tag--coral">{result.check.errorType}</span>
                  <br />
                  <span className="edu-muted">{result.check.explanationMn}</span>
                </span>
              )}
            </div>
          </div>
          {result.galigNote && (
            <div className="edu-rule edu-rule--hint">
              <div className="edu-rule__icon">🔁</div>
              <div className="education:flex education:flex-col education:gap-1">
                <strong>Галиг → кирилл хувирал</strong>
                <span>{result.galigNote}</span>
                {word.rule && <span className="edu-muted">📌 {word.rule}</span>}
              </div>
            </div>
          )}
          <div className="edu-row" style={{ justifyContent: "center" }}>
            <button type="button" className="edu-btn edu-btn--ghost edu-btn--sm" onClick={() => void voice.speak(result.correctWord)}>
              🔊 Сонсох (заавал биш)
            </button>
            <button
              type="button"
              className={`edu-btn edu-btn--lg ${result.isCorrect ? "edu-btn--mint" : "edu-btn--coral"}`}
              onClick={() => onDone(result.isCorrect)}
              autoFocus
            >
              Дараах →
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export const CardsPage = () => {
  useMongolianFont();
  const { data, loading, error, refetch } = useQuery(CARDS_QUERY);
  const [mode, setMode] = useState<Mode>("choice");
  const [showGalig, setShowGalig] = useState(true);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState({ right: 0, total: 0, streak: 0 });

  const all = data?.educationCards ?? [];
  const open = useMemo(() => all.filter((w) => !w.locked), [all]);
  const order = useMemo(() => shuffle(open, open.length + 11), [open]);
  const locked = all.length - open.length;
  const word = order.length ? order[round % order.length] : undefined;

  const done = (correct: boolean) => {
    setScore((s) => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1, streak: correct ? s.streak + 1 : 0 }));
    setRound((r) => r + 1);
  };

  return (
    <Shell title="Монгол бичиг · Галиг" icon={IconAlphabetCyrillic}>
      <div className="edu-between">
        <div className="edu-row">
          <button
            type="button"
            className={`edu-btn edu-btn--sm ${mode === "choice" ? "" : "edu-btn--ghost"}`}
            onClick={() => setMode("choice")}
          >
            А · 4 сонголт
          </button>
          <button
            type="button"
            className={`edu-btn edu-btn--sm ${mode === "typing" ? "edu-btn--mint" : "edu-btn--ghost"}`}
            onClick={() => setMode("typing")}
          >
            Б · Бичих
          </button>
          <label className="edu-switch">
            <input type="checkbox" checked={showGalig} onChange={(e) => setShowGalig(e.target.checked)} />
            Галиг
          </label>
        </div>
        <div className="edu-row">
          <span className="edu-pill edu-pill--mint">
            ✓ {score.right}/{score.total}
          </span>
          <span className="edu-pill edu-pill--fire">🔥 {score.streak} дараалан</span>
        </div>
      </div>

      {loading ? (
        <LoadingBlock height={420} />
      ) : error ? (
        <ErrorBlock message={error.message} onRetry={() => refetch()} />
      ) : !word ? (
        <EmptyBlock emoji="📭" title="Үг алга" />
      ) : (
        <section className="edu-glass">
          <ScriptTask
            key={`${word.code}-${round}-${mode}`}
            word={word}
            all={open}
            mode={mode}
            showGalig={showGalig}
            seed={round + 5}
            onDone={done}
          />
        </section>
      )}

      {locked > 0 && (
        <div className="edu-glass edu-between">
          <span>
            🎴 <b>{locked}</b> тусгай үг (Чингис, Хаан, Эх орон …) түгжээтэй байна.
          </span>
          <Link to={`${BASE}/shop`} className="edu-btn edu-btn--amber edu-btn--sm">
            Алтан картаар нээх
          </Link>
        </div>
      )}
    </Shell>
  );
};
