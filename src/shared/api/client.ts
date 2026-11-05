// The one place that talks to the network. Every module loads data through fetchJson.

// An error with the details a caller needs to decide what to show.
// status is the HTTP status, or 0 when the request never reached the server.
export class ApiError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(message: string, status: number, url: string, cause?: unknown) {
    super(message, { cause });
    this.name = "ApiError";
    this.status = status;
    this.url = url;
  }
}

// Loads a URL and returns its JSON body as T.
// T is only a promise to TypeScript, the JSON itself is not checked here.
// When the shape matters, ask for `unknown` and check it (see products.api.ts).
export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (cause) {
    throw new ApiError(`Network error while loading ${url}`, 0, url, cause);
  }

  if (!response.ok) {
    throw new ApiError(
      `Request for ${url} failed: ${response.status} ${response.statusText}`,
      response.status,
      url,
    );
  }

  try {
    // response.json() is typed as `any`, so this line is where the body becomes T.
    // T is only a promise to TypeScript (see above): callers that care ask for
    // `unknown` and check it.
    const body: T = await response.json();
    return body;
  } catch (cause) {
    throw new ApiError(
      `${url} did not return valid JSON`,
      response.status,
      url,
      cause,
    );
  }
}
