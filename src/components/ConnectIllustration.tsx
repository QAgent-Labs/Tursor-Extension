import { motion } from "motion/react";
import { Laptop, Server, Wifi } from "lucide-react";

type Props = {
  waitingForSocket: boolean;
  backendFailed: boolean;
};

type EndpointCardProps = {
  icon: typeof Laptop;
  title: string;
  subtitle: string;
  titleClass: string;
  iconClass: string;
  iconSizeClass?: string;
  slideFrom: "left" | "right";
};

function EndpointCard({
  icon: Icon,
  title,
  subtitle,
  titleClass,
  iconClass,
  iconSizeClass = "h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8",
  slideFrom,
}: EndpointCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: slideFrom === "left" ? -16 : 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
      className="flex w-full min-w-0 flex-row items-center justify-center gap-3 rounded-xl border border-slate-700/60 bg-[#171F34]/80 px-3 py-2.5 text-center backdrop-blur-xl sm:rounded-2xl sm:px-4 sm:py-3 md:max-w-[11rem] lg:max-w-[12.5rem]"
    >
      <Icon className={`shrink-0 ${iconSizeClass} ${iconClass}`} />
      <div className="min-w-0">
        <p
          className={`truncate text-xs font-semibold sm:text-sm md:text-base ${titleClass}`}
        >
          {title}
        </p>
        <p className="truncate text-[10px] text-slate-400 sm:text-xs">
          {subtitle}
        </p>
      </div>
    </motion.div>
  );
}

function PulseLine({
  color,
  trackClass,
  waitingForSocket,
}: {
  color: "sky" | "fuchsia";
  trackClass: string;
  waitingForSocket: boolean;
}) {
  const barClass = color === "sky" ? "bg-sky-400" : "bg-fuchsia-500";

  return (
    <div
      className={`relative h-0.5 min-w-[0.75rem] flex-1 overflow-hidden rounded-full ${trackClass}`}
    >
      {waitingForSocket ? (
        <motion.div
          animate={{ x: ["-100%", "250%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          className={`absolute inset-y-0 w-6 rounded-full sm:w-8 ${barClass}`}
        />
      ) : (
        <div className={`h-full w-full ${barClass} opacity-60`} />
      )}
    </div>
  );
}

function BridgeSegment({
  trackClass,
  barClass,
}: {
  trackClass: string;
  barClass: string;
}) {
  return (
    <div
      className={`h-0.5 w-3 shrink-0 rounded-full sm:w-4 md:w-5 ${trackClass}`}
      aria-hidden
    >
      <div className={`h-full w-full rounded-full ${barClass} opacity-70`} />
    </div>
  );
}

function Heartbeat({
  stroke,
  waitingForSocket,
  delay = 0,
}: {
  stroke: string;
  waitingForSocket: boolean;
  delay?: number;
}) {
  return (
    <motion.svg
      width="18"
      height="10"
      viewBox="0 0 26 14"
      className="hidden shrink-0 sm:block"
      animate={waitingForSocket ? { opacity: [0.2, 1, 0.2] } : { opacity: 1 }}
      transition={{ repeat: Infinity, duration: 1.3, delay }}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        points="0,7 6,7 9,1 13,13 17,4 20,7 26,7"
      />
    </motion.svg>
  );
}

function ConnectionLineRow({
  waitingForSocket,
  backendFailed,
  wifiClass,
}: {
  waitingForSocket: boolean;
  backendFailed: boolean;
  wifiClass: string;
}) {
  return (
    <div className="flex w-full min-w-0 items-center px-0.5 md:px-1">
      <PulseLine
        color="sky"
        trackClass="bg-sky-500/20"
        waitingForSocket={waitingForSocket}
      />
      <Heartbeat stroke="#38BDF8" waitingForSocket={waitingForSocket} />
      <BridgeSegment trackClass="bg-sky-500/20" barClass="bg-sky-400" />

      <motion.div
        animate={
          waitingForSocket && !backendFailed
            ? { scale: [1, 1.06, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 1.4, repeat: Infinity }}
        className="relative z-10 shrink-0"
      >
        <div
          className={`rounded-lg border p-2 shadow-[0_0_24px_rgba(59,130,246,.22)] sm:rounded-xl sm:p-2.5 ${
            backendFailed
              ? "border-red-500/40 bg-red-950/40"
              : "border-blue-500/40 bg-[#1A2B55]"
          }`}
        >
          <Wifi className={wifiClass} />
        </div>
      </motion.div>

      <BridgeSegment trackClass="bg-fuchsia-500/20" barClass="bg-fuchsia-500" />
      <Heartbeat
        stroke="#A855F7"
        waitingForSocket={waitingForSocket}
        delay={0.5}
      />
      <PulseLine
        color="fuchsia"
        trackClass="bg-fuchsia-500/20"
        waitingForSocket={waitingForSocket}
      />
    </div>
  );
}

export function ConnectIllustration({
  waitingForSocket,
  backendFailed,
}: Props) {
  const wifiClass = backendFailed
    ? "h-5 w-5 text-red-400 sm:h-6 sm:w-6"
    : "h-5 w-5 text-cyan-400 sm:h-6 sm:w-6";

  return (
    <div className="mb-5 w-full min-w-0 overflow-hidden sm:mb-6">
      {/* Mobile: stacked */}
      <div className="flex flex-col gap-2.5 sm:gap-3 md:hidden">
        <EndpointCard
          icon={Laptop}
          title="Frontend"
          subtitle="Your Application"
          titleClass="text-sky-400"
          iconClass="text-sky-400"
          iconSizeClass="h-7 w-7 sm:h-8 sm:w-8"
          slideFrom="left"
        />
        <ConnectionLineRow
          waitingForSocket={waitingForSocket}
          backendFailed={backendFailed}
          wifiClass={wifiClass}
        />
        <div className="text-center">
          <p className="text-[9px] font-medium leading-tight text-slate-300 sm:text-[10px]">
            Secure WebSocket
          </p>
          <p className="text-[8px] text-slate-500 sm:text-[9px]">Live Connection</p>
        </div>
        <EndpointCard
          icon={Server}
          title="Backend"
          subtitle="Tursor Service"
          titleClass="text-violet-400"
          iconClass="text-violet-400"
          slideFrom="right"
        />
      </div>

      {/* Desktop: cards + line row share one alignment row; labels sit below hub only */}
      <div className="hidden w-full min-w-0 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)] md:items-center md:gap-x-2 lg:gap-x-3">
        <div className="flex justify-center md:col-start-1 md:row-start-1">
          <EndpointCard
            icon={Laptop}
            title="Frontend"
            subtitle="Your Application"
            titleClass="text-sky-400"
            iconClass="text-sky-400"
            iconSizeClass="h-8 w-8 lg:h-9 lg:w-9"
            slideFrom="left"
          />
        </div>

        <div className="flex items-center md:col-start-2 md:row-start-1">
          <ConnectionLineRow
            waitingForSocket={waitingForSocket}
            backendFailed={backendFailed}
            wifiClass={wifiClass}
          />
        </div>

        <div className="flex justify-center md:col-start-3 md:row-start-1">
          <EndpointCard
            icon={Server}
            title="Backend"
            subtitle="Tursor Service"
            titleClass="text-violet-400"
            iconClass="text-violet-400"
            slideFrom="right"
          />
        </div>

        <div className="mt-1 text-center md:col-start-2 md:row-start-2 md:mt-1.5">
          <p className="text-[9px] font-medium leading-tight text-slate-300 md:text-[10px] lg:text-xs">
            Secure WebSocket
          </p>
          <p className="text-[8px] text-slate-500 md:text-[9px] lg:text-[10px]">
            Live Connection
          </p>
        </div>
      </div>
    </div>
  );
}
