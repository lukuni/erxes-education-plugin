import { useMutation, useQuery } from "@apollo/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { STATUS_QUERY, TTS } from "../graphql";
import { useSpeech } from "./speech";

// Mongolian voice: Chimege TTS through the plugin API when it is configured,
// otherwise the browser's speech engine. Audio per text is cached for the session.

const audioCache = new Map<string, string>();

const toObjectUrl = (base64: string, mimeType: string) => {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
};

export const useVoice = () => {
  const status = useQuery(STATUS_QUERY);
  const chimege = status.data?.educationStatus.chimegeEnabled ?? false;
  const [tts] = useMutation(TTS);
  const browser = useSpeech();
  const browserSpeak = browser.speak;
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audio.current?.pause(), []);

  const speak = useCallback(
    async (text: string, slow = false) => {
      audio.current?.pause();
      if (!chimege || failed) {
        browserSpeak(text, slow ? 0.55 : 0.85);
        return;
      }
      try {
        let url = audioCache.get(text);
        if (!url) {
          setLoading(true);
          const res = await tts({ variables: { text } });
          const data = res.data?.educationTts;
          if (!data) throw new Error("No audio");
          url = toObjectUrl(data.audioBase64, data.mimeType);
          audioCache.set(text, url);
        }
        const player = new Audio(url);
        player.playbackRate = slow ? 0.7 : 1;
        player.onplay = () => setPlaying(true);
        player.onended = () => setPlaying(false);
        player.onpause = () => setPlaying(false);
        audio.current = player;
        await player.play();
      } catch (error) {
        // Autoplay blocked or Chimege unreachable: fall back to the browser voice.
        if (error instanceof DOMException && error.name === "NotAllowedError") return;
        setFailed(true);
        browserSpeak(text, slow ? 0.55 : 0.85);
      } finally {
        setLoading(false);
      }
    },
    [browserSpeak, chimege, failed, tts],
  );

  /** Reads several lines one after another (poems); stops on the first failure. */
  const speakAll = useCallback(
    async (lines: string[]) => {
      const parts = lines.map((l) => l.trim()).filter(Boolean);
      if (!chimege || failed) {
        browserSpeak(parts.join(". "), 0.85);
        return;
      }
      for (const part of parts) {
        await speak(part);
        const player = audio.current;
        if (!player) return;
        await new Promise<void>((resolve) => {
          if (player.ended || player.paused) return resolve();
          player.addEventListener("ended", () => resolve(), { once: true });
          player.addEventListener("pause", () => resolve(), { once: true });
        });
        if (audio.current !== player || !player.ended) return; // stopped by the user
      }
    },
    [browserSpeak, chimege, failed, speak],
  );

  const stop = useCallback(() => {
    audio.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  return {
    speak,
    speakAll,
    stop,
    ready: !status.loading,
    speaking: playing || browser.speaking,
    loading,
    supported: chimege || browser.supported,
    voiceLabel: chimege && !failed ? "🎙 Chimege · Монгол дуу хоолой" : browser.voiceLabel,
  };
};
