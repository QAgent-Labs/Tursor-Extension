type Props = {
  activeStep: 1 | 2;
};

export function SetupStepDots({ activeStep }: Props) {
  return (
    <div
      className="mt-auto flex shrink-0 justify-center gap-2 pt-6"
      aria-label={`Setup step ${activeStep} of 2`}
    >
      <span
        className={`h-2 w-2 rounded-full transition-colors ${
          activeStep === 1 ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" : "bg-slate-600"
        }`}
        aria-hidden
      />
      <span
        className={`h-2 w-2 rounded-full transition-colors ${
          activeStep === 2 ? "bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)]" : "bg-slate-600"
        }`}
        aria-hidden
      />
    </div>
  );
}
