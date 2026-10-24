import { useMutation, useQuery } from "@apollo/client";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { IconLanguage } from "@tabler/icons-react";
import { BASE, EmptyBlock, ErrorBlock, LoadingBlock, Shell } from "../components/Shell";
import { HUNT_CHECK, HUNT_PASSAGES, LESSONS_QUERY, ME_QUERY } from "../graphql";
import { confetti, sound } from "../lib/fx";

const PUNCTUATION = /[.,!?;:"'«»()]/g;
const bare = (token: string) => token.replace(PUNCTUATION, "");

const Circle = ({ tone }: { tone: "mint" | "coral" | "amber" }) => (
  <svg className={`edu-circle edu-circle--${tone}`} viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden>
    <ellipse cx="50" cy="25" rx="47" ry="21" transform="rotate(-3 50 25)" />
  </svg>
);

/** Error hunt: circle every misspelled word, type its correction, get rule-by-rule feedback. */
const Hunt = ({ id }: { id: string }) => {
  const { data, loading, error, refetch } = useQuery(HUNT_PASSAGES);
  const [check, checked] = useMutation(HUNT_CHECK, { refetchQueries: ["educationMe"] });
  const [picks, setPicks] = useState<Record<string, string>>({});
  const passage = data?.educationHuntPassages.find((p) => p.id === id);
  const tokens = useMemo(() => passage?.text.split(" ") ?? [], [passage]);
  const result = checked.data?.educationHuntCheck;

  if (loading) return <LoadingBlock height={300} />;
  if (error) return <ErrorBlock message={error.message} onRetry={() => refetch()} />;
  if (!passage) return <EmptyBlock emoji="🔎" title="Эх олдсонгүй" />;

  const toggle = (word: string) => {
    if (result) return;
    setPicks((p) => {
      const next = { ...p };
      if (word in next) delete next[word];
      else next[word] = "";
      return next;
    });
  };

  const submit = async () => {
    const res = await check({
      variables: { id: passage.id, picks: Object.entries(picks).map(([word, correction]) => ({ word, correction })) },
    }).catch(() => null);
    const score = res?.data?.educationHuntCheck.score ?? 0;
    if (score === 100) {
      sound("win");
      confetti(undefined, 140);
    } else if (res) {
      sound(score >= 50 ? "good" : "bad");
    }
  };

  const verdict = (word: string) => {
    if (!result) return null;
    const e = result.errors.find((x) => x.wrong === word);
    if (e) return e.correctionOk ? "mint" : e.found ? "amber" : "amber";
    return result.falsePositives.includes(word.toLowerCase()) ? "coral" : null;
  };

  return (
    <>
      <div className="edu-row">
        <Link to={`${BASE}/language`} className="edu-btn edu-btn--ghost edu-btn--sm">
          ← Монгол хэл
        </Link>
        <span className="edu-tag edu-tag--coral">🔍 {passage.errorCount} алдаа нуугдсан</span>
      </div>

      <section className="edu-glass edu-stage edu-rise">
        <h1 className="edu-h1">{passage.title}</h1>
        <p className="edu-muted" style={{ margin: 0 }}>
          Алдаатай үг бүр дээр дарж дугуйл, доор нь зөв хэлбэрийг бич.
        </p>
        <div className="edu-sentence" style={{ fontSize: "clamp(18px, 2.6vw, 26px)" }}>
          {tokens.map((token, i) => {
            const word = bare(token);
            const picked = word in picks;
            const tone = verdict(word);
            const err = result?.errors.find((x) => x.wrong === word);
            return (
              <span key={`${token}-${i}`}>
                <button
                  type="button"
                  className={`edu-word${result ? " edu-word--locked" : ""}`}
                  style={{ border: 0, background: "none", font: "inherit", color: "inherit" }}
                  onClick={() => toggle(word)}
                  disabled={!!result}
                >
                  {err && <span className="edu-word__fix">{err.right}</span>}
                  <span className={err ? "edu-word__old" : undefined}>{token}</span>
                  {(tone || (picked && !result)) && <Circle tone={tone ?? "coral"} />}
                </button>{" "}
              </span>
            );
          })}
        </div>
      </section>

      {!result && (
        <section className="edu-glass education:flex education:flex-col education:gap-3">
          <h2 className="edu-h2">✏️ Засварууд ({Object.keys(picks).length})</h2>
          {Object.keys(picks).length === 0 && <p className="edu-muted">Эхлээд алдаатай гэж бодсон үгээ дээрээс дугуйл.</p>}
          {Object.entries(picks).map(([word, correction]) => (
            <div key={word} className="edu-row" style={{ flexWrap: "nowrap" }}>
              <span className="edu-diff-wrong" style={{ minWidth: 120 }}>
                {word}
              </span>
              →
              <input
                className="edu-input"
                placeholder="Зөв хэлбэр"
                value={correction}
                onChange={(e) => setPicks((p) => ({ ...p, [word]: e.target.value }))}
              />
            </div>
          ))}
          <button
            type="button"
            className="edu-btn edu-btn--mint"
            disabled={Object.keys(picks).length === 0 || checked.loading}
            onClick={() => void submit()}
          >
            {checked.loading ? "Шалгаж байна…" : "✓ Шалгах"}
          </button>
          {checked.error && <ErrorBlock message={checked.error.message} />}
        </section>
      )}

      {result && (
        <section className="edu-glass edu-rise education:flex education:flex-col education:gap-3">
          <div className="edu-row" style={{ gap: 18 }}>
            <div className="edu-score" style={{ ["--p" as string]: result.score, width: 120, height: 120 }}>
              <div style={{ width: 94, height: 94, fontSize: 26 }}>{result.score}%</div>
            </div>
            <div className="education:flex education:flex-col education:gap-1">
              <strong>
                Олсон {result.found}/{result.total} · Зөв зассан {result.fixed}/{result.total}
              </strong>
              {result.falsePositives.length > 0 && (
                <span className="edu-muted">Зөв үгийг алдаа гэж тэмдэглэсэн: {result.falsePositives.join(", ")}</span>
              )}
              <span className="edu-pill edu-pill--gem" style={{ alignSelf: "flex-start" }}>
                +{result.xpEarned} XP
              </span>
            </div>
          </div>
          {result.errors.map((e) => (
            <div key={e.wrong} className={`edu-rule edu-rule--${e.correctionOk ? "good" : "bad"}`}>
              <div className="edu-rule__icon">{e.correctionOk ? "✅" : e.found ? "✏️" : "🔍"}</div>
              <div className="education:flex education:flex-col education:gap-1">
                <span>
                  <span className="edu-diff-wrong">{e.wrong}</span> → <span className="edu-diff-right">{e.right}</span>{" "}
                  <span className="edu-tag edu-tag--amber">{e.ruleTitle}</span>
                </span>
                <span className="edu-muted">{e.explanationMn}</span>
              </div>
            </div>
          ))}
          <div className="edu-row">
            <button
              type="button"
              className="edu-btn edu-btn--ghost"
              onClick={() => {
                setPicks({});
                checked.reset();
              }}
            >
              Дахин оролдох
            </button>
            <Link to={`${BASE}/language`} className="edu-btn">
              Бусад дасгал
            </Link>
          </div>
        </section>
      )}
    </>
  );
};

const Hub = () => {
  const hunts = useQuery(HUNT_PASSAGES);
  const lessons = useQuery(LESSONS_QUERY);
  const me = useQuery(ME_QUERY);
  const mistakes = me.data?.educationMe.mistakes.length ?? 0;

  return (
    <>
      <section className="edu-glass edu-rise">
        <span className="edu-tag">Модуль B</span>
        <h1 className="edu-h1" style={{ marginTop: 8 }}>
          ✍️ Монгол хэл · Зөв бичих зүй
        </h1>
        <p className="edu-muted" style={{ margin: "6px 0 0" }}>
          Үгийн алдааг олж засах дасгалууд. Хариулт бүрийг Монгол хэлний толь бичгээр хатуу шалгаж, ямар дүрэм зөрчсөнийг тайлбарлана.
        </p>
      </section>

      <h2 className="edu-h2">🔍 Алдаа олох</h2>
      {hunts.loading ? (
        <LoadingBlock height={140} />
      ) : hunts.error ? (
        <ErrorBlock message={hunts.error.message} onRetry={() => hunts.refetch()} />
      ) : (
        <div className="edu-grid">
          {hunts.data?.educationHuntPassages.map((p) => (
            <article key={p.id} className="edu-glass edu-lesson edu-accent--coral">
              <div className="edu-between">
                <span className="edu-lesson__emoji">🔍</span>
                <span className="edu-tag edu-tag--coral">{p.level}</span>
              </div>
              <h3 className="edu-h2">{p.title}</h3>
              <p className="edu-muted" style={{ margin: 0, fontSize: 14 }}>
                {p.errorCount} алдаа нуугдсан эх
              </p>
              <Link to={`${BASE}/language/hunt/${p.id}`} className="edu-btn edu-btn--sm edu-btn--coral" style={{ marginTop: "auto", alignSelf: "flex-start" }}>
                ▶ Эхлэх
              </Link>
            </article>
          ))}
        </div>
      )}

      <h2 className="edu-h2">🎧 Цээж бичиг: зөв үгийг сонгох, алдааг дугуйлах</h2>
      {lessons.loading ? (
        <LoadingBlock height={140} />
      ) : lessons.error ? (
        <ErrorBlock message={lessons.error.message} onRetry={() => lessons.refetch()} />
      ) : (
        <div className="edu-grid">
          {lessons.data?.educationLessons.map((lesson) => (
            <article key={lesson._id} className={`edu-glass edu-lesson edu-accent--${lesson.color}`}>
              <div className="edu-between">
                <span className="edu-lesson__emoji">{lesson.emoji}</span>
                {lesson.bestScore !== null && lesson.bestScore !== undefined ? (
                  <span className={`edu-tag ${lesson.bestScore === 100 ? "edu-tag--mint" : ""}`}>
                    {lesson.bestScore === 100 ? "⭐ 100%" : `Шилдэг ${lesson.bestScore}%`}
                  </span>
                ) : (
                  <span className="edu-tag edu-tag--amber">Шинэ</span>
                )}
              </div>
              <h3 className="edu-h2">{lesson.title}</h3>
              <p className="edu-muted" style={{ margin: 0, fontSize: 14 }}>
                {lesson.description}
              </p>
              <div className="edu-between" style={{ marginTop: "auto" }}>
                <span className="edu-muted" style={{ fontSize: 13 }}>
                  {lesson.itemCount} өгүүлбэр{lesson.source === "gemma" ? " · ✨ Gemma" : ""}
                </span>
                <Link to={`${BASE}/dictation/${lesson._id}`} className="edu-btn edu-btn--sm">
                  ▶ Эхлэх
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="edu-grid">
        <Link to={`${BASE}/ai`} className="edu-glass edu-tile">
          <span className="edu-tile__icon" style={{ background: "#dcfaf0" }}>
            ✨
          </span>
          <span>
            <strong>Өөрийн текстээ шалгах</strong>
            <br />
            <span className="edu-muted" style={{ fontSize: 14 }}>
              Толь бичиг + Gemma 4, JSON тайлан
            </span>
          </span>
        </Link>
        <Link to={`${BASE}/review`} className="edu-glass edu-tile">
          <span className="edu-tile__icon" style={{ background: "#fff2d6" }}>
            🔁
          </span>
          <span>
            <strong>Алдаан дээрээ ажиллах</strong>
            <br />
            <span className="edu-muted" style={{ fontSize: 14 }}>
              {mistakes ? `${mistakes} үг давтах` : "Алдаа алга 🎉"}
            </span>
          </span>
        </Link>
      </div>
    </>
  );
};

export const LanguagePage = () => {
  const { huntId } = useParams();
  return (
    <Shell title="Монгол хэл" icon={IconLanguage}>
      {huntId ? <Hunt id={huntId} /> : <Hub />}
    </Shell>
  );
};
