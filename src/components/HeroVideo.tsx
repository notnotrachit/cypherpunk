"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type HeroVideoProps = {
  className?: string;
  /**
   * Path to the WebM source. Defaults to `/hero-vid.webm`
   */
  webmSrc?: string;
  /**
   * Path to the MP4 source (hvc1 for Safari). Defaults to `/hero-vid.mp4`
   */
  mp4Src?: string;
  /**
   * Optional poster image to show before the first frame is painted.
   */
  posterSrc?: string;
  /**
   * Controls whether the video loops. Defaults to true.
   */
  loop?: boolean;
  /**
   * Provide custom children overlaying the video (e.g., gradient or caption).
   */
  children?: React.ReactNode;
};

/**
 * A client-side video component that aggressively attempts to autoplay
 * muted inline video across browsers (Chrome, Safari/iOS, Firefox).
 *
 * Techniques used:
 * - Ensures `muted`, `playsInline`, `autoplay` properties are set on the element before play
 * - Tries to call `video.play()` immediately, then on `canplay`, `loadeddata`
 * - Retries on visibility changes and on user interactions as a fallback
 * - Keeps the video inline and muted to satisfy autoplay policies
 */
export default function HeroVideo({
  className,
  webmSrc = "/hero-vid.webm",
  mp4Src = "/hero-vid.mp4",
  posterSrc,
  loop = true,
  children,
}: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [attempts, setAttempts] = useState(0);

  const sources = useMemo(
    () => [
      { src: webmSrc, type: "video/webm" },
      // hvc1 signals HEVC/H.265 which Safari prefers for hardware decode
      { src: mp4Src, type: 'video/mp4; codecs="hvc1"' },
    ],
    [webmSrc, mp4Src],
  );

  const tryPlay = useCallback(async () => {
    const el = videoRef.current;
    if (!el) return;

    // Ensure autoplay preconditions are met before attempting playback
    el.muted = true;
    // Some browsers prefer the attribute present as well
    el.setAttribute("muted", "");
    el.playsInline = true;
    el.setAttribute("playsinline", "");
    el.autoplay = true;
    el.controls = false;
    el.loop = loop;
    // Ensure volume isn't blocking autoplay (shouldn't matter if muted, but belt-and-suspenders)
    el.volume = 0;

    try {
      const playPromise = el.play();
      if (playPromise && typeof playPromise.then === "function") {
        await playPromise;
      }
    } catch {
      // Swallow to retry via other events or interaction
    } finally {
      setAttempts((n) => n + 1);
    }
  }, [loop]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let rafId: number | null = null;
    const rafPlay = () => {
      // Kick to next frame to allow layout/paint before attempting playback
      rafId = requestAnimationFrame(() => {
        tryPlay();
      });
    };

    // Initial attempt
    rafPlay();

    // Event-driven attempts when enough data is available
    const onCanPlay = () => tryPlay();
    const onLoadedData = () => tryPlay();

    // If the tab becomes visible, try again
    const onVis = () => {
      if (document.visibilityState === "visible") {
        tryPlay();
      }
    };

    // As a last resort, attempt on any user gesture
    const onGesture = () => tryPlay();

    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("loadeddata", onLoadedData);
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("pointerdown", onGesture, {
      once: true,
      passive: true,
    });
    document.addEventListener("keydown", onGesture, {
      once: true,
      passive: true,
    });
    // If it ends (loop false), attempt to play again if loop is later toggled
    el.addEventListener("ended", onCanPlay);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("loadeddata", onLoadedData);
      el.removeEventListener("ended", onCanPlay);
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("pointerdown", onGesture);
      document.removeEventListener("keydown", onGesture);
    };
  }, [tryPlay]);

  // Re-attempt playback if sources change
  useEffect(() => {
    tryPlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources.map((s) => s.src).join("|")]);

  return (
    <div className={["relative", className ?? ""].join(" ")}>
      <video
        ref={videoRef}
        className="block h-full w-full object-cover"
        // Attributes for autoplaying inline muted video across browsers
        autoPlay
        muted
        playsInline
        loop={loop}
        preload="auto"
        poster={posterSrc}
      >
        {sources.map(({ src, type }) => (
          <source key={type} src={src} type={type} />
        ))}
        {/* Fallback text */}
        Your browser does not support the video tag.
      </video>

      {children ? (
        <div className="pointer-events-none absolute inset-0">{children}</div>
      ) : null}

      {/* Optional debug badge (commented out). Uncomment for troubleshooting.
      <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-[10px] text-white">
        attempts: {attempts}
      </div>
      */}
    </div>
  );
}
