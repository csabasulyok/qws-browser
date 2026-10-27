// add query parameters to URL
export const addQueryParamsToUrl = (urlString: string, params: Record<string, unknown>): string => {
  const url = new URL(urlString);

  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, String(val));
  }

  return url.href;
};
