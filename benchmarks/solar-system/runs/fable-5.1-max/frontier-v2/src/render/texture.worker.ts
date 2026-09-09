/// <reference lib="webworker" />
import { generate, type TexRequest } from './texgen';

interface Msg { id: number; req: TexRequest }

self.onmessage = (ev: MessageEvent<Msg>) => {
  const { id, req } = ev.data;
  try {
    const res = generate(req);
    const transfer: ArrayBuffer[] = [res.map.buffer as ArrayBuffer];
    if (res.normal) transfer.push(res.normal.buffer as ArrayBuffer);
    if (res.night) transfer.push(res.night.buffer as ArrayBuffer);
    if (res.clouds) transfer.push(res.clouds.buffer as ArrayBuffer);
    (self as unknown as Worker).postMessage({ id, ok: true, res }, transfer);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, ok: false, error: String(err) });
  }
};
