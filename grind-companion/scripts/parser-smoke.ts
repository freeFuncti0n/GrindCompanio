/**
 * Quick sanity check for binary session parser (run with npx tsx).
 */
import { parseLiveTelemetry, parseSessionFile } from '../src/parsing/sessionParser';

function buildMinimalSession(sessionId: number): Uint8Array {
  const out = new Uint8Array(24 + 80);
  const view = new DataView(out.buffer);

  view.setUint32(0, sessionId, true);
  view.setUint32(4, 1700000000, true);
  view.setUint32(8, 80, true);
  view.setUint32(12, 0, true);
  view.setUint16(16, 0, true);
  view.setUint16(18, 0, true);
  view.setUint16(20, 2, true);

  const s = 24;
  view.setUint32(s + 0, sessionId, true);
  view.setUint32(s + 4, 1700000000, true);
  view.setFloat32(s + 24, 18.0, true);
  view.setFloat32(s + 28, 0.03, true);
  view.setFloat32(s + 32, 18.02, true);
  view.setFloat32(s + 36, -0.02, true);
  view.setUint8(s + 56, 1);
  view.setUint8(s + 57, 0);
  const status = 'COMPLETE';
  for (let i = 0; i < status.length; i++) {
    out[s + 64 + i] = status.charCodeAt(i);
  }

  return out;
}

const parsed = parseSessionFile(buildMinimalSession(42), 42);
if (parsed.session.session_id !== 42) throw new Error('session id');
if (Math.abs(parsed.session.final_weight - 18.02) > 0.001) throw new Error('final weight');
if (parsed.session.profile_id !== 1) throw new Error('profile');

const liveBuf = new Uint8Array(20);
const liveView = new DataView(liveBuf.buffer);
liveView.setFloat32(0, 9.5, true);
liveView.setFloat32(4, 1.2, true);
liveView.setFloat32(8, 9.0, true);
liveBuf[12] = 90;
liveBuf[13] = 5;
const live = parseLiveTelemetry(liveBuf);
if (Math.abs(live.weight_g - 9.5) > 0.001) throw new Error('live weight');
if (live.progress_pct !== 90) throw new Error('live progress');

console.log('parser ok');
