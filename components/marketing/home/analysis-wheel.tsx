interface WheelLabels {
  center: string;
  terrain: string;
  medications: string;
  supplements: string;
  lifestyle: string;
  symptoms: string;
}

export function AnalysisWheel({ labels }: { labels: WheelLabels }) {
  const C = 250;
  const TEAL = "#0f766e";
  const TEAL_BRIGHT = "#2dd4bf";
  const MUTED = "#475569";
  const BG_NODE = "#050d09";

  // Node positions (r=150 from center, evenly at 72° apart starting from top)
  const nodes = [
    { x: C,   y: 100, label: labels.terrain,     anchor: "middle",  lx: C,   ly: 72  },
    { x: 393, y: 204, label: labels.medications,  anchor: "start",   lx: 420, ly: 208 },
    { x: 338, y: 371, label: labels.supplements,  anchor: "middle",  lx: 338, ly: 408 },
    { x: 162, y: 371, label: labels.lifestyle,    anchor: "middle",  lx: 162, ly: 408 },
    { x: 107, y: 204, label: labels.symptoms,     anchor: "end",     lx: 80,  ly: 208 },
  ];

  return (
    <svg
      viewBox="0 0 500 500"
      className="anim-wheel w-full max-w-[480px]"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="cg" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={TEAL} stopOpacity="0.25" />
          <stop offset="100%" stopColor={TEAL} stopOpacity="0"    />
        </radialGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Outer dashed orbit — slow CW rotation */}
      <circle className="svg-ring-cw" cx={C} cy={C} r={220}
        fill="none" stroke={TEAL} strokeWidth="0.8" strokeDasharray="6 14" opacity="0.12" />

      {/* Middle ring — slow CCW */}
      <circle className="svg-ring-ccw" cx={C} cy={C} r={185}
        fill="none" stroke={TEAL} strokeWidth="0.5" strokeDasharray="3 9" opacity="0.18" />

      {/* Inner static ring */}
      <circle cx={C} cy={C} r={140}
        fill="none" stroke={TEAL} strokeWidth="0.5" opacity="0.1" />

      {/* Connection lines */}
      {nodes.map((n, i) => (
        <line key={i} x1={C} y1={C} x2={n.x} y2={n.y}
          stroke={TEAL} strokeWidth="1" strokeDasharray="4 5" opacity="0.25" />
      ))}

      {/* Traveling dots */}
      {[1,2,3,4,5].map(i => (
        <circle key={i} r="3" fill={TEAL_BRIGHT} filter="url(#glow)"
          className={`dot-t${i}`} />
      ))}

      {/* Center glow */}
      <circle cx={C} cy={C} r={80} fill="url(#cg)" />

      {/* Center node — pulsing */}
      <circle className="svg-pulse" cx={C} cy={C} r={46}
        fill={BG_NODE} stroke={TEAL} strokeWidth="1.5" filter="url(#glow)" />
      <circle cx={C} cy={C} r={40}
        fill="none" stroke={TEAL_BRIGHT} strokeWidth="0.5" opacity="0.4" />
      <text x={C} y={C - 5} textAnchor="middle"
        fill={TEAL_BRIGHT} fontSize="8" fontFamily="monospace" letterSpacing="2" opacity="0.7">
        ANALYSE
      </text>
      <text x={C} y={C + 10} textAnchor="middle"
        fill={TEAL_BRIGHT} fontSize="13" fontWeight="700" fontFamily="monospace">
        IA
      </text>

      {/* Outer nodes */}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={22}
            fill={BG_NODE} stroke={TEAL} strokeWidth="1.5" />
          <circle cx={n.x} cy={n.y} r={5} fill={TEAL} opacity="0.8" />
          <text x={n.lx} y={n.ly} textAnchor={n.anchor as "middle" | "start" | "end"}
            fill={MUTED} fontSize="10" fontFamily="system-ui, sans-serif">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
