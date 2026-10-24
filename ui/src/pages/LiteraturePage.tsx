import { useMutation, useQuery } from "@apollo/client";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { IconFeather } from "@tabler/icons-react";
import { BASE, EmptyBlock, ErrorBlock, LoadingBlock, Shell } from "../components/Shell";
import { LITERATURE_ANSWER, LITERATURE_LIST, LITERATURE_ONE } from "../graphql";
import { confetti, sound } from "../lib/fx";
import { useVoice } from "../lib/voice";

const scoreTone = (score: number) => (score >= 80 ? "mint" : score >= 50 ? "amber" : "coral");

const List = () => {
  const { data, loading, error, refetch } = useQuery(LITERATURE_LIST);
  if (loading) return <LoadingBlock height={240} />;
  if (error || !data) return <ErrorBlock message={error?.message ?? "No data"} onRetry={() => refetch()} />;
  const works = data.educationLiteratureList;

  return (
    <>
      <section className="edu-glass edu-rise">
        <h1 className="edu-h1">📚 Уран зохиол & ЭЕШ</h1>
        <p className="edu-muted" style={{ margin: "6px 0 0" }}>
          Эхийг уншаад гол санааг <b>өөрийн үгээр</b> бич. Утгын тохирол (0–100%) ба зөв бичгийг шууд үнэлнэ.
        </p>
      </section>
      {works.length === 0 ? (
        <EmptyBlock emoji="📭" title="Зохиол алга. Багш «Багшийн самбар»-аас нэмнэ." />
      ) : (
        <div className="edu-grid">
          {works.map((work) => (
            <Link key={work._id} to={`${BASE}/literature/${work._id}`} className="edu-glass edu-lesson edu-accent--indigo" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="edu-between">
                <span className="edu-lesson__emoji">{work.source === "seed" ? "📜" : "🖋️"}</span>
                {work.genre && <span className="edu-tag">{work.genre}</span>}
              </div>
              <h3 className="edu-h2">{work.title}</h3>
              <span className="edu-muted" style={{ fontSize: 14 }}>
                {work.author}
              </span>
              <p className="edu-muted" style={{ margin: 0, fontSize: 13, whiteSpace: "pre-line", maxHeight: 54, overflow: "hidden" }}>
                {work.excerpt}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
};

const Work = ({ id }: { id: string }) => {
  const { data, loading, error, refetch } = useQuery(LITERATURE_ONE, { variables: { _id: id } });
  const [grade, graded] = useMutation(LITERATURE_ANSWER, { refetchQueries: ["educationMe"] });
  const voice = useVoice();
  const [summary, setSummary] = useState("");

  if (loading) return <LoadingBlock height={360} />;
  if (error) return <ErrorBlock message={error.message} onRetry={() => refetch()} />;
  const work = data?.educationLiterature;
  if (!work) return <EmptyBlock emoji="🔎" title="Зохиол олдсонгүй" />;
  const result = graded.data?.educationLiteratureAnswer;

  const submit = async () => {
    const res = await grade({ variables: { _id: work._id, summary } }).catch(() => null);
    const score = res?.data?.educationLiteratureAnswer.score ?? 0;
    if (score >= 80) {
      sound("win");
      confetti(undefined, 120);
    } else if (res) {
      sound("good");
    }
  };

  return (
    <>
      <div className="edu-row">
        <Link to={`${BASE}/literature`} className="edu-btn edu-btn--ghost edu-btn--sm">
          ← Бүх зохиол
        </Link>
      </div>
      <div className="education:grid education:gap-4 education:lg:grid-cols-2">
        <section className="edu-glass edu-rise education:flex education:flex-col education:gap-3">
          <div className="edu-between">
            <div>
              <h1 className="edu-h1">{work.title}</h1>
              <span className="edu-muted">
                {work.author}
                {work.genre ? ` · ${work.genre}` : ""}
              </span>
            </div>
            <div className="edu-row">
              <button
                type="button"
                className="edu-btn edu-btn--ghost edu-btn--sm"
                onClick={() => void voice.speakAll(work.excerpt.split("\n"))}
                disabled={voice.loading}
                title="Заавал биш"
              >
                {voice.loading ? "⏳" : "🔊"} Сонсох
              </button>
              {voice.speaking && (
                <button type="button" className="edu-btn edu-btn--ghost edu-btn--sm" onClick={voice.stop}>
                  ⏹
                </button>
              )}
            </div>
          </div>
          <blockquote
            style={{
              margin: 0,
              padding: "18px 20px",
              borderLeft: "5px solid var(--edu-indigo)",
              borderRadius: 16,
              background: "color-mix(in srgb, var(--edu-indigo) 6%, transparent)",
              whiteSpace: "pre-line",
              fontSize: 18,
              lineHeight: 1.8,
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}
          >
            {work.excerpt}
          </blockquote>
        </section>

        <section className="edu-glass edu-rise education:flex education:flex-col education:gap-3">
          <h2 className="edu-h2">✍️ Гол санааг өөрийн үгээр бич</h2>
          <textarea
            className="edu-textarea"
            placeholder="Энэ зохиол юуны тухай вэ? Зохиолч ямар санаа илэрхийлсэн бэ?"
            value={summary}
            maxLength={3000}
            onChange={(e) => {
              setSummary(e.target.value);
              if (result) graded.reset();
            }}
          />
          <div className="edu-between">
            <span className="edu-muted" style={{ fontSize: 13 }}>
              {summary.trim().split(/\s+/).filter(Boolean).length} үг
            </span>
            <button
              type="button"
              className="edu-btn edu-btn--mint"
              disabled={summary.trim().length < 10 || graded.loading}
              onClick={() => void submit()}
            >
              {graded.loading ? "Үнэлж байна…" : "✓ Үнэлүүлэх"}
            </button>
          </div>
          {graded.error && <ErrorBlock message={graded.error.message} />}
          {graded.loading && <div className="edu-skel" style={{ height: 140 }} role="status" />}

          {result && !graded.loading && (
            <div className="education:flex education:flex-col education:gap-3 edu-rise">
              <div className="edu-row" style={{ alignItems: "center", gap: 18 }}>
                <div
                  className="edu-score"
                  style={{
                    ["--p" as string]: result.score,
                    width: 120,
                    height: 120,
                    background: `conic-gradient(var(--edu-${scoreTone(result.score)}) calc(var(--p) * 1%), var(--edu-line) 0)`,
                  }}
                >
                  <div style={{ width: 94, height: 94, fontSize: 26 }}>{result.score}%</div>
                </div>
                <div className="education:flex education:flex-col education:gap-1">
                  <strong>Утгын тохирол</strong>
                  <span className="edu-muted" style={{ fontSize: 14 }}>
                    {result.feedbackMn}
                  </span>
                  <span className="edu-row" style={{ gap: 6 }}>
                    <span className="edu-tag">{result.source === "gemma" ? "Gemma 4" : "Офлайн үнэлгээ"}</span>
                    <span className="edu-pill edu-pill--gem" style={{ padding: "2px 10px", fontSize: 12 }}>
                      +{result.xpEarned} XP
                    </span>
                  </span>
                </div>
              </div>

              {result.matchedPoints.map((p) => (
                <div key={`m-${p}`} className="edu-rule edu-rule--good" style={{ padding: "10px 14px" }}>
                  <div>✅</div>
                  <span>{p}</span>
                </div>
              ))}
              {result.missedPoints.map((p) => (
                <div key={`x-${p}`} className="edu-rule edu-rule--bad" style={{ padding: "10px 14px" }}>
                  <div>⭕</div>
                  <span>
                    <b>Орхигдсон:</b> {p}
                  </span>
                </div>
              ))}
              {result.deviations.map((d) => (
                <div key={`d-${d}`} className="edu-rule edu-rule--hint" style={{ padding: "10px 14px" }}>
                  <div>⚠️</div>
                  <span>
                    <b>Сэдвээс хазайсан:</b> {d}
                  </span>
                </div>
              ))}

              <div className="edu-rule edu-rule--hint">
                <div className="edu-rule__icon">📖</div>
                <div className="education:flex education:flex-col">
                  <strong>Жишиг утга</strong>
                  <span>{result.theme}</span>
                </div>
              </div>

              <div className="edu-glass" style={{ padding: 14 }}>
                <strong>
                  {result.spelling.length === 0 ? "✅ Зөв бичгийн алдаагүй" : `✏️ Зөв бичгийн ${result.spelling.length} алдаа`}
                </strong>
                {result.spelling.map((w, i) => (
                  <div key={`${w.originalWord}-${i}`} style={{ marginTop: 8, fontSize: 14 }}>
                    <span className="edu-diff-wrong">{w.originalWord}</span> →{" "}
                    <span className="edu-diff-right">{w.correctedWord || "?"}</span>{" "}
                    <span className="edu-tag edu-tag--amber">{w.errorType}</span>
                    <br />
                    <span className="edu-muted">{w.explanationMn}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export const LiteraturePage = () => {
  const { workId } = useParams();
  return (
    <Shell title="Уран зохиол & ЭЕШ" icon={IconFeather}>
      {workId ? <Work id={workId} /> : <List />}
    </Shell>
  );
};
