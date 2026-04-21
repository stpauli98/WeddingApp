import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { theme } from '../theme';
import { playfair, inter } from '../fonts';

// Phase timings (fps=30). Total 360 frames = 12s.
const PHASE_LOGIN_END = 120;   // 4.0s
const PHASE_UPLOAD_END = 270;  // 9.0s
const PHASE_SUCCESS_END = 360; // 12.0s

export const HeroGuestFlow: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.lpBg, fontFamily: inter }}>
      {/* Warm ivory → soft pink gradient backdrop for wedding warmth */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${theme.lpBg} 0%, ${theme.lpPrimarySoft}55 100%)`,
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
// Inline Lucide icon components (SVG paths copied from lucide-react).
// ─────────────────────────────────────────────────────────────────────────────

type IconProps = { size?: number; color?: string; stroke?: number; fill?: string };

const CalendarIcon: React.FC<IconProps> = ({ size = 20, color = theme.lpMutedForeground, stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const MapPinIcon: React.FC<IconProps> = ({ size = 20, color = theme.lpMutedForeground, stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const HeartIcon: React.FC<IconProps> = ({ size = 20, color = theme.lpPrimary, stroke = 2, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const CheckIcon: React.FC<IconProps> = ({ size = 20, color = theme.lpSuccess, stroke = 3 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const UploadIcon: React.FC<IconProps> = ({ size = 40, color = theme.lpMutedForeground, stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

// Spinning loader (uses frame for rotation via caller).
const LoaderIcon: React.FC<IconProps & { rotate?: number }> = ({ size = 18, color = theme.lpPrimary, stroke = 2.5, rotate = 0 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${rotate}deg)` }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

// Small decorative heart for corners.
const CornerHeart: React.FC<{ size?: number; opacity?: number; rotate?: number; color?: string }> = ({ size = 28, opacity = 0.35, rotate = 0, color = theme.lpAccent }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ opacity, transform: `rotate(${rotate}deg)` }}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

// Interlocking rings (wedding bands) for the login header.
const WeddingRings: React.FC<{ size?: number; opacity?: number }> = ({ size = 42, opacity = 0.75 }) => (
  <svg width={size} height={size} viewBox="0 0 48 32" fill="none" style={{ opacity }}>
    <circle cx="18" cy="16" r="11" stroke={theme.lpAccent} strokeWidth="2" fill="none" />
    <circle cx="30" cy="16" r="11" stroke={theme.lpPrimary} strokeWidth="2" fill="none" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — Login (0-120 frames, 4.0s)
// ─────────────────────────────────────────────────────────────────────────────

const PhaseLogin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerY = interpolate(frame, [0, 18], [-30, 0], { extrapolateRight: 'clamp' });
  const headerOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });

  const cardY = interpolate(frame, [12, 30], [40, 0], { extrapolateRight: 'clamp' });
  const cardOpacity = interpolate(frame, [12, 30], [0, 1], { extrapolateRight: 'clamp' });

  // Typewriter fills for the 3 inputs.
  const firstNameChars = Math.floor(interpolate(frame, [32, 48], [0, 3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const lastNameChars = Math.floor(interpolate(frame, [52, 72], [0, 8], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const emailChars = Math.floor(interpolate(frame, [76, 96], [0, 19], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

  // Consent checkbox check at frame ~96.
  const checkFill = interpolate(frame, [96, 104], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Submit button pulse (after form is filled).
  const buttonScale = spring({ frame: frame - 100, fps, config: { damping: 12, stiffness: 160 } });
  const buttonPulse = interpolate(buttonScale, [0, 1], [1, 1.05]);

  // Exit transition.
  const exitY = interpolate(frame, [108, 120], [0, -30], { extrapolateLeft: 'clamp' });
  const exitOpacity = interpolate(frame, [108, 120], [1, 0], { extrapolateLeft: 'clamp' });

  // Corner heart decorations — subtle floating.
  const heartFloat = Math.sin(frame * 0.08) * 4;

  return (
    <AbsoluteFill
      style={{
        padding: '60px 36px',
        opacity: exitOpacity,
        transform: `translateY(${exitY}px)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {/* Decorative corner hearts */}
      <div style={{ position: 'absolute', top: 50 + heartFloat, left: 28 }}>
        <CornerHeart size={24} opacity={0.25} rotate={-15} color={theme.lpAccent} />
      </div>
      <div style={{ position: 'absolute', top: 80 - heartFloat, right: 36 }}>
        <CornerHeart size={20} opacity={0.3} rotate={20} color={theme.lpPrimary} />
      </div>
      <div style={{ position: 'absolute', bottom: 70 + heartFloat, left: 44 }}>
        <CornerHeart size={18} opacity={0.22} rotate={-25} color={theme.lpPrimary} />
      </div>
      <div style={{ position: 'absolute', bottom: 90 - heartFloat, right: 30 }}>
        <CornerHeart size={22} opacity={0.28} rotate={15} color={theme.lpAccent} />
      </div>

      {/* Header: rings + couple name + date */}
      <div
        style={{
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
          marginBottom: 28,
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <WeddingRings size={48} opacity={0.8} />
        </div>
        <div
          style={{
            fontFamily: playfair,
            fontSize: 36,
            fontWeight: 700,
            color: theme.lpText,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          Prijavi se
        </div>
        <div style={{ fontSize: 15, color: theme.lpMutedForeground, marginTop: 8, fontWeight: 500 }}>
          Ana &amp; Marko · 20. april 2026.
        </div>
        <div
          style={{
            width: 60,
            height: 2,
            backgroundColor: theme.lpAccent,
            margin: '14px auto 0',
            opacity: 0.6,
            borderRadius: 1,
          }}
        />
      </div>

      {/* Card with 3 labeled inputs + consent + button */}
      <div
        style={{
          opacity: cardOpacity,
          transform: `translateY(${cardY}px)`,
          backgroundColor: theme.lpCard,
          border: `1px solid ${theme.lpBorder}`,
          borderRadius: 20,
          padding: '24px 22px',
          boxShadow: `0 8px 24px ${theme.lpPrimary}15`,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <LabeledField label="Ime" placeholder="Vaše ime" value={'Ana'.slice(0, firstNameChars)} />
        <LabeledField label="Prezime" placeholder="Vaše prezime" value={'Marković'.slice(0, lastNameChars)} />
        <LabeledField label="Email" placeholder="vase.ime@email.com" value={'ana.m@example.com'.slice(0, emailChars)} />

        {/* Consent row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            marginTop: 4,
            fontSize: 12,
            color: theme.lpMutedForeground,
            lineHeight: 1.35,
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              border: `1.5px solid ${theme.lpBorder}`,
              backgroundColor: checkFill > 0 ? theme.lpPrimary : theme.lpCard,
              borderColor: checkFill > 0 ? theme.lpPrimary : theme.lpBorder,
              flexShrink: 0,
              marginTop: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            {checkFill > 0.3 && <CheckIcon size={11} color="#ffffff" stroke={4} />}
          </div>
          <span>Slažem se sa uslovima korišćenja i politikom privatnosti.</span>
        </div>

        {/* Submit button */}
        <div
          style={{
            marginTop: 10,
            padding: '14px 20px',
            background: `linear-gradient(135deg, ${theme.lpPrimary} 0%, ${theme.lpPrimaryDark} 100%)`,
            color: '#ffffff',
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 15,
            textAlign: 'center',
            transform: `scale(${buttonPulse})`,
            boxShadow: `0 6px 16px ${theme.lpPrimary}50`,
            letterSpacing: '0.01em',
          }}
        >
          Prijavi se
        </div>
      </div>
    </AbsoluteFill>
  );
};

const LabeledField: React.FC<{ label: string; placeholder: string; value: string }> = ({ label, placeholder, value }) => {
  const showCursor = value.length > 0 && value.length < placeholder.length + 10;
  return (
    <div>
      <div style={{ fontSize: 12, color: theme.lpText, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div
        style={{
          padding: '11px 14px',
          backgroundColor: theme.lpCard,
          border: `1.5px solid ${value.length > 0 ? theme.lpPrimary + '80' : theme.lpBorder}`,
          borderRadius: 10,
          fontSize: 14,
          color: value.length > 0 ? theme.lpText : theme.lpMutedForeground + 'aa',
          minHeight: 20,
          transition: 'border-color 0.2s',
        }}
      >
        {value.length > 0 ? value : placeholder}
        {showCursor && <span style={{ opacity: 0.6, marginLeft: 1 }}>|</span>}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — Upload flow (120-270 frames, 5.0s, localFrame 0-150)
// ─────────────────────────────────────────────────────────────────────────────

const PhaseUpload: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Enter from bottom.
  const headerY = interpolate(f, [0, 18], [30, 0], { extrapolateRight: 'clamp' });
  const headerOpacity = interpolate(f, [0, 18], [0, 1], { extrapolateRight: 'clamp' });

  const slotBarOpacity = interpolate(f, [10, 26], [0, 1], { extrapolateRight: 'clamp' });
  const slotBarY = interpolate(f, [10, 26], [20, 0], { extrapolateRight: 'clamp' });

  // ImageSlotBar counter 0 → 3 as thumbnails appear.
  const filledSlots = Math.min(
    3,
    Math.floor(interpolate(f, [60, 75, 85], [0, 1.5, 3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))
  );

  // Dropzone visible early; scales slightly on "click" at ~frame 45.
  const dropzoneOpacity = interpolate(f, [16, 32], [0, 1], { extrapolateRight: 'clamp' });
  const dropzoneY = interpolate(f, [16, 32], [30, 0], { extrapolateRight: 'clamp' });
  const dropzoneClick = spring({ frame: f - 45, fps, config: { damping: 15, stiffness: 200 } });
  const dropzoneScale = 1 - interpolate(dropzoneClick, [0, 1], [0, 0.03]);
  const dropzoneHideOpacity = interpolate(f, [55, 70], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Thumbnails fade/scale in sequentially.
  const thumb1 = interpolate(f, [60, 76], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const thumb2 = interpolate(f, [68, 84], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const thumb3 = interpolate(f, [76, 92], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Upload modal overlay comes in around frame 92, progresses bars, exits.
  const modalOpacity = interpolate(f, [92, 106], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const modalExit = interpolate(f, [138, 148], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const modalCombined = modalOpacity * modalExit;
  const modalScale = interpolate(modalOpacity, [0, 1], [0.92, 1]);

  // Per-row progress.
  const bar1 = interpolate(f, [102, 120], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bar2 = interpolate(f, [110, 128], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bar3 = interpolate(f, [118, 136], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const loaderRotate = (f * 12) % 360;

  const remaining = 10 - filledSlots;

  return (
    <AbsoluteFill
      style={{
        padding: '60px 32px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {/* Greeting + info row */}
      <div
        style={{
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
          marginBottom: 22,
          textAlign: 'center',
        }}
      >
        <div style={{ fontFamily: playfair, fontSize: 24, fontWeight: 700, color: theme.lpText, letterSpacing: '-0.01em' }}>
          Dobrodošla, Ana
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            marginTop: 8,
            fontSize: 12,
            color: theme.lpMutedForeground,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <CalendarIcon size={14} />
            20. april 2026.
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <MapPinIcon size={14} />
            Podgorica
          </span>
        </div>
      </div>

      {/* ImageSlotBar */}
      <div
        style={{
          opacity: slotBarOpacity,
          transform: `translateY(${slotBarY}px)`,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
            fontSize: 12,
            color: theme.lpMutedForeground,
            fontWeight: 500,
          }}
        >
          <span>Slike</span>
          <span style={{ fontFamily: inter, fontWeight: 700, color: theme.lpText, fontVariantNumeric: 'tabular-nums' }}>
            {filledSlots} / 10
          </span>
        </div>
        <div
          style={{
            height: 16,
            backgroundColor: theme.lpMuted,
            borderRadius: 8,
            border: `1px solid ${theme.lpAccent}50`,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${(filledSlots / 10) * 100}%`,
              background: `linear-gradient(90deg, ${theme.lpPrimary} 0%, ${theme.lpPrimaryDark} 100%)`,
              borderRadius: 7,
              transition: 'width 0.3s',
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: theme.lpMutedForeground, marginTop: 6, textAlign: 'right' }}>
          Možete dodati još {remaining} slika
        </div>
      </div>

      {/* Dropzone + thumbnails occupy the same slot — stacked with opacity transitions */}
      <div style={{ position: 'relative', minHeight: 170, marginBottom: 8 }}>
        {/* Dropzone */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: dropzoneOpacity * dropzoneHideOpacity,
            transform: `translateY(${dropzoneY}px) scale(${dropzoneScale})`,
            border: `2px dashed ${theme.lpBorder}`,
            borderRadius: 14,
            padding: '28px 16px',
            backgroundColor: theme.lpCard + 'cc',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <UploadIcon size={36} color={theme.lpMutedForeground} />
          <div style={{ fontSize: 13, color: theme.lpMutedForeground, fontWeight: 500, lineHeight: 1.4 }}>
            Prevucite slike ovde ili
            <br />
            kliknite za odabir
          </div>
        </div>

        {/* Thumbnail grid in same slot — overlaps dropzone as dropzone fades */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            opacity: 1 - dropzoneHideOpacity,
          }}
        >
          <Thumbnail
            opacity={thumb1}
            gradient={`linear-gradient(135deg, ${theme.lpAccent} 0%, ${theme.lpAccentSoft} 100%)`}
            filename="IMG_4821"
          />
          <Thumbnail
            opacity={thumb2}
            gradient={`linear-gradient(135deg, ${theme.lpPrimary} 0%, ${theme.lpPrimarySoft} 100%)`}
            filename="IMG_4822"
          />
          <Thumbnail
            opacity={thumb3}
            gradient={`linear-gradient(135deg, ${theme.lpAccent} 0%, ${theme.lpPrimarySoft} 100%)`}
            filename="IMG_4823"
          />
        </div>
      </div>

      {/* Upload modal overlay */}
      {modalCombined > 0.01 && (
        <>
          {/* Backdrop */}
          <AbsoluteFill
            style={{
              backgroundColor: `rgba(0, 0, 0, ${0.5 * modalCombined})`,
            }}
          />
          {/* Card */}
          <AbsoluteFill
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '60px 32px',
              opacity: modalCombined,
              transform: `scale(${modalScale})`,
            }}
          >
            <div
              style={{
                backgroundColor: theme.lpCard,
                borderRadius: 18,
                padding: '22px 18px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                border: `1px solid ${theme.lpBorder}`,
              }}
            >
              <div
                style={{
                  fontFamily: playfair,
                  fontSize: 17,
                  fontWeight: 700,
                  color: theme.lpText,
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                Status uploada slika
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <UploadRow
                  gradient={`linear-gradient(135deg, ${theme.lpAccent} 0%, ${theme.lpAccentSoft} 100%)`}
                  filename="IMG_4821.jpg"
                  progress={bar1}
                  loaderRotate={loaderRotate}
                />
                <UploadRow
                  gradient={`linear-gradient(135deg, ${theme.lpPrimary} 0%, ${theme.lpPrimarySoft} 100%)`}
                  filename="IMG_4822.jpg"
                  progress={bar2}
                  loaderRotate={loaderRotate}
                />
                <UploadRow
                  gradient={`linear-gradient(135deg, ${theme.lpAccent} 0%, ${theme.lpPrimarySoft} 100%)`}
                  filename="IMG_4823.jpg"
                  progress={bar3}
                  loaderRotate={loaderRotate}
                />
              </div>
            </div>
          </AbsoluteFill>
        </>
      )}
    </AbsoluteFill>
  );
};

const Thumbnail: React.FC<{ opacity: number; gradient: string; filename: string }> = ({ opacity, gradient }) => (
  <div
    style={{
      aspectRatio: '1 / 1',
      borderRadius: 10,
      background: gradient,
      border: `1px solid ${theme.lpAccent}66`,
      opacity,
      transform: `scale(${0.9 + opacity * 0.1})`,
      position: 'relative',
      overflow: 'hidden',
      boxShadow: opacity > 0.5 ? `0 4px 12px ${theme.lpPrimary}30` : 'none',
    }}
  >
    {/* Subtle inner highlight for glass/photo feel */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.45) 0%, transparent 55%)',
      }}
    />
    {/* Soft vignette */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 70% 80%, rgba(0,0,0,0.08) 0%, transparent 60%)',
      }}
    />
  </div>
);

const UploadRow: React.FC<{ gradient: string; filename: string; progress: number; loaderRotate: number }> = ({
  gradient,
  filename,
  progress,
  loaderRotate,
}) => {
  const done = progress >= 0.999;
  const pct = Math.round(progress * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Thumbnail */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 6,
          background: gradient,
          border: `1px solid ${theme.lpAccent}66`,
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 55%)',
          }}
        />
      </div>
      {/* Filename + progress */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            color: theme.lpText,
            fontWeight: 500,
            marginBottom: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {filename}
        </div>
        <div style={{ height: 5, backgroundColor: theme.lpMuted, borderRadius: 3, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: done
                ? `linear-gradient(90deg, ${theme.lpSuccess} 0%, ${theme.lpSuccess} 100%)`
                : `linear-gradient(90deg, ${theme.lpPrimary} 0%, ${theme.lpPrimaryDark} 100%)`,
              borderRadius: 3,
            }}
          />
        </div>
      </div>
      {/* % + icon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: 54,
          justifyContent: 'flex-end',
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: theme.lpMutedForeground,
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 600,
          }}
        >
          {pct}%
        </span>
        {done ? (
          <CheckIcon size={16} color={theme.lpSuccess} stroke={3} />
        ) : (
          <LoaderIcon size={16} color={theme.lpPrimary} rotate={loaderRotate} />
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — Success / Thank You (270-360 frames, 3.0s, localFrame 0-90)
// ─────────────────────────────────────────────────────────────────────────────

const PhaseSuccess: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  const checkDraw = interpolate(f, [0, 22], [0, 1], { extrapolateRight: 'clamp' });
  const checkScale = spring({ frame: f - 3, fps, config: { damping: 12, stiffness: 140 } });

  const titleY = interpolate(f, [18, 34], [30, 0], { extrapolateRight: 'clamp' });
  const titleOpacity = interpolate(f, [18, 34], [0, 1], { extrapolateRight: 'clamp' });

  const subtitleOpacity = interpolate(f, [28, 44], [0, 1], { extrapolateRight: 'clamp' });
  const coupleOpacity = interpolate(f, [38, 54], [0, 1], { extrapolateRight: 'clamp' });

  // Loop fade.
  const loopFade = interpolate(f, [78, 90], [1, 0], { extrapolateLeft: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        padding: '60px 40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: loopFade,
      }}
    >
      {/* Confetti — 40 pieces falling with drift */}
      <Confetti frame={f} />

      {/* Animated check inside a soft circle */}
      <div
        style={{
          marginBottom: 28,
          transform: `scale(${checkScale})`,
        }}
      >
        <svg width="110" height="110" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="54" fill={theme.lpPrimarySoft} />
          <circle cx="60" cy="60" r="54" stroke={theme.lpPrimary} strokeOpacity="0.3" strokeWidth="2" fill="none" />
          <path
            d="M38 62 L52 76 L82 46"
            stroke={theme.lpPrimary}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="60"
            strokeDashoffset={60 - checkDraw * 60}
          />
        </svg>
      </div>

      {/* "Hvala!" heading */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontFamily: playfair,
          fontSize: 52,
          fontWeight: 700,
          color: theme.lpPrimary,
          letterSpacing: '-0.02em',
          textAlign: 'center',
          lineHeight: 1,
          marginBottom: 14,
        }}
      >
        Hvala!
      </div>

      {/* Subtitle */}
      <div
        style={{
          opacity: subtitleOpacity,
          fontSize: 14,
          color: theme.lpMutedForeground,
          textAlign: 'center',
          marginBottom: 18,
          maxWidth: 360,
          lineHeight: 1.45,
        }}
      >
        Vaše slike i poruka su uspješno poslane.
      </div>

      {/* Couple line with heart */}
      <div
        style={{
          opacity: coupleOpacity,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 15,
          color: theme.lpPrimary,
          fontWeight: 600,
          fontFamily: playfair,
        }}
      >
        <HeartIcon size={16} color={theme.lpPrimary} fill={theme.lpPrimary} stroke={0} />
        <span>Ana &amp; Marko će biti oduševljeni!</span>
        <HeartIcon size={16} color={theme.lpPrimary} fill={theme.lpPrimary} stroke={0} />
      </div>
    </AbsoluteFill>
  );
};

// Deterministic pseudo-random for a seed.
function seededRand(seed: number): number {
  const x = Math.sin(seed * 9973.1) * 43758.5453;
  return x - Math.floor(x);
}

const Confetti: React.FC<{ frame: number }> = ({ frame }) => {
  const colors = [theme.lpPrimary, theme.lpAccent, theme.lpPrimarySoft, theme.lpAccentSoft, theme.lpPrimaryDark];
  const pieces = Array.from({ length: 40 }, (_, i) => {
    const startX = seededRand(i + 1) * 100; // % of width
    const delay = seededRand(i + 17) * 35; // frames (staggered more, so some start later and stay visible longer)
    const fallSpeed = 900 + seededRand(i + 7) * 400; // total px fall — span the full 1200px canvas
    const localFrame = Math.max(0, frame - delay);
    const baseY = interpolate(localFrame, [0, 85], [-40, fallSpeed], { extrapolateRight: 'clamp' });
    const swirl = Math.sin(localFrame * 0.12 + i) * 16;
    const rotate = localFrame * (2 + seededRand(i + 41) * 6) + i * 17;
    const colorIdx = Math.floor(seededRand(i + 3) * colors.length);
    const color = colors[colorIdx];
    const opacity = interpolate(localFrame, [0, 6, 85, 90], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const w = 5 + seededRand(i + 29) * 6;
    const h = 9 + seededRand(i + 31) * 6;
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          top: 0,
          left: `${startX}%`,
          width: w,
          height: h,
          backgroundColor: color,
          transform: `translate(${swirl}px, ${baseY}px) rotate(${rotate}deg)`,
          borderRadius: 1.5,
          opacity,
        }}
      />
    );
  });
  return <AbsoluteFill style={{ pointerEvents: 'none' }}>{pieces}</AbsoluteFill>;
};
