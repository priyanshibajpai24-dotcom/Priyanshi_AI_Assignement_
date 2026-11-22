import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';

const [url, destination] = process.argv.slice(2);
if (url !== 'https://github.com/ollama/ollama/releases/download/v0.40.16/ollama-windows-amd64.zip' || !destination) {
  throw new Error('Expected the pinned official Ollama v0.40.16 release URL and a destination path.');
}

const response = await fetch(url, { redirect: 'follow' });
if (!response.ok || !response.body) throw new Error(`Ollama download failed with HTTP ${response.status}.`);

const totalBytes = Number(response.headers.get('content-length')) || 0;
let receivedBytes = 0;
let lastPercent = -1;
const progress = new Transform({
  transform(chunk, _encoding, callback) {
    receivedBytes += chunk.length;
    if (totalBytes > 0) {
      const percent = Math.floor((receivedBytes * 100) / totalBytes);
      if (percent >= lastPercent + 5) {
        process.stdout.write(`Downloaded ${percent}% (${Math.round(receivedBytes / 1_048_576)} MiB).\n`);
        lastPercent = percent;
      }
    }
    callback(null, chunk);
  }
});

await pipeline(Readable.fromWeb(response.body), progress, createWriteStream(destination, { flags: 'wx' }));
if (totalBytes > 0 && receivedBytes !== totalBytes) throw new Error(`Ollama download length mismatch: expected ${totalBytes}, received ${receivedBytes}.`);
process.stdout.write(`Downloaded ${receivedBytes} bytes from the pinned official release.\n`);
