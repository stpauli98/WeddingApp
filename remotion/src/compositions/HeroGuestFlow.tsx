import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import { theme } from '../theme';
import { inter } from '../fonts';

// Phase timings (fps=30). Total 360 frames = 12s.
// Faithful to the real guest flow — no invented ornaments.
const PHASE_LOGIN_END = 120; // 4.0s
const PHASE_UPLOAD_END = 270; // 9.0s
const PHASE_SUCCESS_END = 360; // 12.0s

export const HeroGuestFlow: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.lpBg,
        fontFamily: inter,
        color: theme.lpText,
      }}
    >
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
// Icons — lucide-react equivalents used by the real guest UI.
// ─────────────────────────────────────────────────────────────────────────────

const UploadIcon: React.FC<{ size?: number; color?: string; strokeWidth?: number }> = ({
  size = 40,
  color = theme.lpMutedForeground,
  strokeWidth = 2,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const CheckCircleIcon: React.FC<{ size?: number; color?: string; progress?: number }> = ({
  size = 20,
  color = theme.lpSuccess,
  progress = 1,
}) => {
  const dashLen = 24;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" opacity={progress} />
      <path
        d="M9 12l2 2 4-4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashLen}
        strokeDashoffset={dashLen - dashLen * progress}
      />
    </svg>
  );
};

const LoaderIcon: React.FC<{ size?: number; color?: string; rotation?: number }> = ({
  size = 20,
  color = theme.lpPrimary,
  rotation = 0,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transform: `rotate(${rotation}deg)` }}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — Login (real LoginForm.tsx)
// Card: white bg, accent/30 border, rounded-xl, shadow-md
// Title: "Dobrodošli na vjenčanje" text-primary text-2xl font-bold center
// Fields: Ime, Prezime, Email adresa (FormLabel + Input with placeholder)
// Checkbox: marketingConsent with label
// Button: full-width, solid primary, "Prijavi se"
// ─────────────────────────────────────────────────────────────────────────────

const PhaseLogin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Card enters with subtle rise.
  const cardSpring = spring({ frame, fps, config: { damping: 16, stiffness: 90 } });
  const cardY = interpolate(cardSpring, [0, 1], [16, 0]);
  const cardOpacity = interpolate(cardSpring, [0, 1], [0, 1]);

  // Typewriter progress — characters fill one by one.
  const firstNameChars = Math.floor(
    interpolate(frame, [30, 48], [0, 3], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  );
  const lastNameChars = Math.floor(
    interpolate(frame, [52, 74], [0, 8], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  );
  const emailChars = Math.floor(
    interpolate(frame, [78, 100], [0, 17], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  );

  // Checkbox gets ticked after email is filled.
  const checkboxTicked = frame >= 104;
  const checkProgress = interpolate(frame, [104, 114], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Button press scale.
  const buttonPress = interpolate(frame, [114, 118, 120], [1, 0.97, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Exit.
  const exitOpacity = interpolate(frame, [112, 120], [1, 0], { extrapolateLeft: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        padding: '40px 32px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        opacity: exitOpacity,
      }}
    >
      <div
        style={{
          opacity: cardOpacity,
          transform: `translateY(${cardY}px)`,
          backgroundColor: theme.lpCard,
          border: `1px solid ${theme.lpAccent}4D`,
          borderRadius: 12,
          padding: '32px 24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        }}
      >
        {/* CardHeader — title only, no subtitle */}
        <div
          style={{
            textAlign: 'center',
            color: theme.lpPrimary,
            fontSize: 26,
            fontWeight: 700,
            marginBottom: 24,
            lineHeight: 1.2,
          }}
        >
          Dobrodošli na vjenčanje
        </div>

        {/* CardContent — form fields stacked with space-y-6 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <FormInput
            label="Ime"
            placeholder="Unesite vaše ime"
            value={'Ana'.slice(0, firstNameChars)}
            typing={firstNameChars > 0 && firstNameChars < 3}
          />
          <FormInput
            label="Prezime"
            placeholder="Unesite vaše prezime"
            value={'Marković'.slice(0, lastNameChars)}
            typing={lastNameChars > 0 && lastNameChars < 8}
          />
          <FormInput
            label="Email adresa"
            placeholder="vasa.email@primjer.com"
            value={'ana.m@example.com'.slice(0, emailChars)}
            typing={emailChars > 0 && emailChars < 17}
          />

          {/* Checkbox + marketing consent */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
            <div
              style={{
                width: 18,
                height: 18,
                border: `1.5px solid ${checkboxTicked ? theme.lpPrimary : theme.lpBorder}`,
                borderRadius: 4,
                backgroundColor: checkboxTicked ? theme.lpPrimary : 'transparent',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 2,
              }}
            >
              {checkboxTicked && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12l5 5 9-9"
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="24"
                    strokeDashoffset={24 - 24 * checkProgress}
                  />
                </svg>
              )}
            </div>
            <div
              style={{
                fontSize: 13,
                color: theme.lpText,
                lineHeight: 1.45,
                flex: 1,
              }}
            >
              Želim da primam obavijesti i promotivne ponude od DodajUspomenu.com
            </div>
          </div>

          {/* Submit button — solid primary, full-width */}
          <div
            style={{
              marginTop: 8,
              width: '100%',
              padding: '14px 16px',
              backgroundColor: theme.lpPrimary,
              color: '#ffffff',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              textAlign: 'center',
              transform: `scale(${buttonPress})`,
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            Prijavi se
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FormInput: React.FC<{
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
          fontSize: 13,
          fontWeight: 500,
          color: theme.lpText,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          padding: '10px 12px',
          backgroundColor: theme.lpCard,
          border: `1px solid ${theme.lpBorder}`,
          borderRadius: 6,
          fontSize: 14,
          color: hasValue ? theme.lpText : theme.lpMutedForeground,
          minHeight: 20,
          lineHeight: '20px',
        }}
      >
        {hasValue ? value : placeholder}
        {typing && <span style={{ opacity: 0.6, marginLeft: 1 }}>|</span>}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — Upload (real Upload-Form.tsx + UploadStatusList.tsx)
// Dashboard state:
//   Card: "Dodaj slike" title + ImageSlotBar + dashed dropzone + primary button
//   ImageSlotBar: "Slike" + "N / 10" + gradient primary bar + "Možete dodati još X slika"
//   After selection: 3 image thumbnails in grid-cols-3
// Modal state (bg-black/50 backdrop):
//   "Dodaj slike" title + "N od 3 slika je uploadovano" + 3 pulsing dots
//   UploadStatusList "Status uploada slika"
//   Each row: thumbnail (40x40 rounded-lg) + filename + h-1.5 progress bar +
//   Loader2 (primary spin) or CheckCircle (lpSuccess) + percentage (tabular-nums)
// ─────────────────────────────────────────────────────────────────────────────

const PhaseUpload: React.FC = () => {
  const f = useCurrentFrame();

  // Dashboard card enters.
  const cardOpacity = interpolate(f, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const cardY = interpolate(f, [0, 14], [14, 0], { extrapolateRight: 'clamp' });

  // Thumbnails stagger-in inside dropzone grid.
  const thumb1 = interpolate(f, [22, 38], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const thumb2 = interpolate(f, [32, 48], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const thumb3 = interpolate(f, [42, 58], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Slot bar counter reflects filled thumbnails.
  const slotCount = Math.floor(
    interpolate(f, [22, 38, 48, 58], [0, 1, 2, 3], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  const slotFillPercent = interpolate(f, [22, 58], [0, 30], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Button press at 78.
  const buttonPress = interpolate(f, [76, 80, 84], [1, 0.97, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Modal appears.
  const modalT = interpolate(f, [84, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const modalExit = interpolate(f, [144, 150], [1, 0], { extrapolateLeft: 'clamp' });
  const modalOpacity = modalT * modalExit;
  const modalScale = interpolate(modalT, [0, 1], [0.94, 1]);

  // Upload progress per row.
  const bar1 = interpolate(f, [98, 118], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bar2 = interpolate(f, [108, 128], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bar3 = interpolate(f, [118, 138], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const completedCount = [bar1, bar2, bar3].filter((p) => p >= 0.999).length;

  // Pulsing dots (loader indicator).
  const dotPulse = (offsetFrames: number) => {
    const t = (f + offsetFrames) % 30;
    return interpolate(t, [0, 8, 16, 30], [0.3, 1, 0.3, 0.3]);
  };

  return (
    <AbsoluteFill>
      {/* Dashboard card */}
      <AbsoluteFill
        style={{
          padding: '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            opacity: cardOpacity,
            transform: `translateY(${cardY}px)`,
            backgroundColor: theme.lpCard,
            border: `1px solid ${theme.lpAccent}4D`,
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
        >
          {/* CardHeader */}
          <div style={{ padding: '24px 24px 16px' }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: theme.lpText,
                marginBottom: 16,
              }}
            >
              Dodaj slike
            </div>

            {/* ImageSlotBar — real styling */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                <span style={{ color: theme.lpText }}>Slike</span>
                <span style={{ color: theme.lpMutedForeground, fontVariantNumeric: 'tabular-nums' }}>
                  {slotCount} / 10
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 14,
                  backgroundColor: `${theme.lpMuted}4D`,
                  border: `1px solid ${theme.lpAccent}`,
                  borderRadius: 999,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${slotFillPercent}%`,
                    minWidth: slotFillPercent > 0 ? 8 : 0,
                    background: `linear-gradient(to right, ${theme.lpPrimary}, ${theme.lpPrimaryDark})`,
                    borderRadius: 999,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)',
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: theme.lpMutedForeground,
                  marginTop: 4,
                  textAlign: 'right',
                }}
              >
                Možete dodati još {10 - slotCount} slika
              </div>
            </div>
          </div>

          {/* CardContent — label + dropzone/previews */}
          <div style={{ padding: '0 24px 20px' }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: theme.lpText,
                marginBottom: 8,
              }}
            >
              Slike (max 10)
            </div>

            {/* Dropzone — dashed border, Upload icon, text */}
            <div
              style={{
                border: `2px dashed ${theme.lpMutedForeground}33`,
                borderRadius: 6,
                padding: '20px 16px',
                textAlign: 'center',
                backgroundColor: theme.lpCard,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                <UploadIcon size={36} color={theme.lpMutedForeground} />
              </div>
              <div style={{ fontSize: 12, color: theme.lpMutedForeground }}>
                Prevucite slike ovde ili kliknite za odabir
              </div>
            </div>

            {/* Preview grid — appears as thumbnails stagger in */}
            {(thumb1 > 0 || thumb2 > 0 || thumb3 > 0) && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <ThumbnailCard opacity={thumb1} photo="photo1" filename="IMG_4821.jpg" />
                <ThumbnailCard opacity={thumb2} photo="photo2" filename="IMG_4822.jpg" />
                <ThumbnailCard opacity={thumb3} photo="photo3" filename="IMG_4823.jpg" />
              </div>
            )}
          </div>

          {/* CardFooter — primary button */}
          <div style={{ padding: '0 24px 24px' }}>
            <div
              style={{
                width: '100%',
                padding: '16px 16px',
                backgroundColor: theme.lpPrimary,
                color: '#ffffff',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                textAlign: 'center',
                transform: `scale(${buttonPress})`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              }}
            >
              Potvrdi upload
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* Modal overlay — bg-black/50 backdrop */}
      {modalOpacity > 0.01 && (
        <AbsoluteFill
          style={{
            backgroundColor: `rgba(0, 0, 0, ${0.5 * modalOpacity})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 24px',
          }}
        >
          <div
            style={{
              opacity: modalOpacity,
              transform: `scale(${modalScale})`,
              backgroundColor: theme.lpCard,
              borderRadius: 12,
              boxShadow: '0 20px 40px rgba(0,0,0,0.25), 0 6px 14px rgba(0,0,0,0.12)',
              width: '100%',
              overflow: 'hidden',
            }}
          >
            {/* Sticky modal header */}
            <div
              style={{
                padding: '14px 16px',
                borderBottom: `1px solid ${theme.lpAccent}1A`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: theme.lpPrimary,
                  }}
                >
                  Dodaj slike
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: theme.lpMutedForeground,
                    marginTop: 2,
                  }}
                >
                  {completedCount} od 3 slika je uploadovano
                </div>
              </div>

              {/* 3 pulsing dots — shown while uploading */}
              {completedCount < 3 && (
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 4, 8].map((offset) => (
                    <div
                      key={offset}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: theme.lpPrimary,
                        opacity: dotPulse(offset),
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* UploadStatusList */}
            <div style={{ padding: 16 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: theme.lpText,
                  marginBottom: 12,
                }}
              >
                Status uploada slika
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <UploadStatusRow
                  filename="IMG_4821.jpg"
                  progress={bar1}
                  photo="photo1"
                  frame={f}
                />
                <UploadStatusRow
                  filename="IMG_4822.jpg"
                  progress={bar2}
                  photo="photo2"
                  frame={f}
                />
                <UploadStatusRow
                  filename="IMG_4823.jpg"
                  progress={bar3}
                  photo="photo3"
                  frame={f}
                />
              </div>
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// Photo swatches — stand-ins for real guest photos. Each uses a unique
// gradient on brand colors so the grid reads as distinct images.
type PhotoKey = 'photo1' | 'photo2' | 'photo3';
const photoBackgrounds: Record<PhotoKey, string> = {
  photo1: `linear-gradient(135deg, ${theme.lpPrimarySoft} 0%, ${theme.lpPrimary} 100%)`,
  photo2: `linear-gradient(135deg, ${theme.lpAccentSoft} 0%, ${theme.lpAccent} 100%)`,
  photo3: `linear-gradient(135deg, ${theme.lpMuted} 0%, ${theme.lpPrimaryDark} 100%)`,
};

const ThumbnailCard: React.FC<{ opacity: number; photo: PhotoKey; filename: string }> = ({
  opacity,
  photo,
  filename,
}) => {
  const scale = 0.94 + opacity * 0.06;
  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        aspectRatio: '1 / 1',
        borderRadius: 8,
        border: `1px solid ${theme.lpAccent}4D`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: photoBackgrounds[photo],
        }}
      />
      {/* Filename footer — matches real Card overlay */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: '3px 6px',
          fontSize: 9,
          color: theme.lpMutedForeground,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {filename}
      </div>
    </div>
  );
};

const UploadStatusRow: React.FC<{
  filename: string;
  progress: number;
  photo: PhotoKey;
  frame: number;
}> = ({ filename, progress, photo, frame }) => {
  const done = progress >= 0.999;
  const uploading = progress > 0 && !done;
  const percentage = Math.round(progress * 100);

  // Background row tint matches real UploadStatusList.
  const rowBg = done ? `${theme.lpSuccess}14` : `${theme.lpMuted}1A`;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        borderRadius: 8,
        backgroundColor: rowBg,
      }}
    >
      {/* 40x40 thumbnail, rounded-lg, accent/20 border */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 6,
          border: `1px solid ${theme.lpAccent}33`,
          overflow: 'hidden',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: photoBackgrounds[photo] }} />
      </div>

      {/* Filename + progress bar + status text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: theme.lpText,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {filename}
        </div>
        <div
          style={{
            marginTop: 5,
            width: '100%',
            height: 4,
            backgroundColor: `${theme.lpMuted}4D`,
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              backgroundColor: done ? theme.lpSuccess : theme.lpPrimary,
              borderRadius: 999,
            }}
          />
        </div>
        <div
          style={{
            fontSize: 10,
            color: theme.lpMutedForeground,
            marginTop: 4,
          }}
        >
          {done ? 'Uspješno uploadovano' : uploading ? 'Slanje u toku...' : 'Čeka na upload...'}
        </div>
      </div>

      {/* Right rail — icon + percentage */}
      <div
        style={{
          width: 44,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 2,
        }}
      >
        <div style={{ height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {done ? (
            <CheckCircleIcon size={18} color={theme.lpSuccess} />
          ) : uploading ? (
            <LoaderIcon size={18} color={theme.lpPrimary} rotation={(frame * 12) % 360} />
          ) : (
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: `${theme.lpMutedForeground}80`,
              }}
            />
          )}
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: done
              ? theme.lpSuccess
              : uploading
              ? theme.lpText
              : theme.lpMutedForeground,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {percentage}%
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 — Success (real SuccessThankYouCard.tsx + UploadLimitReachedCelebration confetti)
// Card: "Hvala!" text-primary text-3xl font-bold tracking-wide
// Body: "Vaše slike i poruka su uspješno poslate."
//       coupleName bold primary + " će biti oduševljeni vašim iznenađenjem!"
// Confetti overlay: 40 pieces, ellipse shapes, accent/primary colors, falling
// ─────────────────────────────────────────────────────────────────────────────

const PhaseSuccess: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Card enters with spring.
  const cardSpring = spring({ frame: f, fps, config: { damping: 14, stiffness: 100 } });
  const cardScale = interpolate(cardSpring, [0, 1], [0.92, 1]);
  const cardOpacity = interpolate(cardSpring, [0, 1], [0, 1]);

  // Title draws in after card.
  const titleOpacity = interpolate(f, [8, 24], [0, 1], { extrapolateRight: 'clamp' });

  // Body fades in after title.
  const bodyOpacity = interpolate(f, [22, 40], [0, 1], { extrapolateRight: 'clamp' });

  // Loop fade at end for seamless restart.
  const loopFade = interpolate(f, [80, 90], [1, 0], { extrapolateLeft: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity: loopFade }}>
      {/* Confetti canvas */}
      <Confetti frame={f} />

      {/* Success card — centered */}
      <AbsoluteFill
        style={{
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            opacity: cardOpacity,
            transform: `scale(${cardScale})`,
            backgroundColor: theme.lpCard,
            border: `1px solid ${theme.lpAccent}4D`,
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
            padding: '28px 24px',
          }}
        >
          {/* Hvala! — CardTitle */}
          <div
            style={{
              opacity: titleOpacity,
              textAlign: 'center',
              color: theme.lpPrimary,
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: '0.02em',
              lineHeight: 1.1,
              marginBottom: 16,
            }}
          >
            Hvala!
          </div>

          {/* Body paragraph */}
          <div
            style={{
              opacity: bodyOpacity,
              textAlign: 'center',
              fontSize: 15,
              color: theme.lpText,
              lineHeight: 1.5,
            }}
          >
            <div>Vaše slike i poruka su uspješno poslate.</div>
            <div style={{ marginTop: 6 }}>
              <span
                style={{
                  color: theme.lpPrimary,
                  fontWeight: 600,
                }}
              >
                Ana i Marko
              </span>
              <span> će biti oduševljeni vašim iznenađenjem!</span>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Confetti — mirrors real UploadLimitReachedCelebration.
// 40 ellipse pieces in primary/accent/muted colors falling from top.
// Deterministic via seeded random so the video renders identically each time.
// ─────────────────────────────────────────────────────────────────────────────

function seededRand(seed: number): number {
  const x = Math.sin(seed * 9973.1) * 43758.5453;
  return x - Math.floor(x);
}

const CONFETTI_COLORS = [
  theme.lpAccent,
  theme.lpAccentSoft,
  theme.lpPrimary,
  theme.lpPrimarySoft,
  theme.lpMuted,
  theme.lpBorder,
];

const Confetti: React.FC<{ frame: number }> = ({ frame }) => {
  const pieces = Array.from({ length: 40 }, (_, i) => {
    const seed = i + 1;
    const startX = seededRand(seed) * 100; // % across width
    const startDelay = seededRand(seed + 101) * 20;
    const localFrame = Math.max(0, frame - startDelay);

    // Fall distance — spans the 1200px canvas plus buffer.
    const fallEnd = 1300 + seededRand(seed + 53) * 200;
    const y = interpolate(localFrame, [0, 110], [-40, fallEnd], { extrapolateRight: 'clamp' });

    // Horizontal drift using sin.
    const drift = Math.sin(localFrame * 0.05 + i) * 14;

    // Tilt oscillates — same pattern as real code.
    const tiltAngle = localFrame * 0.04 + i;
    const tilt = Math.sin(tiltAngle) * 18;

    const radius = 5 + seededRand(seed + 23) * 5; // 5–10px
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];

    // Fade in fast, hold, fade out as it approaches bottom.
    const opacity = interpolate(localFrame, [0, 6, 95, 110], [0, 0.85, 0.85, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          top: 0,
          left: `${startX}%`,
          width: radius * 2,
          height: radius * 1.2,
          borderRadius: '50%',
          backgroundColor: color,
          transform: `translate(${drift}px, ${y}px) rotate(${tilt}deg)`,
          opacity,
        }}
      />
    );
  });

  return <AbsoluteFill style={{ pointerEvents: 'none' }}>{pieces}</AbsoluteFill>;
};
