import { useEffect, useMemo, useRef, useState } from "react";
import type { EducationLessonQuery } from "~/gql/graphql";
import { confettiFrom, shuffle, sound } from "../lib/fx";
import { useVoice } from "../lib/voice";
import { Waveform } from "./Waveform";

export type PlayItem = NonNullable<EducationLessonQuery["educationLesson"]>["items"][number];

const PUNCTUATION = /[.,!?;:"'«»()]/g;
const bare = (token: string) => token.replace(PUNCTUATION, "");

const useShake = () => {
  const ref = useRef<HTMLDivElement>(null);
  const shake = () => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("edu-shake");
    void el.offsetWidth; // restart the animation
    el.classList.add("edu-shake");
  };
  return { ref, shake };
};

/** Audio controls: normal and slow reading (Chimege or browser voice) with a live waveform. */
export const AudioPanel = ({ text, autoPlay = true }: { text: string; autoPlay?: boolean }) => {
  const voice = useVoice();
  const speakRef = useRef(voice.speak);
  speakRef.current = voice.speak;

  useEffect(() => {
    if (!autoPlay || !voice.ready) return undefined;
    const timer = window.setTimeout(() => void speakRef.current(text), 250);
    return () => window.clearTimeout(timer);
  }, [autoPlay, text, voice.ready]);

  return (
    <div className="education:flex education:flex-col education:items-center education:gap-2">
      <div className="edu-audio">
        <button
          type="button"
          className="edu-btn edu-btn--round"
          onClick={() => void voice.speak(text)}
          disabled={!voice.supported || voice.loading}
          aria-label="Сонсох"
        >
          {voice.loading ? "⏳" : "🔊"}
        </button>
        <Waveform active={voice.speaking} />
        <button
          type="button"
          className="edu-btn edu-btn--ghost edu-btn--sm"
          onClick={() => void voice.speak(text, true)}
          disabled={!voice.supported || voice.loading}
        >
          🐢 Удаан
        </button>
      </div>
      <span className="edu-muted" style={{ fontSize: 12 }}>
        {voice.voiceLabel}
      </span>
    </div>
  );
};

export const RuleCard = ({
  tone,
  title,
  rule,
  answer,
}: {
  tone: "good" | "bad" | "hint";
  title: string;
  rule: string;
  answer?: string;
}) => (
  <div className={`edu-rule edu-rule--${tone}`} role="status">
    <div className="edu-rule__icon">{tone === "good" ? "🎉" : tone === "bad" ? "💡" : "📌"}</div>
    <div className="education:flex education:flex-col education:gap-1">
      <strong>
        {tone === "good" ? "Гайхалтай! " : tone === "bad" ? "Бараг л болсон! " : ""}
        {title}
      </strong>
      {answer && (
        <span>
          Зөв бичлэг: <b style={{ color: "var(--edu-mint-d)" }}>{answer}</b>
        </span>
      )}
      {rule && <span className="edu-muted">{rule}</span>}
    </div>
  </div>
);

interface IItemProps {
  item: PlayItem;
  seed: number;
  onDone: (correct: boolean) => void;
  hint?: boolean;
}

/** "Сонсоод зөв үгийг сонго": fill the blank with the correctly spelled word. */
export const PickItem = ({ item, seed, onDone, hint = false }: IItemProps) => {
  const [chosen, setChosen] = useState<string | null>(null);
  const { ref, shake } = useShake();
  const options = useMemo(() => shuffle([item.target, ...item.wrongForms], seed), [item, seed]);
  const [before, after] = item.sentence.includes(item.target)
    ? [item.sentence.slice(0, item.sentence.indexOf(item.target)), item.sentence.slice(item.sentence.indexOf(item.target) + item.target.length)]
    : ["", ""];
  const correct = chosen === item.target;

  const choose = (option: string, element: HTMLElement) => {
    if (chosen) return;
    setChosen(option);
    if (option === item.target) {
      sound("good");
      confettiFrom(element);
    } else {
      sound("bad");
      shake();
    }
  };

  return (
    <div className="edu-stage edu-rise">
      <span className="edu-tag">Сонсоод зөв бичигдсэн үгийг сонго</span>
      <AudioPanel text={item.sentence} />
      {hint && <RuleCard tone="hint" title={`Санаарай: ${item.ruleTitle}`} rule={item.rule} />}
      <p className="edu-sentence">
        {before}
        <span className={`edu-blank${chosen ? (correct ? " edu-blank--filled" : "") : ""}`}>
          {chosen && correct ? item.target : " "}
        </span>
        {after}
      </p>
      <div ref={ref} className="edu-chips">
        {options.map((option) => {
          const state = !chosen
            ? ""
            : option === item.target
              ? " edu-chip--correct"
              : option === chosen
                ? " edu-chip--wrong"
                : " edu-chip--dim";
          return (
            <button
              key={option}
              type="button"
              className={`edu-chip${state}`}
              disabled={!!chosen}
              onClick={(event) => choose(option, event.currentTarget)}
            >
              {option}
            </button>
          );
        })}
      </div>
      {chosen && (
        <>
          <RuleCard
            tone={correct ? "good" : "bad"}
            title={item.ruleTitle}
            rule={item.rule}
            answer={correct ? undefined : item.target}
          />
          <button
            type="button"
            className={`edu-btn edu-btn--lg ${correct ? "edu-btn--mint" : "edu-btn--coral"}`}
            onClick={() => onDone(correct)}
            autoFocus
          >
            Үргэлжлүүлэх →
          </button>
        </>
      )}
    </div>
  );
};

const Circle = ({ tone }: { tone: "mint" | "coral" | "amber" }) => (
  <svg className={`edu-circle edu-circle--${tone}`} viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden>
    <ellipse cx="50" cy="25" rx="47" ry="21" transform="rotate(-3 50 25)" />
  </svg>
);

/** "Spot & circle the mistake": the sentence has one misspelled word to find. */
export const SpotItem = ({ item, onDone }: IItemProps) => {
  const wrong = item.wrongForms[0] ?? item.target;
  const tokens = useMemo(() => item.sentence.replace(item.target, wrong).split(" "), [item, wrong]);
  const wrongIndex = tokens.findIndex((token) => bare(token) === wrong);
  const [picked, setPicked] = useState<number | null>(null);
  const { ref, shake } = useShake();
  const correct = picked === wrongIndex;

  const pick = (index: number, element: HTMLElement) => {
    if (picked !== null) return;
    setPicked(index);
    if (index === wrongIndex) {
      sound("good");
      confettiFrom(element);
    } else {
      sound("bad");
      shake();
    }
  };

  return (
    <div className="edu-stage edu-rise">
      <span className="edu-tag edu-tag--coral">Сонсоод алдаатай үгийг дугуйл</span>
      <AudioPanel text={item.sentence} />
      <div ref={ref} className="edu-sentence">
        {tokens.map((token, index) => {
          const isWrong = index === wrongIndex;
          const revealed = picked !== null && isWrong;
          return (
            <span key={`${token}-${index}`}>
              <button
                type="button"
                className={`edu-word${picked !== null ? " edu-word--locked" : ""}`}
                style={{ border: 0, background: "none", font: "inherit", color: "inherit" }}
                onClick={(event) => pick(index, event.currentTarget)}
                disabled={picked !== null}
              >
                {revealed && <span className="edu-word__fix">{item.target}</span>}
                <span className={revealed ? "edu-word__old" : undefined}>{token}</span>
                {picked === index && <Circle tone={correct ? "mint" : "coral"} />}
                {picked !== null && !correct && isWrong && <Circle tone="amber" />}
              </button>{" "}
            </span>
          );
        })}
      </div>
      {picked !== null && (
        <>
          <RuleCard
            tone={correct ? "good" : "bad"}
            title={item.ruleTitle}
            rule={item.rule}
            answer={correct ? undefined : `${wrong} → ${item.target}`}
          />
          <button
            type="button"
            className={`edu-btn edu-btn--lg ${correct ? "edu-btn--mint" : "edu-btn--coral"}`}
            onClick={() => onDone(correct)}
            autoFocus
          >
            Үргэлжлүүлэх →
          </button>
        </>
      )}
    </div>
  );
};

export const ItemPlayer = (props: IItemProps) =>
  props.item.mode === "spot" ? <SpotItem {...props} /> : <PickItem {...props} />;

/**
 * Mistake Review Mode: every missed word comes back (with its rule shown first)
 * until it is answered correctly — the session ends at 100%.
 */
export const ReviewRun = ({
  items,
  onFinish,
}: {
  items: PlayItem[];
  onFinish: (mastered: string[]) => void;
}) => {
  const [queue, setQueue] = useState(() => items.map((_, i) => i));
  const [mastered, setMastered] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const current = queue[0];
  const item = current === undefined ? undefined : items[current];

  useEffect(() => {
    if (current === undefined) onFinish(mastered);
    // onFinish only once, when the queue empties.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (!item || current === undefined) return null;

  const done = (correct: boolean) => {
    setRound((r) => r + 1);
    if (correct) {
      setMastered((m) => [...m, item.target]);
      setQueue((q) => q.slice(1));
    } else {
      setQueue((q) => [...q.slice(1), current]);
    }
  };

  return (
    <div className="education:flex education:flex-col education:gap-4">
      <div className="edu-between">
        <span className="edu-tag edu-tag--amber">🔁 Алдаан дээрээ ажиллах</span>
        <span className="edu-muted" style={{ fontWeight: 700 }}>
          Бататгасан {mastered.length} / {items.length}
        </span>
      </div>
      <div className="edu-bar">
        <span style={{ width: `${(mastered.length / items.length) * 100}%` }} />
      </div>
      <div className="edu-glass">
        <PickItem
          key={`${current}-${round}`}
          item={{ ...item, mode: "pick" }}
          seed={round + 7}
          onDone={done}
          hint
        />
      </div>
    </div>
  );
};
