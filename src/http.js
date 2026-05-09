const USER_AGENT =
  "school-districts-data/0.1 (+https://github.com/KTibow/school-districts-data)";

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1_000, 3_000, 9_000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchResponse = async (url, init = {}) => {
  console.debug("connecting to", url);
  const headers = new Headers(init.headers);
  headers.set("user-agent", USER_AGENT);

  return await fetch(url, {
    ...init,
    headers,
  });
};

export const fetchText = async (url, init = {}) => {
  for (let attempt = 0; ; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS_MS[attempt - 1];
      console.debug(
        `retrying ${url} in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`,
      );
      await sleep(delay);
    }

    const response = await fetchResponse(url, init);
    if (response.ok) {
      return await response.text();
    }

    const body = await response.text().catch(() => "");

    // Retry on transient server errors (5xx), up to MAX_RETRIES times
    if (response.status >= 500 && response.status < 600 && attempt < MAX_RETRIES) {
      console.debug(
        `got ${response.status} (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${url}`,
      );
      continue;
    }

    // Non-retryable error or exhausted retries
    console.error(body);
    throw new Error(`Got a ${response.status} (${response.statusText})`);
  }
};

export const fetchJson = async (url, init = {}) =>
  JSON.parse(await fetchText(url, init));
