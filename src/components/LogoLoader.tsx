import { COLORS } from "@/lib/theme";
import { LOGO_TRIANGLES } from "@/lib/logo";

// Looping logo loader: the triangles pulse in a staggered wave (green up,
// red down). Use anywhere data is loading.
export function LogoLoader({
  size = 44,
  label,
  className = "",
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        role="img"
        aria-label={label ?? "Loading"}
      >
        {LOGO_TRIANGLES.map((t, i) => (
          <path
            key={i}
            d={t.d}
            fill={COLORS.fg}
            className="tri-pulse"
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              animation: `tri-pulse 1.4s ease-in-out ${i * 0.12}s infinite`,
            }}
          />
        ))}
      </svg>
      {label && (
        <span className="text-xs uppercase tracking-widest text-[var(--c-sub)]">
          {label}
        </span>
      )}
    </div>
  );
}
