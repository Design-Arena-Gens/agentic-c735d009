"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";

type Aspect = "9:16" | "1:1" | "16:9";

type UploadedImage = {
  id: string;
  file: File;
  url: string;
  element?: HTMLImageElement;
};

function useObjectUrls() {
  const urlsRef = useRef<string[]>([]);
  const make = useCallback((file: File | Blob) => {
    const url = URL.createObjectURL(file);
    urlsRef.current.push(url);
    return url;
  }, []);
  const revokeAll = useCallback(() => {
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = [];
  }, []);
  return { make, revokeAll };
}

function parseLines(input: string): string[] {
  return input
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function getCanvasSize(aspect: Aspect): { width: number; height: number } {
  switch (aspect) {
    case "9:16":
      return { width: 1080, height: 1920 };
    case "1:1":
      return { width: 1080, height: 1080 };
    case "16:9":
      return { width: 1920, height: 1080 };
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(" ");
  let line = "";
  let cursorY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, cursorY);
      line = words[n] + " ";
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, cursorY);
  return cursorY + lineHeight;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export default function Page() {
  const [productTitle, setProductTitle] = useState("Amazing Gadget 3000");
  const [subtitle, setSubtitle] = useState("Boost productivity with zero effort");
  const [benefitsText, setBenefitsText] = useState(
    ["One-tap setup", "Long-lasting battery", "Seamless integration", "Budget-friendly"].join("\n")
  );
  const [cta, setCta] = useState("Grab yours today ? link in bio");
  const [brandColor, setBrandColor] = useState("#3B82F6");
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [secondsPerSlide, setSecondsPerSlide] = useState(2.5);

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [bgMusicEnabled, setBgMusicEnabled] = useState(true);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [voiceRecordingUrl, setVoiceRecordingUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const { make, revokeAll } = useObjectUrls();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micRecorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const benefits = useMemo(() => parseLines(benefitsText), [benefitsText]);
  const totalSlides = useMemo(() => Math.max(benefits.length, 1), [benefits.length]);
  const { width, height } = getCanvasSize(aspect);

  const onSelectImages = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const list: UploadedImage[] = [];
    for (const file of Array.from(files)) {
      const url = make(file);
      list.push({ id: crypto.randomUUID(), file, url });
    }
    setImages((prev) => [...prev, ...list].slice(0, 20));
  }, [make]);

  const onRemoveImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const onSelectVoice = useCallback((file: File | null) => {
    setVoiceFile(file);
  }, []);

  const startMicRecording = useCallback(async () => {
    if (recordingVoice) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStreamRef.current = stream;
    const chunks: BlobPart[] = [];
    const rec = new MediaRecorder(stream);
    micRecorderRef.current = rec;
    setRecordingVoice(true);
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const url = make(blob);
      setVoiceRecordingUrl(url);
      setVoiceFile(new File([blob], "voiceover.webm", { type: "audio/webm" }));
      setRecordingVoice(false);
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    };
    rec.start();
  }, [make, recordingVoice]);

  const stopMicRecording = useCallback(() => {
    micRecorderRef.current?.stop();
  }, []);

  const drawSlide = useCallback(async (ctx: CanvasRenderingContext2D, slideIndex: number, progress01: number) => {
    ctx.clearRect(0, 0, width, height);

    // Background gradient
    const grd = ctx.createLinearGradient(0, 0, width, height);
    grd.addColorStop(0, brandColor);
    grd.addColorStop(1, "#111827");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);

    // Image (if available)
    const img = images[slideIndex]?.element;
    if (img) {
      const scale = Math.max(width / img.width, height / img.height);
      const iw = img.width * scale;
      const ih = img.height * scale;
      const ix = (width - iw) / 2;
      const iy = (height - ih) / 2;
      ctx.globalAlpha = 0.25;
      ctx.drawImage(img, ix, iy, iw, ih);
      ctx.globalAlpha = 1;
    }

    // Title and subtitle with slight entrance animation
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    const titleFontSize = Math.round(height * 0.05);
    const subtitleFontSize = Math.round(height * 0.028);
    const benefitFontSize = Math.round(height * 0.04);
    ctx.font = `700 ${titleFontSize}px system-ui, -apple-system, Segoe UI, Roboto`;
    const titleX = Math.round(width * 0.08);
    const titleY = Math.round(height * 0.12 + (1 - progress01) * 16);
    ctx.fillText(productTitle, titleX, titleY);
    ctx.font = `500 ${subtitleFontSize}px system-ui, -apple-system, Segoe UI, Roboto`;
    ctx.globalAlpha = 0.9;
    ctx.fillText(subtitle, titleX, titleY + subtitleFontSize + 10);
    ctx.globalAlpha = 1;

    // Benefit text block
    const benefit = benefits[Math.min(slideIndex, benefits.length - 1)] ?? "";
    const blockY = Math.round(height * 0.35);
    const blockW = Math.round(width * 0.84);
    const blockX = Math.round(width * 0.08);

    // Card background
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    const cardH = Math.round(height * 0.32);
    const radius = 24;
    roundRect(ctx, blockX - 16, blockY - 24, blockW + 32, cardH, radius);
    ctx.fill();

    // Benefit text
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${benefitFontSize}px system-ui, -apple-system, Segoe UI, Roboto`;
    const benefitMax = blockW;
    const baseline = blockY + Math.round(benefitFontSize * 1.25);
    wrapText(ctx, benefit, blockX, baseline, benefitMax, Math.round(benefitFontSize * 1.25));

    // CTA pill
    const ctaText = cta;
    ctx.font = `700 ${Math.round(height * 0.028)}px system-ui, -apple-system, Segoe UI, Roboto`;
    const ctaMetrics = ctx.measureText(ctaText);
    const pillPadX = 18;
    const pillH = Math.round(height * 0.05);
    const pillW = Math.round(ctaMetrics.width + pillPadX * 2);
    const pillX = blockX;
    const pillY = blockY + cardH - pillH - 20;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = brandColor;
    ctx.textAlign = "center";
    ctx.fillText(ctaText, pillX + pillW / 2, pillY + pillH / 2 + 8);

    // Watermark
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `600 ${Math.round(height * 0.02)}px system-ui, -apple-system, Segoe UI, Roboto`;
    ctx.fillText("#affiliate", width - 24, height - 24);
  }, [brandColor, benefits, cta, height, images, productTitle, subtitle, width]);

  const ensureImagesLoaded = useCallback(async () => {
    const loaded = await Promise.all(
      images.map(async (img) => {
        const el = await loadImage(img.url);
        return { ...img, element: el };
      })
    );
    setImages(loaded);
  }, [images]);

  const renderVideo = useCallback(async () => {
    if (rendering) return;
    setRendering(true);
    setOutputUrl(null);
    revokeAll();
    await ensureImagesLoaded();

    // Prepare canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setRendering(false);
      return;
    }

    // Media streams
    const fps = 30;
    const canvasStream = (canvas as HTMLCanvasElement).captureStream(fps);
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const dest = audioContext.createMediaStreamDestination();

    // Optional BG music
    let bgGain: GainNode | null = null;
    if (bgMusicEnabled) {
      const musicGain = audioContext.createGain();
      musicGain.gain.value = 0.15;
      createCalmMusic(audioContext, totalSlides * secondsPerSlide).connect(musicGain);
      musicGain.connect(dest);
      bgGain = musicGain;
    }

    // Optional voiceover from file
    let voiceEl: HTMLAudioElement | null = null;
    if (voiceFile) {
      const url = make(voiceFile);
      voiceEl = new Audio(url);
      voiceEl.crossOrigin = "anonymous";
      voiceEl.preload = "auto";
      const node = audioContext.createMediaElementSource(voiceEl);
      const voiceGain = audioContext.createGain();
      voiceGain.gain.value = 0.9;
      node.connect(voiceGain).connect(dest);
    }

    // Merge tracks
    const output = new MediaStream();
    canvasStream.getTracks().forEach((t) => output.addTrack(t));
    dest.stream.getAudioTracks().forEach((t) => output.addTrack(t));

    const chunks: BlobPart[] = [];
    const rec = new MediaRecorder(output, { mimeType: "video/webm;codecs=vp9,opus" });
    mediaRecorderRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    const done = new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    });

    // Start audio
    await audioContext.resume();
    if (voiceEl) {
      try {
        await voiceEl.play();
      } catch {
        // ignore autoplay block
      }
    }

    // Render frames
    rec.start();
    const slideFrames = Math.floor(secondsPerSlide * fps);
    const totalFrames = Math.max(1, totalSlides) * slideFrames;
    let frame = 0;
    while (frame < totalFrames) {
      const slideIndex = Math.floor(frame / slideFrames);
      const within = frame - slideIndex * slideFrames;
      const progress = within / slideFrames;
      await drawSlide(ctx, slideIndex, easeOutCubic(Math.min(1, progress * 1.2)));
      await nextAnimationFrame();
      frame++;
    }

    // Tail frames
    const tailFrames = Math.floor(0.3 * fps);
    for (let i = 0; i < tailFrames; i++) {
      await nextAnimationFrame();
    }

    rec.stop();
    const blob = await done;
    const url = make(blob);
    setOutputUrl(url);
    setRendering(false);

    setTimeout(() => {
      dest.disconnect();
      bgGain?.disconnect();
      audioContext.close();
      if (voiceEl) {
        voiceEl.pause();
        voiceEl.src = "";
      }
    }, 250);
  }, [
    bgMusicEnabled,
    benefits.length,
    drawSlide,
    make,
    revokeAll,
    secondsPerSlide,
    totalSlides,
    voiceFile,
    width,
    height,
    ensureImagesLoaded,
    rendering
  ]);

  const clearAll = useCallback(() => {
    setOutputUrl(null);
    setImages([]);
    setVoiceFile(null);
    setVoiceRecordingUrl(null);
  }, []);

  return (
    <main className="space-y-6">
      <section className="card p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="label">Product title</label>
              <input className="input" value={productTitle} onChange={(e) => setProductTitle(e.target.value)} />
            </div>
            <div>
              <label className="label">Subtitle</label>
              <input className="input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
            </div>
            <div>
              <label className="label">Benefits (one per line)</label>
              <textarea
                className="input h-32 resize-y"
                value={benefitsText}
                onChange={(e) => setBenefitsText(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Brand color</label>
                <input
                  type="color"
                  className="h-10 w-full cursor-pointer rounded border border-gray-300"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Aspect ratio</label>
                <select
                  className="input"
                  value={aspect}
                  onChange={(e) => setAspect(e.target.value as Aspect)}
                >
                  <option value="9:16">9:16 (TikTok/Reels/Shorts)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="16:9">16:9 (YouTube)</option>
                </select>
              </div>
              <div>
                <label className="label">Seconds per slide</label>
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  min="1"
                  max="8"
                  value={secondsPerSlide}
                  onChange={(e) => setSecondsPerSlide(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <label className="label">Call to action</label>
              <input className="input" value={cta} onChange={(e) => setCta(e.target.value)} />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Upload product images</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => onSelectImages(e.target.files)}
              />
              {images.length > 0 && (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {images.map((img) => (
                    <div key={img.id} className="relative">
                      <img
                        src={img.url}
                        alt="uploaded"
                        className="h-16 w-full rounded object-cover"
                      />
                      <button
                        className="absolute right-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white"
                        onClick={() => onRemoveImage(img.id)}
                      >
                        ?
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="label">Voiceover</label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => onSelectVoice(e.target.files?.[0] ?? null)}
              />
              <div className="flex items-center gap-2">
                {!recordingVoice ? (
                  <button className="btn btn-secondary" onClick={startMicRecording}>Record voice</button>
                ) : (
                  <button className="btn btn-secondary" onClick={stopMicRecording}>Stop</button>
                )}
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bgMusicEnabled}
                    onChange={(e) => setBgMusicEnabled(e.target.checked)}
                  />
                  Background music
                </label>
              </div>
              {voiceRecordingUrl && (
                <audio className="w-full" src={voiceRecordingUrl} controls />
              )}
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            className="btn btn-primary disabled:opacity-50"
            disabled={rendering}
            onClick={renderVideo}
          >
            {rendering ? "Rendering..." : "Generate Video"}
          </button>
          <button className="btn btn-secondary" onClick={clearAll}>Reset</button>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold">Output</h2>
        {outputUrl ? (
          <div className="space-y-3">
            <video
              className="w-full rounded border"
              src={outputUrl}
              controls
              playsInline
            />
            <div className="flex gap-2">
              <a className="btn btn-primary" href={outputUrl} download="faceless-affiliate.webm">Download .webm</a>
              <span className="text-sm text-gray-500 self-center">WebM (VP9/Opus) compatible with most platforms</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Your rendered video will appear here.</p>
        )}
      </section>
    </main>
  );
}

function nextAnimationFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function createCalmMusic(audioContext: AudioContext, seconds: number): AudioNode {
  const out = audioContext.createGain();
  const now = audioContext.currentTime;
  const end = now + Math.max(1, seconds + 0.6);
  const baseFreqs = [220, 247, 196, 262];
  const beat = 0.5;
  let t = now;
  let chord = 0;
  while (t < end) {
    const base = baseFreqs[chord % baseFreqs.length];
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gain = audioContext.createGain();
    gain.gain.value = 0.0;
    osc1.type = "sine";
    osc2.type = "triangle";
    osc1.frequency.value = base;
    osc2.frequency.value = base * 1.5;
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(out);
    const attack = 0.05;
    const release = 0.25;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + attack);
    gain.gain.linearRampToValueAtTime(0.0, t + beat - release);
    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + beat);
    osc2.stop(t + beat);
    t += beat;
    if (Math.floor((t - now) / (beat * 4)) % 1 === 0) {
      chord++;
    }
  }
  return out;
}
