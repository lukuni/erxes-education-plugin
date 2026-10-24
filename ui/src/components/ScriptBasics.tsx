import { useMemo, useState } from "react";
import { confettiFrom, sound } from "../lib/fx";

// Positional forms are produced by the font's own shaping: a zero-width joiner
// (U+200D) on the right side gives the word-initial form, on both sides the
// medial form, and on the left side the word-final form.
const ZWJ = "‍";
export type Position = "initial" | "medial" | "final";

export const formOf = (letter: string, position: Position) =>
  position === "initial" ? `${letter}${ZWJ}` : position === "medial" ? `${ZWJ}${letter}${ZWJ}` : `${ZWJ}${letter}`;

const POSITION_LABEL: Record<Position, string> = {
  initial: "Үгийн эхэнд",
  medial: "Үгийн дунд",
  final: "Үгийн адагт",
};

const LETTERS: { char: string; cyr: string; note: string }[] = [
  { char: "ᠠ", cyr: "а", note: "Эр эгшиг. Үгийн дунд «э»-тэй ижил шүдээр бичигдэнэ." },
  { char: "ᠡ", cyr: "э", note: "Эм эгшиг. Эхэнд «а»-аас ялгаатай; дунд «а»-тай ижил." },
  { char: "ᠢ", cyr: "и", note: "Саармаг эгшиг — эр, эм үгийн аль алинд орно." },
  { char: "ᠣ", cyr: "о / у", note: "о, у хоёр бүх байрлалд ижил дүрстэй." },
  { char: "ᠥ", cyr: "ө / ү", note: "ө, ү хоёр ижил дүрстэй; эхэнд о/у-аас нэг шүдээр илүү." },
  { char: "ᠨ", cyr: "н", note: "Дунд эгшгийн өмнө цэгтэй, гийгүүлэгчийн өмнө цэггүй бичигдэнэ." },
  { char: "ᠮ", cyr: "м", note: "Бүх байрлалд сүүлтэй, танихад амар." },
  { char: "ᠯ", cyr: "л", note: "«м»-тэй төстэй тул андуурахгүй байхад анхаар." },
];

const POSITIONS: Position[] = ["initial", "medial", "final"];

const RULES = [
  "Монгол бичгийг дээрээс доош, мөрийг зүүнээс баруун тийш бичнэ.",
  "Үсэг бүр байрлалаасаа хамаарч гурван хэлбэртэй: үгийн эхэнд, дунд, адагт.",
  "Эхэнд орсон эгшиг «титэм»-ээр эхэлнэ; дунд орохдоо «шүд», адагт орохдоо «сүүл (орхиц)»-оор бичигдэнэ.",
  "Дунд байрлалд «а», «э» хоёр ижил дүрстэй тул аль нь болохыг үгийн эр, эм байдлаар таньна.",
  "«о / у», «ө / ү» хосууд бичгээр ижил — дуудлагыг үгээр нь мэднэ.",
];

/** Rules first, then a quick "which position is this form?" drill. */
export const ScriptBasics = () => {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<Position | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const question = useMemo(() => {
    const position: Position = POSITIONS[(round * 7 + 1) % 3] ?? "initial";
    return { index: (round * 5 + 3) % LETTERS.length, position };
  }, [round]);
  const letter = LETTERS[question.index] ?? { char: "ᠠ", cyr: "а", note: "" };

  const answer = (p: Position, el: HTMLElement) => {
    if (picked) return;
    setPicked(p);
    const ok = p === question.position;
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
    if (ok) {
      sound("good");
      confettiFrom(el);
    } else sound("bad");
  };

  return (
    <div className="education:flex education:flex-col education:gap-4">
      <section className="edu-glass edu-rise">
        <h2 className="edu-h2" style={{ marginBottom: 10 }}>
          📖 Үндсэн ойлголт ба зүй тогтол
        </h2>
        <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          {RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </section>

      <section className="edu-glass">
        <h2 className="edu-h2" style={{ marginBottom: 10 }}>
          Үсгийн байрлалын хэлбэр
        </h2>
        <div className="edu-table-wrap">
          <table className="edu-table">
            <thead>
              <tr>
                <th>Үсэг</th>
                {POSITIONS.map((p) => (
                  <th key={p} style={{ textAlign: "center" }}>
                    {POSITION_LABEL[p]}
                  </th>
                ))}
                <th>Тэмдэглэл</th>
              </tr>
            </thead>
            <tbody>
              {LETTERS.map((l) => (
                <tr key={l.char}>
                  <td style={{ fontWeight: 900, fontSize: 18 }}>{l.cyr}</td>
                  {POSITIONS.map((p) => (
                    <td key={p} style={{ textAlign: "center" }}>
                      <span className="edu-script edu-script--sm" lang="mn-Mong" style={{ fontSize: 40 }}>
                        {formOf(l.char, p)}
                      </span>
                    </td>
                  ))}
                  <td className="edu-muted" style={{ fontSize: 13 }}>
                    {l.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="edu-glass edu-stage">
        <div className="edu-between" style={{ width: "100%" }}>
          <span className="edu-tag">Дасгал · Энэ хэлбэр үгийн хаана орсон бэ?</span>
          <span className="edu-pill edu-pill--mint">
            ✓ {score.right}/{score.total}
          </span>
        </div>
        <span className="edu-script" lang="mn-Mong" style={{ fontSize: 96 }}>
          {formOf(letter.char, question.position)}
        </span>
        <span className="edu-muted">Үсэг: «{letter.cyr}»</span>
        <div className="edu-chips">
          {POSITIONS.map((p) => (
            <button
              key={p}
              type="button"
              className={`edu-chip${!picked ? "" : p === question.position ? " edu-chip--correct" : p === picked ? " edu-chip--wrong" : " edu-chip--dim"}`}
              disabled={!!picked}
              onClick={(e) => answer(p, e.currentTarget)}
            >
              {POSITION_LABEL[p]}
            </button>
          ))}
        </div>
        {picked && (
          <>
            <div className={`edu-rule edu-rule--${picked === question.position ? "good" : "bad"}`}>
              <div className="edu-rule__icon">{picked === question.position ? "🎉" : "💡"}</div>
              <span>
                Энэ бол «{letter.cyr}» үсгийн <b>{POSITION_LABEL[question.position].toLowerCase()}</b> орсон хэлбэр. {letter.note}
              </span>
            </div>
            <button
              type="button"
              className="edu-btn"
              onClick={() => {
                setPicked(null);
                setRound((r) => r + 1);
              }}
              autoFocus
            >
              Дараах →
            </button>
          </>
        )}
      </section>
    </div>
  );
};
