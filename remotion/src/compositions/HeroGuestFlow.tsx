import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { theme } from '../theme';
import { playfair, inter } from '../fonts';

// Phase timings (fps=30). Total 360 frames = 12s.
const PHASE_LOGIN_END = 120; // 4.0s
const PHASE_UPLOAD_END = 270; // 9.0s
const PHASE_SUCCESS_END = 360; // 12.0s

// Paper-noise SVG tile (low-opacity turbulence) encoded as data URI.
// Used as backgroundImage for subtle letterpress grain.
const PAPER_NOISE_URI =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18  0 0 0 0 0.13  0 0 0 0 0.15  0 0 0 0.06 0'/></filter><rect width='160' height='160' filter='url(%23n)'/></svg>\")";

export const HeroGuestFlow: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.lpBg, fontFamily: inter }}>
      {/* Paper-grain overlay — subtle letterpress texture */}
      <AbsoluteFill
        style={{
          backgroundImage: PAPER_NOISE_URI,
          backgroundRepeat: 'repeat',
          opacity: 0.55,
          pointerEvents: 'none',
        }}
      />
      {/* Soft vignette — keeps the eye centered without being obvious */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 55%, ${theme.lpBorder}22 100%)`,
          pointerEvents: 'none',
        }}
      />

      <Sequence from={0} durationInFrames={PHASE_LOGIN_END}>
        <PhaseLogin />
      </Sequence>

      <Sequence from={PHASE_LOGIN_END} durationInFrames={PHASE_UPLOAD_END - PHASE_LOGIN_END}>
        <PhaseUpload />
      </Sequence>

      <Sequence from={PHASE_UPLOAD_END} durationInFrames={PHASE_SUCCESS_END - PHASE_UPLOAD_END}>
        <PhaseSuccess />
      </Sequence>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Ornamental SVG primitives — all hand-drawn paths, no icon libs.
// ─────────────────────────────────────────────────────────────────────────────

type OrnamentProps = { width?: number; opacity?: number; progress?: number };

// Thin gold flourish — botanical curve with dot accents. Mirrorable via scaleX.
const Flourish: React.FC<OrnamentProps & { mirror?: boolean }> = ({
  width = 160,
  opacity = 1,
  progress = 1,
  mirror = false,
}) => {
  const dashTotal = 220;
  const dashOffset = dashTotal - dashTotal * progress;
  return (
    <svg
      width={width}
      height={width * 0.22}
      viewBox="0 0 200 44"
      fill="none"
      style={{ opacity, transform: mirror ? 'scaleY(-1)' : undefined }}
    >
      <path
        d="M4 30 Q 40 8 74 22 T 126 22 Q 160 8 196 30"
        stroke={theme.lpAccent}
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={dashTotal}
        strokeDashoffset={dashOffset}
      />
      <circle cx="100" cy="22" r="1.6" fill={theme.lpAccent} opacity={progress} />
      <circle cx="72" cy="22" r="0.9" fill={theme.lpAccent} opacity={progress * 0.7} />
      <circle cx="128" cy="22" r="0.9" fill={theme.lpAccent} opacity={progress * 0.7} />
      <path
        d="M96 22 L100 14 L104 22 L100 30 Z"
        fill={theme.lpAccent}
        opacity={progress * 0.9}
      />
    </svg>
  );
};

// Horizontal ornamental divider with centered diamond glyph. Uses real unicode.
const DiamondDivider: React.FC<{ width?: number; opacity?: number; color?: string }> = ({
  width = 240,
  opacity = 1,
  color = theme.lpAccent,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      width,
      opacity,
    }}
  >
    <div style={{ flex: 1, height: 1, backgroundColor: color, opacity: 0.55 }} />
    <span
      style={{
        fontFamily: playfair,
        fontSize: 14,
        color,
        letterSpacing: '0.1em',
        lineHeight: 1,
        transform: 'translateY(-1px)',
      }}
    >
      ◇
    </span>
    <div style={{ flex: 1, height: 1, backgroundColor: color, opacity: 0.55 }} />
  </div>
);

// Tiny corner botanical — a single curving stem with two leaf-dots.
const CornerBotanical: React.FC<{ size?: number; opacity?: number; rotate?: number }> = ({
  size = 44,
  opacity = 0.28,
  rotate = 0,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    style={{ opacity, transform: `rotate(${rotate}deg)` }}
  >
    <path
      d="M4 44 Q 16 30 22 20 Q 28 10 44 4"
      stroke={theme.lpAccent}
      strokeWidth="0.9"
      strokeLinecap="round"
      fill="none"
    />
    <ellipse cx="16" cy="28" rx="2.2" ry="1" fill={theme.lpAccent} transform="rotate(-40 16 28)" />
    <ellipse cx="30" cy="14" rx="2.2" ry="1" fill={theme.lpAccent} transform="rotate(-40 30 14)" />
    <circle cx="44" cy="4" r="1.2" fill={theme.lpAccent} />
  </svg>
);

// Minimal camera glyph for polaroid centers.
const CameraGlyph: React.FC<{ size?: number; color?: string }> = ({
  size = 22,
  color = theme.lpMutedForeground,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

// Thin check for modal completion — rendered in gold, not green.
const ThinCheck: React.FC<{ size?: number; color?: string; progress?: number }> = ({
  size = 14,
  color = theme.lpAccent,
  progress = 1,
}) => {
  const dashLen = 24;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12 L10 17 L19 7"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={dashLen}
        strokeDashoffset={dashLen - dashLen * progress}
      />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — "The Invitation" (0-120 frames, 4.0s)
// ─────────────────────────────────────────────────────────────────────────────

const PhaseLogin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Flourishes draw in first — establishes the stationery.
  const flourishProgress = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  const cornerOpacity = interpolate(frame, [6, 28], [0, 1], { extrapolateRight: 'clamp' });

  // Monogram slides in softly.
  const monogramY = interpolate(frame, [10, 30], [-14, 0], { extrapolateRight: 'clamp' });
  const monogramOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: 'clamp' });

  // Content card: whole column materializes after monogram settles.
  const cardY = interpolate(frame, [20, 40], [20, 0], { extrapolateRight: 'clamp' });
  const cardOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' });

  // Typewriter fills — values rendered in Playfair Italic.
  const firstNameChars = Math.floor(
    interpolate(frame, [40, 54], [0, 3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  );
  const lastNameChars = Math.floor(
    interpolate(frame, [58, 78], [0, 8], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  );
  const emailChars = Math.floor(
    interpolate(frame, [82, 102], [0, 17], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  );

  // Button gently emerges (no pulse — editorial is still).
  const buttonSpring = spring({ frame: frame - 100, fps, config: { damping: 18, stiffness: 120 } });
  const buttonScale = interpolate(buttonSpring, [0, 1], [0.97, 1]);

  // Exit transition.
  const exitY = interpolate(frame, [108, 120], [0, -22], { extrapolateLeft: 'clamp' });
  const exitOpacity = interpolate(frame, [108, 120], [1, 0], { extrapolateLeft: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        padding: '60px 44px',
        opacity: exitOpacity,
        transform: `translateY(${exitY}px)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {/* Corner botanical watermarks */}
      <div style={{ position: 'absolute', top: 44, left: 32, opacity: cornerOpacity }}>
        <CornerBotanical size={48} opacity={0.3} rotate={0} />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 44,
          right: 32,
          opacity: cornerOpacity,
          transform: 'rotate(180deg)',
        }}
      >
        <CornerBotanical size={48} opacity={0.3} rotate={0} />
      </div>

      {/* Top flourish */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
        <Flourish width={180} opacity={0.9} progress={flourishProgress} />
      </div>

      {/* Monogram A × M */}
      <div
        style={{
          opacity: monogramOpacity,
          transform: `translateY(${monogramY}px)`,
          textAlign: 'center',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontFamily: playfair,
            fontStyle: 'italic',
            fontSize: 44,
            fontWeight: 400,
            color: theme.lpAccent,
            letterSpacing: '0.08em',
            lineHeight: 1,
          }}
        >
          A <span style={{ fontSize: 32, opacity: 0.8 }}>×</span> M
        </div>
      </div>

      {/* Diamond divider */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 22,
          opacity: monogramOpacity,
        }}
      >
        <DiamondDivider width={280} opacity={0.9} />
      </div>

      {/* Greeting */}
      <div
        style={{
          opacity: cardOpacity,
          transform: `translateY(${cardY}px)`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: playfair,
            fontStyle: 'italic',
            fontSize: 38,
            fontWeight: 400,
            color: theme.lpText,
            lineHeight: 1,
            marginBottom: 6,
          }}
        >
          Hvala
        </div>
        <div
          style={{
            fontFamily: playfair,
            fontStyle: 'italic',
            fontSize: 18,
            fontWeight: 400,
            color: theme.lpMutedForeground,
            marginBottom: 26,
          }}
        >
          što dolazite na venčanje
        </div>

        {/* Date/place line — small-caps tracked between two thin rules */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 36,
          }}
        >
          <div style={{ flex: 1, height: 1, backgroundColor: theme.lpBorder }} />
          <span
            style={{
              fontFamily: inter,
              fontSize: 11,
              fontWeight: 500,
              color: theme.lpMutedForeground,
              textTransform: 'uppercase',
              letterSpacing: '0.25em',
              whiteSpace: 'nowrap',
            }}
          >
            20 · IV · MMXXVI &nbsp;·&nbsp; GRADIŠKA
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: theme.lpBorder }} />
        </div>

        {/* Three input rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, textAlign: 'left' }}>
          <StationeryField
            label="ime"
            placeholder="ana"
            value={'Ana'.slice(0, firstNameChars)}
            typing={firstNameChars > 0 && firstNameChars < 3}
          />
          <StationeryField
            label="prezime"
            placeholder="marković"
            value={'Marković'.slice(0, lastNameChars)}
            typing={lastNameChars > 0 && lastNameChars < 8}
          />
          <StationeryField
            label="email"
            placeholder="ana.m@example.com"
            value={'ana.m@example.com'.slice(0, emailChars)}
            typing={emailChars > 0 && emailChars < 17}
          />
        </div>

        {/* Ivory button with rose text + 1px rose border */}
        <div
          style={{
            marginTop: 30,
            padding: '15px 22px',
            backgroundColor: theme.lpBg,
            color: theme.lpPrimaryDark,
            border: `1px solid ${theme.lpPrimary}`,
            fontFamily: inter,
            fontWeight: 500,
            fontSize: 12,
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            transform: `scale(${buttonScale})`,
          }}
        >
          Prijavi se
        </div>

        {/* Tiny consent footnote */}
        <div
          style={{
            marginTop: 14,
            fontFamily: playfair,
            fontStyle: 'italic',
            fontSize: 10,
            color: theme.lpMutedForeground,
            opacity: 0.75,
            textAlign: 'center',
            letterSpacing: '0.02em',
          }}
        >
          prijavljujem se u skladu sa uslovima korišćenja
        </div>
      </div>

      {/* Bottom flourish — mirror of top */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}>
        <Flourish width={180} opacity={0.9} progress={flourishProgress} mirror />
      </div>
    </AbsoluteFill>
  );
};

const StationeryField: React.FC<{
  label: string;
  placeholder: string;
  value: string;
  typing: boolean;
}> = ({ label, placeholder, value, typing }) => {
  const hasValue = value.length > 0;
  return (
    <div>
      <div
        style={{
          fontFamily: inter,
          fontSize: 10,
          fontWeight: 500,
          color: theme.lpMutedForeground,
          textTransform: 'uppercase',
          letterSpacing: '0.28em',
          marginBottom: 7,
        }}
      >
        {label}
      </div>
      <div
        style={{
          padding: '11px 14px',
          backgroundColor: theme.lpCard,
          border: `1px solid ${hasValue ? theme.lpPrimary : theme.lpBorder}`,
          fontSize: 15,
          minHeight: 22,
          fontFamily: hasValue ? playfair : inter,
          fontStyle: hasValue ? 'italic' : 'normal',
          color: hasValue ? theme.lpText : theme.lpMutedForeground + '88',
          letterSpacing: hasValue ? '0.01em' : '0.02em',
        }}
      >
        {hasValue ? value : placeholder}
        {typing && (
          <span style={{ opacity: 0.5, marginLeft: 2, color: theme.lpPrimaryDark }}>|</span>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — "The Album" (120-270 frames, 5.0s)
// ─────────────────────────────────────────────────────────────────────────────

const PhaseUpload: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header enters from below.
  const headerOpacity = interpolate(f, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const headerY = interpolate(f, [0, 18], [18, 0], { extrapolateRight: 'clamp' });

  // Slot bar and labels.
  const slotOpacity = interpolate(f, [12, 30], [0, 1], { extrapolateRight: 'clamp' });
  const slotY = interpolate(f, [12, 30], [14, 0], { extrapolateRight: 'clamp' });

  // Filled count 0 → 3 as polaroids pin themselves.
  const filledSlots = Math.min(
    3,
    Math.floor(
      interpolate(f, [50, 68, 80], [0, 1.5, 3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    )
  );

  // Slot-bar fill tweens continuously (not stepped) for calm motion.
  // Target 3/10 slots = 30% fill at the end.
  const slotFillCount = interpolate(f, [50, 68, 80], [0, 1.5, 3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Thumbnails materialize sequentially — no dropzone to fade out.
  const thumb1 = interpolate(f, [48, 66], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const thumb2 = interpolate(f, [58, 76], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const thumb3 = interpolate(f, [68, 86], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Modal overlay.
  const modalOpacity = interpolate(f, [92, 108], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const modalExit = interpolate(f, [138, 150], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const modalCombined = modalOpacity * modalExit;

  // Dim behind modal.
  const backgroundDim = 1 - modalCombined * 0.6;

  // Per-row progress.
  const bar1 = interpolate(f, [102, 122], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bar2 = interpolate(f, [110, 130], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bar3 = interpolate(f, [118, 138], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const modalScale = interpolate(modalOpacity, [0, 1], [0.96, 1]);

  return (
    <AbsoluteFill>
      {/* Background content — dimmed when modal is up */}
      <AbsoluteFill
        style={{
          padding: '60px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          opacity: backgroundDim,
        }}
      >
        {/* Greeting — Ana ✧ 20. april */}
        <div
          style={{
            opacity: headerOpacity,
            transform: `translateY(${headerY}px)`,
            textAlign: 'center',
            marginBottom: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontFamily: playfair,
                fontStyle: 'italic',
                fontSize: 24,
                color: theme.lpText,
              }}
            >
              Ana
            </span>
            <span
              style={{
                fontFamily: playfair,
                fontSize: 14,
                color: theme.lpAccent,
                letterSpacing: '0.1em',
              }}
            >
              ✧
            </span>
            <span
              style={{
                fontFamily: inter,
                fontSize: 11,
                color: theme.lpMutedForeground,
                textTransform: 'uppercase',
                letterSpacing: '0.28em',
                fontWeight: 500,
              }}
            >
              20 · IV · MMXXVI
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
            <DiamondDivider width={220} opacity={0.85} />
          </div>
        </div>

        {/* Slot bar — small-caps label + count */}
        <div
          style={{
            opacity: slotOpacity,
            transform: `translateY(${slotY}px)`,
            marginTop: 22,
            marginBottom: 22,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontFamily: inter,
                fontSize: 11,
                fontWeight: 500,
                color: theme.lpMutedForeground,
                textTransform: 'uppercase',
                letterSpacing: '0.3em',
              }}
            >
              Slike
            </span>
            <span
              style={{
                fontFamily: playfair,
                fontStyle: 'italic',
                fontSize: 14,
                color: theme.lpText,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {filledSlots} <span style={{ color: theme.lpMutedForeground }}>/</span> 10
            </span>
          </div>

          {/* Border-framed thin bar */}
          <div
            style={{
              padding: 2,
              border: `1px solid ${theme.lpAccent}80`,
            }}
          >
            <div
              style={{
                height: 6,
                backgroundColor: theme.lpMuted,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${(slotFillCount / 10) * 100}%`,
                  backgroundColor: theme.lpPrimary,
                }}
              />
            </div>
          </div>

          <div
            style={{
              fontFamily: playfair,
              fontStyle: 'italic',
              fontSize: 11,
              color: theme.lpMutedForeground,
              marginTop: 8,
              textAlign: 'right',
            }}
          >
            Odabrano: {filledSlots} od ukupno 10
          </div>
        </div>

        {/* "— × —" small ornament before the polaroid row */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: slotOpacity }}>
            <div style={{ width: 48, height: 1, backgroundColor: theme.lpAccent, opacity: 0.6 }} />
            <span
              style={{
                fontFamily: playfair,
                fontStyle: 'italic',
                fontSize: 14,
                color: theme.lpAccent,
              }}
            >
              ×
            </span>
            <div style={{ width: 48, height: 1, backgroundColor: theme.lpAccent, opacity: 0.6 }} />
          </div>
        </div>

        {/* Polaroid row — 3 pinned photos, slight rotations */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}
        >
          <Polaroid opacity={thumb1} rotate={-2.5} caption="IMG · 01" tone="rose" />
          <Polaroid opacity={thumb2} rotate={1.2} caption="IMG · 02" tone="gold" />
          <Polaroid opacity={thumb3} rotate={-1} caption="IMG · 03" tone="blend" />
        </div>
      </AbsoluteFill>

      {/* Modal card — centered, no dark backdrop, just content dim */}
      {modalCombined > 0.01 && (
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px 44px',
            opacity: modalCombined,
            transform: `scale(${modalScale})`,
          }}
        >
          <div
            style={{
              backgroundColor: theme.lpCard,
              border: `1px solid ${theme.lpAccent}`,
              padding: '26px 22px',
              boxShadow: `0 20px 48px ${theme.lpPrimary}25, 0 6px 14px ${theme.lpAccent}20`,
            }}
          >
            {/* Tiny small-caps heading, no emoji, no green */}
            <div
              style={{
                fontFamily: inter,
                fontSize: 10,
                color: theme.lpMutedForeground,
                textTransform: 'uppercase',
                letterSpacing: '0.35em',
                textAlign: 'center',
                marginBottom: 4,
              }}
            >
              prenos
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <DiamondDivider width={180} opacity={0.7} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ModalRow filename="IMG · 01.jpg" progress={bar1} tone="rose" />
              <ModalRow filename="IMG · 02.jpg" progress={bar2} tone="gold" />
              <ModalRow filename="IMG · 03.jpg" progress={bar3} tone="blend" />
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

type Tone = 'rose' | 'gold' | 'blend';

const toneBg: Record<Tone, string> = {
  rose: theme.lpPrimarySoft,
  gold: theme.lpAccentSoft,
  blend: theme.lpMuted,
};

const Polaroid: React.FC<{ opacity: number; rotate: number; caption: string; tone: Tone }> = ({
  opacity,
  rotate,
  caption,
  tone,
}) => {
  const scale = 0.94 + opacity * 0.06;
  return (
    <div
      style={{
        opacity,
        transform: `rotate(${rotate}deg) scale(${scale})`,
        backgroundColor: theme.lpCard,
        border: `1px solid ${theme.lpBorder}`,
        padding: '8px 8px 26px 8px',
        boxShadow: opacity > 0.5 ? `0 6px 14px ${theme.lpText}12` : 'none',
        position: 'relative',
      }}
    >
      {/* Photo area */}
      <div
        style={{
          aspectRatio: '1 / 1.05',
          backgroundColor: toneBg[tone],
          borderTop: `1px solid ${theme.lpBorder}80`,
          borderLeft: `1px solid ${theme.lpBorder}80`,
          borderRight: `1px solid ${theme.lpBorder}80`,
          borderBottom: `1px solid ${theme.lpBorder}80`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Very soft inner highlight — paper feel, not glass */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at 30% 25%, ${theme.lpBg}88 0%, transparent 60%)`,
          }}
        />
        <CameraGlyph size={26} color={theme.lpMutedForeground + 'cc'} />
      </div>

      {/* Caption strip */}
      <div
        style={{
          position: 'absolute',
          bottom: 6,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: inter,
          fontSize: 8,
          color: theme.lpMutedForeground,
          textTransform: 'uppercase',
          letterSpacing: '0.28em',
          fontWeight: 500,
        }}
      >
        {caption}
      </div>
    </div>
  );
};

const ModalRow: React.FC<{ filename: string; progress: number; tone: Tone }> = ({
  filename,
  progress,
  tone,
}) => {
  const done = progress >= 0.999;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {/* Small photo swatch */}
      <div
        style={{
          width: 30,
          height: 30,
          backgroundColor: toneBg[tone],
          border: `1px solid ${theme.lpBorder}`,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CameraGlyph size={14} color={theme.lpMutedForeground + '99'} />
      </div>

      {/* Filename + thin progress rail */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: inter,
            fontSize: 10,
            color: theme.lpText,
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            marginBottom: 6,
            fontWeight: 500,
          }}
        >
          {filename}
        </div>
        <div
          style={{
            height: 2,
            backgroundColor: theme.lpMuted,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: `${progress * 100}%`,
              backgroundColor: theme.lpPrimary,
            }}
          />
        </div>
      </div>

      {/* Gold check on completion — no percentage */}
      <div style={{ width: 18, display: 'flex', justifyContent: 'center' }}>
        {done ? <ThinCheck size={14} color={theme.lpAccent} progress={1} /> : null}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — "The Thank You" (270-360 frames, 3.0s)
// ─────────────────────────────────────────────────────────────────────────────

const PhaseSuccess: React.FC = () => {
  const f = useCurrentFrame();

  // Flourishes draw in first.
  const flourishProgress = interpolate(f, [0, 24], [0, 1], { extrapolateRight: 'clamp' });

  const titleOpacity = interpolate(f, [8, 24], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(f, [8, 24], [12, 0], { extrapolateRight: 'clamp' });

  // Underline sweeps in after heading.
  const underlineProgress = interpolate(f, [24, 42], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const subtitleOpacity = interpolate(f, [30, 48], [0, 1], { extrapolateRight: 'clamp' });

  // Monogram card fades in last.
  const cardOpacity = interpolate(f, [42, 62], [0, 1], { extrapolateRight: 'clamp' });
  const cardY = interpolate(f, [42, 62], [14, 0], { extrapolateRight: 'clamp' });

  // Loop fade.
  const loopFade = interpolate(f, [80, 90], [1, 0], { extrapolateLeft: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        padding: '52px 44px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: loopFade,
      }}
    >
      {/* Sparse gold foil flecks — 12 pieces, tasteful */}
      <FoilFlecks frame={f} />

      {/* Top flourish */}
      <Flourish width={200} opacity={1} progress={flourishProgress} />

      {/* Hvala heading */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          marginTop: 28,
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            fontFamily: playfair,
            fontStyle: 'italic',
            fontSize: 66,
            fontWeight: 400,
            color: theme.lpText,
            lineHeight: 1,
            letterSpacing: '0.01em',
          }}
        >
          Hvala
        </div>
        {/* Thin gold draw-in underline */}
        <div
          style={{
            margin: '10px auto 0',
            height: 1,
            width: 100,
            backgroundColor: theme.lpAccent,
            transformOrigin: 'left center',
            transform: `scaleX(${underlineProgress})`,
          }}
        />
      </div>

      {/* Subtitle */}
      <div
        style={{
          opacity: subtitleOpacity,
          fontFamily: playfair,
          fontStyle: 'italic',
          fontSize: 20,
          fontWeight: 400,
          color: theme.lpMutedForeground,
          textAlign: 'center',
          lineHeight: 1.4,
          marginTop: 24,
          marginBottom: 34,
        }}
      >
        što ste<br />
        podijelili<br />
        uspomenu
      </div>

      {/* Monogram card */}
      <div
        style={{
          opacity: cardOpacity,
          transform: `translateY(${cardY}px)`,
          border: `1px solid ${theme.lpAccent}`,
          backgroundColor: theme.lpCard,
          padding: '28px 36px',
          textAlign: 'center',
          boxShadow: `0 8px 22px ${theme.lpAccent}18`,
        }}
      >
        <div
          style={{
            fontFamily: playfair,
            fontStyle: 'italic',
            fontSize: 64,
            fontWeight: 400,
            color: theme.lpAccent,
            letterSpacing: '0.06em',
            lineHeight: 1,
          }}
        >
          A <span style={{ fontSize: 44, opacity: 0.85 }}>×</span> M
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
          <DiamondDivider width={160} opacity={0.8} />
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: inter,
            fontSize: 10,
            color: theme.lpMutedForeground,
            textTransform: 'lowercase',
            letterSpacing: '0.35em',
            fontWeight: 500,
          }}
        >
          20 april mmxxvi
        </div>
      </div>

      {/* Bottom flourish (mirror) */}
      <div style={{ marginTop: 28 }}>
        <Flourish width={200} opacity={1} progress={flourishProgress} mirror />
      </div>
    </AbsoluteFill>
  );
};

// Deterministic pseudo-random for foil flecks.
function seededRand(seed: number): number {
  const x = Math.sin(seed * 9973.1) * 43758.5453;
  return x - Math.floor(x);
}

// 12 tiny gold foil rectangles — sparse, slow, tasteful.
const FoilFlecks: React.FC<{ frame: number }> = ({ frame }) => {
  const pieces = Array.from({ length: 12 }, (_, i) => {
    const startX = 6 + seededRand(i + 1) * 88; // % width, inset from edges
    const delay = seededRand(i + 17) * 30;
    const fallTotal = 900 + seededRand(i + 7) * 300;
    const localFrame = Math.max(0, frame - delay);
    const y = interpolate(localFrame, [0, 80], [-20, fallTotal], { extrapolateRight: 'clamp' });
    const drift = Math.sin(localFrame * 0.07 + i) * 10;
    const rotate = localFrame * (1.5 + seededRand(i + 41) * 2) + i * 23;
    const opacity = interpolate(localFrame, [0, 8, 70, 85], [0, 0.85, 0.85, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const w = 3 + seededRand(i + 29) * 1.5;
    const h = 1 + seededRand(i + 31) * 0.8;
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          top: 0,
          left: `${startX}%`,
          width: w,
          height: h,
          backgroundColor: theme.lpAccent,
          transform: `translate(${drift}px, ${y}px) rotate(${rotate}deg)`,
          opacity,
        }}
      />
    );
  });
  return <AbsoluteFill style={{ pointerEvents: 'none' }}>{pieces}</AbsoluteFill>;
};
