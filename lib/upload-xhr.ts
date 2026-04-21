// XMLHttpRequest wrapper that exposes real upload progress. `fetch` doesn't
// expose the upload side of the wire in any browser, so we use XHR just for
// this path. Returns a Response-compatible object so callers can keep using
// `res.ok`, `res.status`, and `res.json()`.

export type UploadWithProgressOptions = {
  headers?: Record<string, string>;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
};

export function uploadWithProgress(
  url: string,
  body: FormData,
  opts: UploadWithProgressOptions = {}
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    for (const [k, v] of Object.entries(opts.headers ?? {})) {
      xhr.setRequestHeader(k, v);
    }

    // Ensure the server sees us as a browser client and the cookies ride along.
    // XHR sends same-origin cookies by default; no need to set withCredentials.

    if (opts.onProgress) {
      const cb = opts.onProgress;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          cb(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      // Build a Response so callers treat this identically to fetch.
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseXhrHeaders(xhr.getAllResponseHeaders()),
        })
      );
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));

    if (opts.signal) {
      if (opts.signal.aborted) {
        xhr.abort();
        return;
      }
      opts.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(body);
  });
}

function parseXhrHeaders(raw: string): Headers {
  const headers = new Headers();
  raw
    .trim()
    .split(/[\r\n]+/)
    .forEach((line) => {
      const [key, ...valParts] = line.split(': ');
      if (key) headers.set(key, valParts.join(': '));
    });
  return headers;
}
