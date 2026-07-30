"use client";

const EMOTION_STYLES: Record<
  string,
  { color: string; label: string; mouthPath: string; browAngle: number }
> = {
  anger: { color: "#ef4444", label: "Angry", mouthPath: "M 65 128 Q 100 112 135 128", browAngle: -12 },
  frustration: { color: "#f97316", label: "Frustrated", mouthPath: "M 68 126 Q 100 118 132 126", browAngle: -8 },
  anxiety: { color: "#a78bfa", label: "Anxious", mouthPath: "M 70 124 Q 100 130 130 124", browAngle: -4 },
  sadness: { color: "#60a5fa", label: "Sad", mouthPath: "M 68 130 Q 100 118 132 130", browAngle: 6 },
  calm: { color: "#34d399", label: "Calm", mouthPath: "M 68 120 Q 100 132 132 120", browAngle: 0 },
  neutral: { color: "#94a3b8", label: "Neutral", mouthPath: "M 70 122 Q 100 124 130 122", browAngle: 0 },
};

function resolveEmotion(primary: string) {
  const key = primary?.toLowerCase() ?? "neutral";
  if (EMOTION_STYLES[key]) return EMOTION_STYLES[key];
  if (key.includes("frustrat")) return EMOTION_STYLES.frustration;
  if (key.includes("ang")) return EMOTION_STYLES.anger;
  if (key.includes("anx")) return EMOTION_STYLES.anxiety;
  if (key.includes("sad")) return EMOTION_STYLES.sadness;
  if (key.includes("calm") || key.includes("trust")) return EMOTION_STYLES.calm;
  return EMOTION_STYLES.neutral;
}

interface AvatarProps {
  primaryEmotion: string;
  intensity: number;
  isSpeaking: boolean;
}

export function Avatar({ primaryEmotion, intensity, isSpeaking }: AvatarProps) {
  const emo = resolveEmotion(primaryEmotion);
  const glowOpacity = 0.15 + Math.min(1, Math.max(0, intensity)) * 0.35;

  return (
    <div className="relative flex flex-col items-center">
      <div
        className={`relative rounded-full ${isSpeaking ? "animate-bob" : ""}`}
        style={{
          boxShadow: `0 0 0 10px ${emo.color}${Math.round(glowOpacity * 255)
            .toString(16)
            .padStart(2, "0")}`,
        }}
      >
        <svg
          width="220"
          height="220"
          viewBox="0 0 200 200"
          role="img"
          aria-label={`Avatar showing ${emo.label.toLowerCase()} expression`}
        >
          <circle cx="100" cy="100" r="90" fill="#1e293b" stroke={emo.color} strokeWidth="4" />
          {/* face */}
          <circle cx="100" cy="95" r="55" fill="#f1c9a1" />
          {/* eyebrows, angle reflects emotion */}
          <line
            x1="65" y1={80 + emo.browAngle * 0.3} x2="85" y2={80 - emo.browAngle * 0.3}
            stroke="#4a2c1a" strokeWidth="4" strokeLinecap="round"
          />
          <line
            x1="135" y1={80 + emo.browAngle * 0.3} x2="115" y2={80 - emo.browAngle * 0.3}
            stroke="#4a2c1a" strokeWidth="4" strokeLinecap="round"
          />
          {/* eyes */}
          <circle cx="80" cy="95" r="6" fill="#1e293b" />
          <circle cx="120" cy="95" r="6" fill="#1e293b" />
          {/* mouth - animates while speaking */}
          <path
            d={emo.mouthPath}
            stroke="#7a3b2e"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            className={isSpeaking ? "animate-pulseSlow" : ""}
          />
        </svg>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: emo.color }}
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-slate-200">{emo.label}</span>
        <span className="text-xs text-slate-400">
          ({Math.round(Math.min(1, Math.max(0, intensity)) * 100)}% intensity)
        </span>
      </div>
      {isSpeaking && (
        <div className="mt-2 text-xs text-brand-400 font-medium" aria-live="polite">
          Speaking...
        </div>
      )}
    </div>
  );
}
