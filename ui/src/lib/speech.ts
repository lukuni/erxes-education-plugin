import { useCallback, useEffect, useState } from "react";

// Reads sentences aloud with the browser's speech engine. A Mongolian voice
// is used when the device has one; otherwise a Russian voice gives a close
// reading of Cyrillic. Gemma 4 does not produce audio, so speech stays local.

const pickVoice = () => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith("mn")) ??
    voices.find((v) => v.lang.toLowerCase().startsWith("ru")) ??
    null
  );
};

export const useSpeech = () => {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(() => pickVoice());

  useEffect(() => {
    if (!supported) return;
    const update = () => setVoice(pickVoice());
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", update);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const speak = useCallback(
    (text: string, rate = 0.85) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voice?.lang ?? "mn-MN";
      if (voice) utterance.voice = voice;
      utterance.rate = rate;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [supported, voice],
  );

  const voiceLabel = !supported
    ? "Энэ хөтөч дуу унших боломжгүй"
    : voice?.lang.toLowerCase().startsWith("mn")
      ? `Монгол дуу хоолой · ${voice.name}`
      : "Монгол дуу хоолой суугаагүй тул ойролцоо дуудлагаар уншина";

  return { speak, speaking, supported, voiceLabel };
};
