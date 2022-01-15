// parse query parameters from URL
export const parseUrl = (urlString: string): Record<string, string> => {
  const url = new URL(urlString);
  const query = {};
  url.searchParams.forEach((val, key) => {
    query[key] = val;
  });
  return query;
};

// parse query parameters from location
export const parseQuery = (search: string): Record<string, string> => {
  const params = new URLSearchParams(search);
  const query = {};
  params.forEach((val, key) => {
    query[key] = val;
  });
  return query;
};

// parse query parameters from URL
export const addQueryParamsToUrl = (urlString: string, params: Record<string, unknown>): string => {
  const url = new URL(urlString);

  Object.entries(params).forEach(([key, val]) => {
    url.searchParams[key] = val;
  });

  return url.toString();
};

// add extra query parameters to location
export const addQueryParameters = (search: string, params = {}, defaultParams = {}): string => {
  const query = parseQuery(search);
  let changed = false;

  Object.entries(params).forEach(([key, val]) => {
    if (key in defaultParams) {
      // has default
      if (val !== defaultParams[key]) {
        query[key] = `${val}`;
        changed = true;
      } else if (key in query) {
        delete query[key];
        changed = true;
      }
    } else {
      // no default
      // eslint-disable-next-line no-lonely-if
      if (val !== undefined && val !== null && val !== '') {
        query[key] = `${val}`;
        changed = true;
      } else if (key in query) {
        delete query[key];
        changed = true;
      }
    }
  });

  if (!changed) {
    return search;
  }
  return `?${new URLSearchParams(query).toString()}`;
};

// parse into URLParams
export const toUrlParams = (query = {}, defaultParams = {}): string => {
  const params = {};
  Object.entries(query).forEach(([key, val]) => {
    // omit default values
    if (key in defaultParams && defaultParams[key] === val) {
      return;
    }

    if (Array.isArray(val)) {
      params[key] = val.join(',');
    } else if (val !== undefined && val !== null && val !== '' && !Number.isNaN(val)) {
      params[key] = `${val}`;
    }
  });
  return new URLSearchParams(params).toString();
};
