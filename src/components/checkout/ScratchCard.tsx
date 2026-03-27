import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, PartyPopper, RotateCcw } from "lucide-react";

export interface ScratchReward {
  tier: "gold" | "silver" | "bronze" | "none";
  discountValue: number;
}

const TIER_CONFIG = {
  gold: {
    label: "🥇 GOLD",
    gradient: "linear-gradient(135deg, #FFD700, #FFA500, #FFD700)",
    overlayGradient: "linear-gradient(135deg, #B8860B, #DAA520, #FFD700, #DAA520, #B8860B)",
    textColor: "#B8860B",
    bgClass: "from-yellow-500/20 to-amber-500/20",
    borderClass: "border-yellow-500/50",
  },
  silver: {
    label: "🥈 SILVER",
    gradient: "linear-gradient(135deg, #C0C0C0, #E8E8E8, #C0C0C0)",
    overlayGradient: "linear-gradient(135deg, #808080, #A9A9A9, #C0C0C0, #A9A9A9, #808080)",
    textColor: "#6B6B6B",
    bgClass: "from-gray-300/20 to-slate-400/20",
    borderClass: "border-gray-400/50",
  },
  bronze: {
    label: "🥉 BRONZE",
    gradient: "linear-gradient(135deg, #CD7F32, #E8A862, #CD7F32)",
    overlayGradient: "linear-gradient(135deg, #8B4513, #A0522D, #CD7F32, #A0522D, #8B4513)",
    textColor: "#8B4513",
    bgClass: "from-orange-600/20 to-amber-700/20",
    borderClass: "border-orange-600/50",
  },
  none: {
    label: "Try Again!",
    gradient: "linear-gradient(135deg, #9CA3AF, #D1D5DB, #9CA3AF)",
    overlayGradient: "linear-gradient(135deg, #6B7280, #9CA3AF, #D1D5DB, #9CA3AF, #6B7280)",
    textColor: "#6B7280",
    bgClass: "from-gray-400/20 to-gray-500/20",
    borderClass: "border-gray-400/50",
  },
};

const SCRATCH_THRESHOLD = 0.45; // 45% scratched to reveal

interface ScratchCardProps {
  reward: ScratchReward;
  onScratched?: () => void;
}

export default function ScratchCard({ reward, onScratched }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const config = TIER_CONFIG[reward.tier];

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Draw metallic overlay
    const grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    const colors = reward.tier === "none"
      ? ["#6B7280", "#9CA3AF", "#D1D5DB", "#9CA3AF", "#6B7280"]
      : reward.tier === "gold"
        ? ["#B8860B", "#DAA520", "#FFD700", "#DAA520", "#B8860B"]
        : reward.tier === "silver"
          ? ["#808080", "#A9A9A9", "#C0C0C0", "#E8E8E8", "#C0C0C0"]
          : ["#8B4513", "#A0522D", "#CD7F32", "#E8A862", "#CD7F32"];

    colors.forEach((c, i) => grad.addColorStop(i / (colors.length - 1), c));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Add shimmer pattern
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * rect.width;
      const y = Math.random() * rect.height;
      const r = Math.random() * 3 + 1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Text
    ctx.font = "bold 16px system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.textAlign = "center";
    ctx.fillText("✨ Scratch to reveal ✨", rect.width / 2, rect.height / 2);
  }, [reward.tier]);

  useEffect(() => {
    if (!revealed) initCanvas();
  }, [initCanvas, revealed]);

  const scratchCountRef = useRef(0);
  const lastCheckRef = useRef(0);

  const checkScratchPercent = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;

    // Sample every 8th pixel instead of all pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const totalPixels = data.length / 4;
    let transparent = 0;
    let sampled = 0;
    for (let i = 3; i < data.length; i += 32) { // step 32 = every 8th pixel's alpha
      sampled++;
      if (data[i] === 0) transparent++;
    }
    return sampled > 0 ? transparent / sampled : 0;
  }, []);

  const scratch = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x * 2, y * 2, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    // Only check percentage every 5 strokes
    scratchCountRef.current++;
    if (scratchCountRef.current - lastCheckRef.current >= 5) {
      lastCheckRef.current = scratchCountRef.current;
      const percent = checkScratchPercent();
      setScratchPercent(percent);

      if (percent > SCRATCH_THRESHOLD && !revealed) {
        setRevealed(true);
        onScratched?.();
      }
    }
  }, [revealed, onScratched, checkScratchPercent]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isScratching) return;
    e.preventDefault();
    scratch(e.clientX, e.clientY);
  }, [isScratching, scratch]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsScratching(true);
    scratch(e.clientX, e.clientY);
  }, [scratch]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 }}
      className="w-full max-w-sm mx-auto"
    >
      <div className={`relative rounded-2xl border-2 ${config.borderClass} overflow-hidden bg-gradient-to-br ${config.bgClass}`}>
        {/* Prize content underneath */}
        <div className="p-6 text-center min-h-[180px] flex flex-col items-center justify-center">
          <AnimatePresence>
            {revealed ? (
              <motion.div
                key="revealed"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex flex-col items-center gap-2"
              >
                {reward.tier !== "none" ? (
                  <>
                    <PartyPopper className="w-10 h-10 text-primary" />
                    <span className="text-2xl font-display font-extrabold" style={{ color: config.textColor }}>
                      {config.label}
                    </span>
                    <span className="text-lg font-bold text-foreground">
                      {reward.discountValue}% OFF
                    </span>
                    <span className="text-xs text-muted-foreground max-w-[240px]">
                      on your next order! Coupon will be sent via WhatsApp once your order is delivered 🎉
                    </span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-10 h-10 text-muted-foreground" />
                    <span className="text-xl font-display font-bold text-muted-foreground">
                      Better luck next time!
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Try again on your next order 🍿
                    </span>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="hidden"
                className="flex flex-col items-center gap-2"
              >
                <Gift className="w-10 h-10 text-primary/40" />
                <span className="text-lg font-display font-bold text-foreground/30">
                  Your Prize Awaits!
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scratch overlay canvas */}
        {!revealed && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-pointer touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={() => setIsScratching(false)}
            onPointerLeave={() => setIsScratching(false)}
          />
        )}
      </div>

      {/* Progress indicator */}
      {!revealed && scratchPercent > 0 && (
        <div className="mt-2 w-full bg-secondary rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(scratchPercent / SCRATCH_THRESHOLD * 100, 100)}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}
