import { useMemo, useRef, useState } from "react";
import ReactPlayer from "react-player";

type Props = {
  url: string;
  className?: string;
};

function normalizeUrl(url: string) {
  return String(url || "").trim();
}

function isDirectVideoUrl(url: string) {
  const u = normalizeUrl(url).toLowerCase().split("?")[0].split("#")[0];
  return (
    u.endsWith(".mp4") ||
    u.endsWith(".webm") ||
    u.endsWith(".ogg") ||
    u.endsWith(".m3u8") ||
    u.endsWith(".mov")
  );
}

async function toggleNativePiP(video: HTMLVideoElement) {
  try {
    // Some browsers require playback before PiP
    if (video.paused) {
      await video.play().catch(() => {});
    }

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      return;
    }

    const docAny = document as any;
    const canStdPiP =
      "pictureInPictureEnabled" in document
        ? Boolean(docAny.pictureInPictureEnabled)
        : false;

    if (canStdPiP && typeof (video as any).requestPictureInPicture === "function") {
      await (video as any).requestPictureInPicture();
      return;
    }

    // Safari fallback
    const vAny = video as any;
    if (typeof vAny.webkitSetPresentationMode === "function") {
      vAny.webkitSetPresentationMode("picture-in-picture");
      return;
    }

    alert("Picture-in-Picture is not supported in this browser.");
  } catch (e) {
    console.error(e);
    alert("Could not start Picture-in-Picture for this video.");
  }
}

export default function UniversalPiP({ url, className }: Props) {
  const src = normalizeUrl(url);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [playerPip, setPlayerPip] = useState(false);
  const [nativePipHint, setNativePipHint] = useState<string | null>(null);

  const direct = useMemo(() => isDirectVideoUrl(src), [src]);
  const canPlay = useMemo(() => (src ? ReactPlayer.canPlay(src) : false), [src]);

  // Cast ReactPlayer to any to avoid incorrect type errors about missing 'url' prop
  const Player = ReactPlayer as any;

  if (!src) return null;

  // ✅ Direct video files/streams: use <video> so native PiP works
  if (direct) {
    return (
      <div className={className}>
        <video
          ref={videoRef}
          src={src}
          controls
          playsInline
          className="w-full rounded-lg"
          {...({
            onEnterPictureInPicture: () => setNativePipHint("on"),
            onLeavePictureInPicture: () => setNativePipHint(null)
          } as any)}
        />

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-md border"
            onClick={() => {
              const v = videoRef.current;
              if (!v) return;
              toggleNativePiP(v);
            }}
          >
            PiP
          </button>

          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-md border"
          >
            Open
          </a>

          {nativePipHint && (
            <span className="text-xs opacity-70 self-center">PiP active</span>
          )}
        </div>
      </div>
    );
  }

  // ✅ Link formats (YouTube/Vimeo/etc): use player PiP when possible
  if (canPlay) {
    return (
      <div className={className}>
        <div className="w-full overflow-hidden rounded-lg">
          <Player
            url={src}
            controls
            width="100%"
            height="360px"
            pip={playerPip}
            playsinline
          />
        </div>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-md border"
            onClick={() => setPlayerPip((p) => !p)}
          >
            {playerPip ? "Exit PiP" : "PiP"}
          </button>

          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-md border"
          >
            Open
          </a>
        </div>
      </div>
    );
  }

  // Fallback (some IG/TikTok links won’t embed)
  return (
    <div className={className}>
      <div className="rounded-lg border p-3">
        <p className="text-sm opacity-80">
          This link can’t be played inline here.
        </p>
        <div className="mt-2">
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-md border inline-block"
          >
            Open video
          </a>
        </div>
      </div>
    </div>
  );
}
