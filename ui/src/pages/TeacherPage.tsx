import { useMutation, useQuery } from "@apollo/client";
import { useState } from "react";
import { IconChalkboard } from "@tabler/icons-react";
import { toast } from "erxes-ui";
import { EmptyBlock, ErrorBlock, LoadingBlock, Shell } from "../components/Shell";
import {
  CLASS_QUERY,
  LESSONS_QUERY,
  LESSON_ADD,
  LESSON_GENERATE,
  LESSON_REMOVE,
  LITERATURE_ADD,
  LITERATURE_LIST,
  LITERATURE_REMOVE,
  LITERATURE_SUGGEST,
  ME_QUERY,
  STATUS_QUERY,
} from "../graphql";
import { confetti } from "../lib/fx";

const REFRESH = ["educationLessons", "educationClassOverview"];

const Stat = ({ emoji, label, value }: { emoji: string; label: string; value: string | number }) => (
  <div className="edu-glass edu-tile" style={{ padding: 16 }}>
    <span className="edu-tile__icon" style={{ background: "#ece9ff" }}>
      {emoji}
    </span>
    <span>
      <span className="edu-muted" style={{ fontSize: 13 }}>
        {label}
      </span>
      <br />
      <strong style={{ fontSize: 22 }}>{value}</strong>
    </span>
  </div>
);

const ClassView = () => {
  const { data, loading, error, refetch } = useQuery(CLASS_QUERY);
  if (loading) return <LoadingBlock height={280} />;
  if (error || !data) return <ErrorBlock message={error?.message ?? "No data"} onRetry={() => refetch()} />;
  const overview = data.educationClassOverview;
  const maxMistake = Math.max(1, ...overview.topMistakes.map((m) => m.total));

  return (
    <>
      <div className="edu-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        <Stat emoji="👩‍🎓" label="Сурагчид" value={overview.studentCount} />
        <Stat emoji="🔥" label="Өнөөдөр идэвхтэй" value={overview.activeToday} />
        <Stat emoji="📚" label="Дуусгасан хичээл" value={overview.lessonsCompleted} />
        <Stat emoji="🎯" label="Ангийн нарийвчлал" value={overview.accuracy === null || overview.accuracy === undefined ? "–" : `${overview.accuracy}%`} />
      </div>

      <div className="education:grid education:gap-4 education:lg:grid-cols-[1fr_380px]">
        <section className="edu-glass">
          <h2 className="edu-h2" style={{ marginBottom: 12 }}>
            Сурагчдын ахиц
          </h2>
          {overview.students.length === 0 ? (
            <p className="edu-muted">Сурагч дасгал хийж эхлэхэд энд харагдана.</p>
          ) : (
            <div className="edu-table-wrap">
              <table className="edu-table">
                <thead>
                  <tr>
                    <th>Сурагч</th>
                    <th>Түвшин</th>
                    <th>Streak</th>
                    <th>Нарийвчлал</th>
                    <th>Хичээл</th>
                    <th>Алдаа</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.students.map((s) => (
                    <tr key={s.userId}>
                      <td>
                        <span className="edu-row" style={{ gap: 8, flexWrap: "nowrap" }}>
                          <span style={{ fontSize: 22 }}>{s.avatar}</span>
                          <span>
                            <strong>{s.name}</strong>
                            {s.activeToday && <span title="Өнөөдөр идэвхтэй"> 🟢</span>}
                            <br />
                            <span className="edu-muted" style={{ fontSize: 12 }}>
                              {s.email}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td>
                        ⭐ {s.level} <span className="edu-muted">({s.xp} XP)</span>
                      </td>
                      <td>🔥 {s.streak}</td>
                      <td>{s.accuracy === null || s.accuracy === undefined ? "–" : `${s.accuracy}%`}</td>
                      <td>{s.lessonsCompleted}</td>
                      <td>
                        {s.mistakeCount > 0 ? <span className="edu-tag edu-tag--coral">{s.mistakeCount}</span> : "✅"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="edu-glass education:flex education:flex-col education:gap-3">
          <h2 className="edu-h2">Ангийн хамгийн их алддаг үгс</h2>
          {overview.topMistakes.length === 0 ? (
            <p className="edu-muted">Алдаа бүртгэгдээгүй байна.</p>
          ) : (
            overview.topMistakes.map((m) => (
              <div key={m.word} className="edu-hbar" title={m.rule}>
                <strong>{m.word}</strong>
                <div className="edu-hbar__track">
                  <div className="edu-hbar__fill" style={{ width: `${(m.total / maxMistake) * 100}%` }} />
                </div>
                <span className="edu-muted">{m.total}×</span>
              </div>
            ))
          )}
          {overview.topMistakes[0] && (
            <div className="edu-rule edu-rule--hint">
              <div className="edu-rule__icon">💡</div>
              <span>
                Дараагийн хичээлд «{overview.topMistakes[0].ruleTitle || overview.topMistakes[0].word}» дүрмийг
                давтахыг зөвлөж байна.
              </span>
            </div>
          )}
        </section>
      </div>
    </>
  );
};

// Manual lesson format: one sentence per line —  mode | sentence | correct word | wrong1, wrong2 | rule
const parseLines = (raw: string) =>
  raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [mode = "pick", sentence = "", target = "", wrong = "", rule = ""] = line.split("|").map((p) => p.trim());
      return {
        mode: mode === "spot" ? "spot" : "pick",
        sentence,
        target,
        wrongForms: wrong.split(",").map((w) => w.trim()).filter(Boolean),
        ruleTitle: rule.split(":")[0]?.trim() ?? "",
        rule,
      };
    });

const LessonsAdmin = () => {
  const status = useQuery(STATUS_QUERY);
  const lessons = useQuery(LESSONS_QUERY);
  const [generate, genState] = useMutation(LESSON_GENERATE, { refetchQueries: REFRESH });
  const [add, addState] = useMutation(LESSON_ADD, { refetchQueries: REFRESH });
  const [remove] = useMutation(LESSON_REMOVE, { refetchQueries: REFRESH });
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(6);
  const [title, setTitle] = useState("");
  const [lines, setLines] = useState("");
  const aiOn = status.data?.educationStatus.aiEnabled ?? false;

  const runGenerate = async () => {
    try {
      const res = await generate({ variables: { topic, count } });
      confetti(undefined, 90);
      toast({ title: "✨ Gemma шинэ хичээл бэлдлээ", description: res.data?.educationLessonGenerate.title });
      setTopic("");
    } catch (e) {
      toast({ title: "Үүсгэж чадсангүй", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const runAdd = async () => {
    try {
      await add({ variables: { title, items: parseLines(lines) } });
      toast({ title: "Хичээл нэмэгдлээ", description: title });
      setTitle("");
      setLines("");
    } catch (e) {
      toast({ title: "Нэмж чадсангүй", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  return (
    <div className="education:grid education:gap-4 education:lg:grid-cols-2">
      <section className="edu-glass education:flex education:flex-col education:gap-3">
        <div className="edu-between">
          <h2 className="edu-h2">✨ Gemma 4-өөр цээж бичиг үүсгэх</h2>
          <span className={`edu-tag ${aiOn ? "edu-tag--mint" : "edu-tag--amber"}`}>{aiOn ? "Идэвхтэй" : "API key хэрэгтэй"}</span>
        </div>
        <input
          className="edu-input"
          placeholder="Сэдэв: жишээ нь «Эгшиг зохицох ёс», «Намрын байгаль»"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <div className="edu-between">
          <label className="edu-row" style={{ gap: 8 }}>
            Өгүүлбэр:
            <input
              className="edu-input"
              style={{ width: 80 }}
              type="number"
              min={2}
              max={12}
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 6)}
            />
          </label>
          <button
            type="button"
            className="edu-btn edu-btn--amber"
            disabled={!aiOn || !topic.trim() || genState.loading}
            onClick={() => void runGenerate()}
          >
            {genState.loading ? "Gemma бодож байна…" : "✨ Үүсгэх"}
          </button>
        </div>
        {!aiOn && (
          <p className="edu-muted" style={{ fontSize: 13, margin: 0 }}>
            Plugin-ий <code>.env</code> файлд <code>GEMINI_API_KEY</code> нэмээд API-г дахин эхлүүлнэ үү.
          </p>
        )}

        <h2 className="edu-h2" style={{ marginTop: 12 }}>
          Хичээлүүд
        </h2>
        {lessons.loading ? (
          <LoadingBlock height={120} />
        ) : lessons.error ? (
          <ErrorBlock message={lessons.error.message} onRetry={() => lessons.refetch()} />
        ) : (
          (lessons.data?.educationLessons ?? []).map((lesson) => (
            <div key={lesson._id} className="edu-between" style={{ borderTop: "1px solid var(--edu-line)", paddingTop: 10 }}>
              <span>
                {lesson.emoji} <strong>{lesson.title}</strong>{" "}
                <span className="edu-muted" style={{ fontSize: 13 }}>
                  · {lesson.itemCount} өгүүлбэр · {lesson.source}
                </span>
              </span>
              <button
                type="button"
                className="edu-btn edu-btn--ghost edu-btn--sm"
                onClick={() => {
                  if (window.confirm(`«${lesson.title}» хичээлийг устгах уу?`)) {
                    void remove({ variables: { _id: lesson._id } });
                  }
                }}
              >
                🗑
              </button>
            </div>
          ))
        )}
      </section>

      <section className="edu-glass education:flex education:flex-col education:gap-3">
        <h2 className="edu-h2">✍️ Гараар хичээл нэмэх</h2>
        <input className="edu-input" placeholder="Хичээлийн нэр" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea
          className="edu-textarea"
          style={{ minHeight: 180, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13 }}
          placeholder={"Мөр бүр: төрөл | өгүүлбэр | зөв үг | буруу1, буруу2 | дүрэм\npick | Ээж маань амттай хоол хийлээ. | амттай | амтай | Давхар гийгүүлэгч: амт + тай\nspot | Эмээ маань сүүтэй цай чанав. | сүүтэй | сүүтай | Эгшиг зохицох ёс"}
          value={lines}
          onChange={(e) => setLines(e.target.value)}
        />
        <p className="edu-muted" style={{ fontSize: 13, margin: 0 }}>
          <b>pick</b> — зөв үгийг сонгох, <b>spot</b> — өгүүлбэр дэх алдаатай үгийг дугуйлах.
        </p>
        <button
          type="button"
          className="edu-btn edu-btn--mint"
          disabled={!title.trim() || !lines.trim() || addState.loading}
          onClick={() => void runAdd()}
        >
          + Хичээл нэмэх
        </button>
      </section>
    </div>
  );
};

const LiteratureAdmin = () => {
  const status = useQuery(STATUS_QUERY);
  const list = useQuery(LITERATURE_LIST);
  const refresh = { refetchQueries: ["educationLiteratureList"] };
  const [suggest, suggestState] = useMutation(LITERATURE_SUGGEST);
  const [add, addState] = useMutation(LITERATURE_ADD, refresh);
  const [remove] = useMutation(LITERATURE_REMOVE, refresh);
  const [form, setForm] = useState({ title: "", author: "", genre: "", excerpt: "", theme: "", keyPoints: "" });
  const aiOn = status.data?.educationStatus.aiEnabled ?? false;
  const set = (field: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const runSuggest = async () => {
    try {
      const res = await suggest({ variables: { title: form.title, author: form.author, excerpt: form.excerpt } });
      const s = res.data?.educationLiteratureSuggest;
      if (s) {
        setForm((f) => ({ ...f, theme: s.theme, keyPoints: s.keyPoints.join("\n"), genre: f.genre || s.genre }));
      }
    } catch (e) {
      toast({ title: "Gemma санал болгож чадсангүй", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const runAdd = async () => {
    try {
      await add({
        variables: {
          title: form.title,
          author: form.author,
          genre: form.genre,
          excerpt: form.excerpt,
          theme: form.theme,
          keyPoints: form.keyPoints.split("\n"),
        },
      });
      toast({ title: "Зохиол нэмэгдлээ", description: form.title });
      setForm({ title: "", author: "", genre: "", excerpt: "", theme: "", keyPoints: "" });
    } catch (e) {
      toast({ title: "Нэмж чадсангүй", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  return (
    <div className="education:grid education:gap-4 education:lg:grid-cols-2">
      <section className="edu-glass education:flex education:flex-col education:gap-3">
        <h2 className="edu-h2">📚 Уран зохиол нэмэх (ЭЕШ)</h2>
        <p className="edu-muted" style={{ margin: 0, fontSize: 13 }}>
          Сурах бичгээс эхийг хуулж оруулна (жишээ нь Д.Нацагдорж, Б.Явуухулан). Gemma 4 гол санааг санал болгоно — шалгаад засаарай.
        </p>
        <div className="education:grid education:gap-2 education:md:grid-cols-3">
          <input className="edu-input" placeholder="Зохиолын нэр" value={form.title} onChange={set("title")} />
          <input className="edu-input" placeholder="Зохиолч" value={form.author} onChange={set("author")} />
          <input className="edu-input" placeholder="Төрөл (шүлэг…)" value={form.genre} onChange={set("genre")} />
        </div>
        <textarea className="edu-textarea" placeholder="Эх (мөр бүрийг шинэ мөрөнд)" value={form.excerpt} onChange={set("excerpt")} />
        <button
          type="button"
          className="edu-btn edu-btn--amber edu-btn--sm"
          disabled={!aiOn || !form.excerpt.trim() || suggestState.loading}
          onClick={() => void runSuggest()}
          title={aiOn ? "" : "GEMINI_API_KEY хэрэгтэй"}
        >
          {suggestState.loading ? "Gemma уншиж байна…" : "✨ Gemma-аар гол санааг санал болгох"}
        </button>
        <textarea
          className="edu-textarea"
          style={{ minHeight: 80 }}
          placeholder="Жишиг утга / гол санаа (сурагчийн хариултыг үүнтэй харьцуулна)"
          value={form.theme}
          onChange={set("theme")}
        />
        <textarea
          className="edu-textarea"
          style={{ minHeight: 90 }}
          placeholder={"Гол санаанууд — мөр бүрт нэг\nЭх орны байгаль\nЭх орноо хайрлах"}
          value={form.keyPoints}
          onChange={set("keyPoints")}
        />
        <button
          type="button"
          className="edu-btn edu-btn--mint"
          disabled={!form.title.trim() || !form.excerpt.trim() || !form.theme.trim() || !form.keyPoints.trim() || addState.loading}
          onClick={() => void runAdd()}
        >
          + Зохиол нэмэх
        </button>
      </section>

      <section className="edu-glass education:flex education:flex-col education:gap-2">
        <h2 className="edu-h2">Зохиолууд</h2>
        {list.loading ? (
          <LoadingBlock height={120} />
        ) : list.error ? (
          <ErrorBlock message={list.error.message} onRetry={() => list.refetch()} />
        ) : (
          (list.data?.educationLiteratureList ?? []).map((work) => (
            <div key={work._id} className="edu-between" style={{ borderTop: "1px solid var(--edu-line)", paddingTop: 10 }}>
              <span>
                <strong>{work.title}</strong>{" "}
                <span className="edu-muted" style={{ fontSize: 13 }}>
                  · {work.author} · {work.source}
                </span>
              </span>
              <button
                type="button"
                className="edu-btn edu-btn--ghost edu-btn--sm"
                onClick={() => {
                  if (window.confirm(`«${work.title}»-г устгах уу?`)) void remove({ variables: { _id: work._id } });
                }}
              >
                🗑
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export const TeacherPage = () => {
  const me = useQuery(ME_QUERY);
  const canTeach = me.data?.educationMe.canTeach;

  return (
    <Shell title="Багшийн самбар" icon={IconChalkboard}>
      {me.loading ? (
        <LoadingBlock height={240} />
      ) : me.error ? (
        <ErrorBlock message={me.error.message} onRetry={() => me.refetch()} />
      ) : !canTeach ? (
        <EmptyBlock emoji="🔒" title="Багшийн эрх шаардлагатай">
          <p className="edu-muted" style={{ margin: 0 }}>
            erxes Settings → Permissions хэсэгт «Education · Teachers» бүлэгт нэмүүлнэ үү.
          </p>
        </EmptyBlock>
      ) : (
        <>
          <ClassView />
          <LessonsAdmin />
          <LiteratureAdmin />
        </>
      )}
    </Shell>
  );
};
