import { motion } from "framer-motion";
import ixosIcon from "@/assets/ixos-icon.png";

export function SplashLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-graphite-0">
      <div className="text-center">
        {/* Pulsing Logo Container */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-brand p-[2px] flex items-center justify-center mx-auto mb-8 animate-pulse">
          <div className="w-full h-full rounded-[14px] bg-graphite-2 flex items-center justify-center">
            <img src={ixosIcon} alt="Ixos" className="w-9 h-9" />
          </div>
        </div>

        {/* Text with Flowing Amber Light Animation */}
        <div className="relative inline-block px-4">
          {/* Base Layer - Dim "Unlit" Text */}
          <h1 className="text-lg font-bold tracking-[0.2em] text-white/20 uppercase">
            Loading Ixos...
          </h1>

          {/* Highlight Layer - Bright "Lit" Text with Mask */}
          <motion.div
            className="absolute inset-0 top-0 left-0 w-full h-full flex justify-center"
            initial={{ maskPosition: "-50% 0" }}
            animate={{ maskPosition: "150% 0" }}
            transition={{
              repeat: Infinity, // Loop the animation
              duration: 2.5, // Duration of one pass
              ease: "linear",
              repeatDelay: 0,
            }}
            style={{
              // The text color itself
              color: "#fbbf24", // amber-400
              // Gradient Mask: Transparent -> Black (Visible) -> Transparent
              maskImage:
                "linear-gradient(90deg, transparent 0%, rgba(0,0,0,1) 50%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(90deg, transparent 0%, rgba(0,0,0,1) 50%, transparent 100%)",

              // Size of the mask relative to the container.
              // 50% width means the "beam" is half the width of the text.
              maskSize: "50% 100%",
              WebkitMaskSize: "50% 100%",

              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",

              // Ensure pointer events don't block anything (good practice, though irrelevant here)
              pointerEvents: "none",

              // Blending to make it look like light
              mixBlendMode: "plus-lighter",
            }}
          >
            <h1 className="text-lg font-bold tracking-[0.2em] uppercase whitespace-nowrap">
              Loading Ixos...
            </h1>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
