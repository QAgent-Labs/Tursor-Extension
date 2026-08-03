import { motion } from "motion/react";
import { Brain, Globe, LineChart } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

const FEATURES = [
  {
    icon: Brain,
    iconClass: "text-blue-500",
    title: "Understands your code",
    subtitle: "Indexes components, routes, APIs and logic.",
  },
  {
    icon: Globe,
    iconClass: "text-violet-500",
    title: "Tests in real browsers",
    subtitle: "Runs tests using Chrome DevTools Protocol.",
  },
  {
    icon: LineChart,
    iconClass: "text-purple-500",
    title: "Real-time feedback",
    subtitle: "Live execution status, screenshots and insights.",
  },
] as const;

export function WelcomeFeatures() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.12, delayChildren: 0.35 } },
      }}
      className="grid w-full max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-12"
    >
      {FEATURES.map((feature) => (
        <motion.div
          key={feature.title}
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.5, ease: EASE },
            },
          }}
          className="flex flex-col items-center text-center sm:items-start sm:text-left"
        >
          <feature.icon
            className={`mb-3 h-8 w-8 shrink-0 ${feature.iconClass}`}
            strokeWidth={1.75}
            aria-hidden
          />
          <h3 className="text-sm font-semibold tracking-tight text-white">
            {feature.title}
          </h3>
          <p className="mt-1.5 max-w-[20rem] text-sm leading-relaxed text-slate-400">
            {feature.subtitle}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}
