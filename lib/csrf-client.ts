// Client helpers that fetch a CSRF token from a matching GET endpoint, retry
// once on a 403 (token expired), and work with either JSON fetch or XHR upload.
import { uploadWithProgress, type UploadWithProgressOptions } from './upload-xhr';

async function fetchCsrfToken(endpoint: string): Promise<string> {
  const res = await fetch(endpoint, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`CSRF token fetch failed: ${res.status}`);
  const { csrfToken } = (await res.json()) as { csrfToken: string };
  if (!csrfToken) throw new Error('CSRF token missing in response');
  return csrfToken;
}

export type CsrfFetchOptions = RequestInit & {
  csrfEndpoint: string;
  csrfHeader?: string;
};

/** JSON-style request with CSRF token, retried once on 403. */
export async function fetchWithCsrfRetry(url: string, init: CsrfFetchOptions): Promise<Response> {
  const { csrfEndpoint, csrfHeader = 'x-csrf-token', headers, ...rest } = init;
  const send = (token: string) =>
    fetch(url, {
      ...rest,
      credentials: 'same-origin',
      headers: { ...(headers ?? {}), [csrfHeader]: token },
    });

  let token = await fetchCsrfToken(csrfEndpoint);
  let res = await send(token);
  if (res.status === 403) {
    token = await fetchCsrfToken(csrfEndpoint);
    res = await send(token);
  }
  return res;
}

export type CsrfUploadOptions = UploadWithProgressOptions & {
  csrfEndpoint: string;
  csrfHeader?: string;
};

/** Multipart upload with real progress + CSRF token, retried once on 403. */
export async function uploadWithCsrfRetry(
  url: string,
  body: FormData,
  opts: CsrfUploadOptions
): Promise<Response> {
  const { csrfEndpoint, csrfHeader = 'x-csrf-token', headers, ...rest } = opts;
  const send = (token: string) =>
    uploadWithProgress(url, body, {
      ...rest,
      headers: { ...(headers ?? {}), [csrfHeader]: token },
    });

  let token = await fetchCsrfToken(csrfEndpoint);
  let res = await send(token);
  if (res.status === 403) {
    token = await fetchCsrfToken(csrfEndpoint);
    res = await send(token);
  }
  return res;
}
