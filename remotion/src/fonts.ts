import { loadFont as loadPlayfair } from '@remotion/google-fonts/PlayfairDisplay';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';

export const { fontFamily: playfair, waitUntilDone: waitForPlayfair } =
  loadPlayfair('normal', { weights: ['400', '700'] });
export const { fontFamily: inter, waitUntilDone: waitForInter } =
  loadInter('normal', { weights: ['400', '500', '600', '700'] });

export function waitForAllFonts() {
  return Promise.all([waitForPlayfair(), waitForInter()]);
}
