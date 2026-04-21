import { Composition } from 'remotion';
import { HeroGuestFlow } from './compositions/HeroGuestFlow';
import { waitForAllFonts } from './fonts';

const FPS = 30;
const DURATION_SEC = 12;

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="HeroGuestFlow"
        component={HeroGuestFlow}
        durationInFrames={DURATION_SEC * FPS}
        fps={FPS}
        width={600}
        height={1200}
        defaultProps={{}}
        calculateMetadata={async () => {
          await waitForAllFonts();
          return {};
        }}
      />
    </>
  );
};
