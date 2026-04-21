import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { theme } from '../theme';
import { playfair, inter } from '../fonts';

const PHASE_LOGIN_END = 105;      // 3.5s @ 30fps
const PHASE_UPLOAD_END = 240;     // 8s
const PHASE_SUCCESS_END = 330;    // 11s

export const HeroGuestFlow: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.lpBg, fontFamily: inter }}>
      {/* Browser/phone inner content only. The gray-900 iPhone bezel lives on
          the landing side (HeroSection.tsx); video fills the inner white area. */}

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

const PhaseLogin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerY = interpolate(frame, [0, 15], [-40, 0], { extrapolateRight: 'clamp' });
  const headerOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  const formY = interpolate(frame, [10, 25], [40, 0], { extrapolateRight: 'clamp' });
  const formOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' });

  const firstNameChars = Math.floor(interpolate(frame, [30, 45], [0, 3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const lastNameChars = Math.floor(interpolate(frame, [48, 65], [0, 8], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const emailChars = Math.floor(interpolate(frame, [68, 88], [0, 19], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

  const buttonScale = spring({ frame: frame - 88, fps, config: { damping: 10, stiffness: 150 } });

  const exitY = interpolate(frame, [95, 105], [0, -20], { extrapolateLeft: 'clamp' });
  const exitOpacity = interpolate(frame, [95, 105], [1, 0], { extrapolateLeft: 'clamp' });

  return (
    <AbsoluteFill style={{ padding: '40px 32px', opacity: exitOpacity, transform: `translateY(${exitY}px)` }}>
      <div style={{ opacity: headerOpacity, transform: `translateY(${headerY}px)`, marginBottom: 24 }}>
        <div style={{ fontFamily: playfair, fontSize: 28, fontWeight: 700, color: theme.lpText, textAlign: 'center' }}>
          Dodaj Uspomenu
        </div>
        <div style={{ fontSize: 14, color: theme.lpMutedForeground, textAlign: 'center', marginTop: 4 }}>
          Ana &amp; Marko · 15. juni 2026
        </div>
      </div>

      <div style={{ opacity: formOpacity, transform: `translateY(${formY}px)`, flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Ime" value={'Ana'.slice(0, firstNameChars)} />
        <Field label="Prezime" value={'Marković'.slice(0, lastNameChars)} />
        <Field label="Email" value={'ana.m@example.com'.slice(0, emailChars)} />

        <div style={{
          marginTop: 16,
          padding: '16px 24px',
          backgroundColor: theme.lpPrimary,
          color: '#ffffff',
          borderRadius: 16,
          fontWeight: 600,
          fontSize: 16,
          textAlign: 'center',
          transform: `scale(${interpolate(buttonScale, [0, 1], [1, 1.03])})`,
        }}>
          Pošalji podatke
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 13, color: theme.lpMutedForeground, marginBottom: 6, fontWeight: 500 }}>
      {label}
    </div>
    <div style={{
      padding: '14px 16px',
      backgroundColor: theme.lpCard,
      border: `1px solid ${theme.lpBorder}`,
      borderRadius: 12,
      fontSize: 16,
      color: theme.lpText,
      minHeight: 22,
    }}>
      {value}
      {value.length > 0 && <span style={{ opacity: 0.5 }}>|</span>}
    </div>
  </div>
);

const PhaseUpload: React.FC = () => {
  const frame = useCurrentFrame();
  const localFrame = frame;

  const headerY = interpolate(localFrame, [0, 15], [-40, 0], { extrapolateRight: 'clamp' });
  const headerOpacity = interpolate(localFrame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  const btnGlow = interpolate(localFrame, [20, 35], [0, 1], { extrapolateRight: 'clamp' });

  const thumb1Progress = interpolate(localFrame, [40, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const thumb2Progress = interpolate(localFrame, [50, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const thumb3Progress = interpolate(localFrame, [60, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const bar1 = interpolate(localFrame, [75, 95], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bar2 = interpolate(localFrame, [95, 115], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bar3 = interpolate(localFrame, [115, 130], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const completedCount = Math.floor(bar1 + bar2 + bar3);

  const phaseDuration = 135;
  const exitOpacity = interpolate(localFrame, [phaseDuration - 8, phaseDuration], [1, 0], { extrapolateLeft: 'clamp' });

  return (
    <AbsoluteFill style={{ padding: '40px 32px', opacity: exitOpacity }}>
      <div style={{ opacity: headerOpacity, transform: `translateY(${headerY}px)`, marginBottom: 20 }}>
        <div style={{ fontFamily: playfair, fontSize: 24, fontWeight: 700, color: theme.lpText }}>
          Dobrodošla, Ana
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: theme.lpMutedForeground, marginBottom: 6 }}>
          <span>Slike</span>
          <span style={{ fontFamily: inter, fontWeight: 600 }}>{completedCount} / 10</span>
        </div>
        <div style={{ height: 8, backgroundColor: theme.lpMuted, borderRadius: 4 }}>
          <div style={{
            height: '100%',
            width: `${(completedCount / 10) * 100}%`,
            backgroundColor: theme.lpPrimary,
            borderRadius: 4,
          }} />
        </div>
      </div>

      <div style={{
        padding: '16px 24px',
        backgroundColor: theme.lpPrimarySoft,
        color: theme.lpText,
        borderRadius: 16,
        fontWeight: 600,
        fontSize: 16,
        textAlign: 'center',
        boxShadow: `0 0 ${btnGlow * 20}px ${theme.lpPrimary}40`,
        marginBottom: 20,
      }}>
        + Dodaj slike
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <ThumbRow progress={thumb1Progress} barProgress={bar1} label="IMG_4821.jpg" />
        <ThumbRow progress={thumb2Progress} barProgress={bar2} label="IMG_4822.jpg" />
        <ThumbRow progress={thumb3Progress} barProgress={bar3} label="IMG_4823.jpg" />
      </div>
    </AbsoluteFill>
  );
};

const ThumbRow: React.FC<{ progress: number; barProgress: number; label: string }> = ({ progress, barProgress, label }) => (
  <div style={{
    opacity: progress,
    transform: `translateX(${(1 - progress) * -20}px)`,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    backgroundColor: theme.lpCard,
    border: `1px solid ${theme.lpBorder}`,
    borderRadius: 10,
  }}>
    <div style={{
      width: 40,
      height: 40,
      backgroundColor: theme.lpAccentSoft,
      borderRadius: 6,
      flexShrink: 0,
    }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: theme.lpText, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ height: 4, backgroundColor: theme.lpMuted, borderRadius: 2 }}>
        <div style={{
          height: '100%',
          width: `${barProgress * 100}%`,
          backgroundColor: theme.lpPrimary,
          borderRadius: 2,
        }} />
      </div>
    </div>
    <div style={{ fontSize: 11, color: theme.lpMutedForeground, fontVariantNumeric: 'tabular-nums', width: 32, textAlign: 'right' }}>
      {Math.round(barProgress * 100)}%
    </div>
  </div>
);

const PhaseSuccess: React.FC = () => {
  const frame = useCurrentFrame();
  const localFrame = frame;
  const { fps } = useVideoConfig();

  const checkProgress = interpolate(localFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  const bannerY = interpolate(localFrame, [15, 30], [-40, 0], { extrapolateRight: 'clamp' });
  const bannerOpacity = interpolate(localFrame, [15, 30], [0, 1], { extrapolateRight: 'clamp' });

  const sparkleScale = spring({ frame: localFrame - 25, fps, config: { damping: 10, stiffness: 100 } });
  const sparkleOpacity = interpolate(localFrame, [40, 60, 78], [1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const phaseDuration = 90;
  const loopFade = interpolate(localFrame, [phaseDuration - 12, phaseDuration], [1, 0], { extrapolateLeft: 'clamp' });

  return (
    <AbsoluteFill style={{ padding: '40px 32px', opacity: loopFade, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="54" fill={theme.lpPrimarySoft} />
          <path
            d="M38 62 L52 76 L82 46"
            stroke={theme.lpPrimary}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="60"
            strokeDashoffset={60 - checkProgress * 60}
          />
        </svg>
      </div>

      <div style={{
        opacity: bannerOpacity,
        transform: `translateY(${bannerY}px)`,
        textAlign: 'center',
        marginBottom: 16,
      }}>
        <div style={{ fontFamily: playfair, fontSize: 28, fontWeight: 700, color: theme.lpText }}>
          Uspješno!
        </div>
        <div style={{ fontSize: 15, color: theme.lpMutedForeground, marginTop: 4 }}>
          3 slike poslate
        </div>
      </div>

      <div style={{ position: 'absolute', top: '30%', left: '20%', opacity: sparkleOpacity, transform: `scale(${sparkleScale})` }}>
        <Sparkle />
      </div>
      <div style={{ position: 'absolute', top: '45%', right: '18%', opacity: sparkleOpacity, transform: `scale(${sparkleScale * 0.8})` }}>
        <Sparkle />
      </div>
      <div style={{ position: 'absolute', top: '65%', left: '30%', opacity: sparkleOpacity, transform: `scale(${sparkleScale * 0.6})` }}>
        <Sparkle />
      </div>
    </AbsoluteFill>
  );
};

const Sparkle: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z"
      fill={theme.lpAccent}
      opacity="0.8"
    />
  </svg>
);
