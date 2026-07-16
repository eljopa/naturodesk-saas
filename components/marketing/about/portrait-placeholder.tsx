/**
 * Elegant placeholder standing in for a real photograph.
 * Swap for a Next <Image src="/images/about/elodie.jpg" .../> once the
 * actual portrait is available — the rounded frame/shadow below is sized
 * to drop a real photo in without further layout changes.
 */
export function PortraitPlaceholder({
  initials,
  size = 220,
}: {
  initials: string;
  size?: number;
}) {
  return (
    <div
      className="relative rounded-[28px] flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(150deg, var(--nd-sage-tint), var(--nd-sage-wash) 60%, #fff)",
        border: "1px solid var(--nd-line-soft)",
        boxShadow: "0 30px 60px -30px rgba(61,74,51,.35), 0 8px 20px -10px rgba(61,74,51,.14)",
      }}
    >
      <svg
        className="absolute pointer-events-none"
        style={{ top: -18, right: -18, width: size * 0.5, height: size * 0.5, opacity: 0.6 }}
        viewBox="0 0 200 200" fill="none"
      >
        <path d="M100 10C40 30 20 90 30 150c50 20 120 0 140-60C150 40 120 18 100 10Z" fill="var(--nd-sand)" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span
          className="font-serif font-medium"
          style={{ fontSize: size * 0.32, color: "var(--nd-sage-deep)" }}
        >
          {initials}
        </span>
      </div>
    </div>
  );
}
