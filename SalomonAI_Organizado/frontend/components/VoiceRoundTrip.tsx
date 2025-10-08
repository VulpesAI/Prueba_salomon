"use client";

import { useState } from "react";

import { useSTT, useTTS } from "@/lib/hooks";
import { base64ToAudio, blobToBase64 } from "@/lib/voiceClient";

export function VoiceRoundTrip() {
  const stt = useSTT();
  const tts = useTTS();
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function recordOnce() {
    try {
      setError(null);
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(media);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setRecording(false);
        try {
          const blob = new Blob(chunks, { type: "audio/webm" });
          const audio_base64 = await blobToBase64(blob);
          const transcript = await stt.mutateAsync({
            audio_base64,
            mime: blob.type,
            language: "es",
          });
          const speech = await tts.mutateAsync({
            text: transcript.text,
            voice: "alloy",
            format: "mp3",
            language: "es-CL",
          });
          const audio = base64ToAudio(speech.audio_base64, speech.mime);
          void audio.play();
        } catch (sttError) {
          setError((sttError as Error).message);
        }
      };

      recorder.start();
      setRecording(true);
      setTimeout(() => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }, 3_000);
    } catch (mediaError) {
      setError((mediaError as Error).message);
      setRecording(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={recordOnce}
        disabled={recording || stt.isPending || tts.isPending}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {recording || stt.isPending || tts.isPending ? "Procesando…" : "Hablar y escuchar"}
      </button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
