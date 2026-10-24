import { useMutation, useQuery } from "@apollo/client";
import { useState, type ReactNode } from "react";
import { IconSparkles } from "@tabler/icons-react";
import { ErrorBlock, Shell } from "../components/Shell";
import { AI_CHECK, STATUS_QUERY } from "../graphql";
import { confetti, sound } from "../lib/fx";

const SAMPLE =
  "Би өчгөдөр сургуулдаа явсан. Багш шинэ дүрмыг тайлбарлаж, бид амтай хоол идсэн. Энэ асуудалтайй байны.";

/** Highlights each corrected word in the corrected text. */
const highlight = (text: string, issues: { wrong: string; right: string }[]): ReactNode[] => {
  const rights = issues.map((i) => i.right).filter(Boolean);
  if (rights.length === 0) return [text];
  const escaped = rights.map((r) => r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return text.split(new RegExp(`(${escaped.join("|")})`, "g")).map((part, i) =>
    rights.includes(part) ? (
      <mark key={i} className="edu-diff-right">
        {part}
      </mark>
    ) : (
      part
    ),
  );
};

export const AiPage = () => {
  const status = useQuery(STATUS_QUERY);
  const [check, { data, loading, error, reset }] = useMutation(AI_CHECK, { refetchQueries: ["educationMe"] });
  const [text, setText] = useState("");
  const result = data?.educationAiCheck;
  const ai = status.data?.educationStatus;

  const run = async () => {
    const res = await check({ variables: { text } }).catch(() => null);
    const issues = res?.data?.educationAiCheck.issues.length ?? -1;
    if (issues === 0) {
      sound("win");
      confetti(undefined, 100);
    } else if (issues > 0) {
      sound("good");
    }
  };

  return (
    <Shell title="AI туслах" icon={IconSparkles}>
      <section className="edu-glass edu-rise education:flex education:flex-col education:gap-4">
        <div className="edu-between">
          <div>
            <h1 className="edu-h1">✨ AI редактор</h1>
            <p className="edu-muted" style={{ margin: "6px 0 0" }}>
              Өөрөө бич — үг бүрийг Монгол хэлний толь бичгээр хатуу шалгаж, Gemma 4 дүрмийг тайлбарлана. Бичих нь чиний ажил!
            </p>
          </div>
          {ai && (
            <span className={`edu-tag ${ai.aiEnabled ? "edu-tag--mint" : "edu-tag--amber"}`}>
              {ai.aiEnabled ? `Хатуу горим · Толь бичиг + Gemma 4` : "Хатуу горим · Толь бичиг (Gemma унтраалттай)"}
            </span>
          )}
        </div>
        <textarea
          className="edu-textarea"
          placeholder="Энд өгүүлбэр, эсээгээ бичнэ үү…"
          value={text}
          maxLength={2000}
          onChange={(e) => {
            setText(e.target.value);
            if (result) reset();
          }}
        />
        <div className="edu-between">
          <button type="button" className="edu-btn edu-btn--ghost edu-btn--sm" onClick={() => setText(SAMPLE)}>
            Жишээ текст
          </button>
          <div className="edu-row">
            <span className="edu-muted" style={{ fontSize: 13 }}>
              {text.length}/2000
            </span>
            <button
              type="button"
              className="edu-btn edu-btn--mint"
              disabled={!text.trim() || loading}
              onClick={() => void run()}
            >
              {loading ? "Шалгаж байна…" : "✓ Шалгах"}
            </button>
          </div>
        </div>
      </section>

      {loading && <div className="edu-skel" style={{ height: 160 }} role="status" />}
      {error && <ErrorBlock message={error.message} onRetry={() => void run()} />}

      {result && !loading && (
        <section className="edu-glass edu-rise education:flex education:flex-col education:gap-4">
          <div className="edu-between">
            <h2 className="edu-h2">
              {result.issues.length === 0 ? "🎉 Алдаагүй бичжээ!" : `💡 ${result.issues.length} алдаа олдлоо`}
              <span className="edu-muted" style={{ fontSize: 13, fontWeight: 600 }}>
                {" "}· {result.words.length} үг толь бичгээр шалгагдав
              </span>
            </h2>
            <div className="edu-row">
              <span className="edu-tag">{result.source === "gemma" ? "📖 Толь бичиг + Gemma 4" : "📖 Толь бичиг (Hunspell)"}</span>
              <span className="edu-pill edu-pill--gem">+{result.xpEarned} XP</span>
            </div>
          </div>
          <p className="edu-sentence" style={{ fontSize: 20, lineHeight: 1.7, margin: 0 }}>
            {highlight(result.corrected, result.issues)}
          </p>
          <div className="edu-row" style={{ gap: 6 }}>
            {result.words.map((w, i) => (
              <span
                key={`${w.originalWord}-${i}`}
                className={`edu-tag ${w.isCorrect ? "edu-tag--mint" : "edu-tag--coral"}`}
                title={w.explanationMn}
              >
                {w.isCorrect ? "✓" : "✗"} {w.originalWord}
              </span>
            ))}
          </div>
          {result.words
            .filter((w) => !w.isCorrect)
            .map((w, i) => (
              <div key={`${w.originalWord}-${i}`} className="edu-rule edu-rule--bad">
                <div className="edu-rule__icon">✏️</div>
                <div className="education:flex education:flex-col education:gap-1">
                  <span>
                    <span className="edu-diff-wrong">{w.originalWord}</span> →{" "}
                    <span className="edu-diff-right">{w.correctedWord || "?"}</span>{" "}
                    <span className="edu-tag edu-tag--amber">{w.errorType}</span>
                  </span>
                  {w.explanationMn && <span className="edu-muted">{w.explanationMn}</span>}
                  {w.suggestions.length > 1 && (
                    <span className="edu-muted" style={{ fontSize: 12 }}>
                      Толь бичгийн санал: {w.suggestions.join(", ")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          <details>
            <summary className="edu-muted" style={{ cursor: "pointer", fontWeight: 700 }}>
                {"{ }"} JSON тайлан (original_word, is_correct, corrected_word, error_type, explanation_mn)
            </summary>
            <pre
              style={{
                marginTop: 8,
                maxHeight: 320,
                overflow: "auto",
                background: "var(--edu-line)",
                borderRadius: 14,
                padding: 12,
                fontSize: 12,
              }}
            >
              {result.reportJson}
            </pre>
          </details>
          {result.tip && (
            <div className="edu-rule edu-rule--good">
              <div className="edu-rule__icon">🌟</div>
              <span>{result.tip}</span>
            </div>
          )}
        </section>
      )}
    </Shell>
  );
};
