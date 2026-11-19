import { FluidParticlesBackground } from "@/components/ui/fluid-particles-background";

export function DemoFluidParticlesBackground() {
  return (
    <FluidParticlesBackground className="bg-black">
      <div className="z-10 space-y-4 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.45em] text-white/45">
          Your world. Your identity.
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-white lg:text-7xl">
          JAYVER
        </h1>
        <p className="text-sm tracking-wide text-white/50">
          A better way to play.
        </p>
      </div>
    </FluidParticlesBackground>
  );
}