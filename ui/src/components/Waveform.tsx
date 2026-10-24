const BARS = [18, 30, 44, 26, 52, 34, 22, 46, 30, 40, 20, 36, 48, 24, 32];

/** Decorative audio waveform that dances while the sentence is being read. */
export const Waveform = ({ active }: { active: boolean }) => (
  <div className={`edu-wave${active ? " edu-wave--on" : ""}`} aria-hidden>
    {BARS.map((height, i) => (
      <span key={i} style={active ? undefined : { height: height / 2.5 }} />
    ))}
  </div>
);
