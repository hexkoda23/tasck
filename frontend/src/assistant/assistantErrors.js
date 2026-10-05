// assistantErrors
// ---------------------------------------------------------------------------
// Two kinds of failure reach the chat window, and they need different handling.
//
//  1. The backend ran and something went wrong - the model timed out, the key
//     was rejected, a tool is not wired up. The backend now reports these IN
//     the response body (HTTP 200, `error: {message, hint}`), already worded
//     for an admin. They are shown as-is.
//
//  2. The request never produced a response the backend wrote. A proxy dropped
//     the connection, the server restarted mid-request, the network went. The
//     body here is whatever the proxy felt like sending - an HTML error page,
//     Cloudflare's "origin is overloaded or misconfigured", or axios's bare
//     "Request failed with status code 404". None of that means anything to an
//     admin, and no backend change can reword it, because the backend never
//     saw the failure. So it is translated here, by status.
//
// The two quota and route messages are specified word for word by the product
// requirement and match backend/assistant/upstream.py exactly.

export const MESSAGES = {
  quota: 'API Quota Exceeded: The Anthropic API balance or usage limit has been reached. Please update billing/credits in the console.',
  notSupported: 'Action Not Supported: The requested route or backend action endpoint is missing or improperly configured.',
  auth: 'Authentication Failed: The server rejected the request credentials. Sign in again, or ask whoever manages the deployment to check the API keys.',
  badRequest: 'Request Rejected: The request was malformed or too large. Try a smaller change, such as one section at a time.',
  unreachable: 'Server Unreachable: The request did not finish - the server may have restarted or taken too long to answer. Your change may still have been saved, so check the page before trying again.',
  offline: 'Connection Lost: The assistant could not be reached. Check your connection and try again.',
  timeout: 'Request Timed Out: The assistant took too long to answer. Your change may still have been saved, so check the page before trying again.',
  unknown: 'Unexpected Error: The assistant could not complete that request.',
};

const HINTS = {
  quota: 'An account owner needs to add credits or raise the usage limit.',
  notSupported: 'Make this change directly on the page for now.',
  unreachable: 'Refresh the page to see the current saved state.',
  timeout: 'Refresh the page to see the current saved state.',
};

const looksLikeHtml = (data) => typeof data === 'string' && /^\s*</.test(data);

// Gateway and edge statuses: 502/503/504 from a proxy, 520-526 from Cloudflare.
// All mean the same thing to an admin - the request did not complete.
const EDGE_STATUSES = new Set([502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 530]);

/**
 * Turn an axios failure into {message, hint} an admin can act on.
 * Never returns an HTML page, a raw status line, or a bare "Not Found".
 */
export const describeTransportError = (err) => {
  const response = err?.response;

  if (!response) {
    if (err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message || '')) {
      return { message: MESSAGES.timeout, hint: HINTS.timeout };
    }
    return { message: MESSAGES.offline, hint: null };
  }

  const { status, data } = response;

  // A structured error the backend wrote itself - trust its wording.
  const detail = data && !looksLikeHtml(data) ? data.detail : null;
  if (data?.error?.message) return { message: data.error.message, hint: data.error.hint || null };
  if (detail && typeof detail === 'object' && detail.message) {
    return { message: detail.message, hint: detail.how_to_fix || detail.hint || null };
  }

  if (status === 429) return { message: MESSAGES.quota, hint: HINTS.quota };
  if (status === 404) return { message: MESSAGES.notSupported, hint: HINTS.notSupported };
  if (status === 401 || status === 403) return { message: MESSAGES.auth, hint: null };
  if (EDGE_STATUSES.has(status) || looksLikeHtml(data)) {
    return { message: MESSAGES.unreachable, hint: HINTS.unreachable };
  }
  if (status === 400 || status === 413 || status === 422) {
    // A plain-string detail from our own API is already human-readable
    // ("message is required"); a validation array from FastAPI is not.
    if (typeof detail === 'string' && detail && detail !== 'Not Found') {
      return { message: detail, hint: null };
    }
    return { message: MESSAGES.badRequest, hint: null };
  }
  if (typeof detail === 'string' && detail && detail !== 'Not Found') {
    return { message: detail, hint: null };
  }
  return { message: MESSAGES.unknown, hint: null };
};

/** Split "Title: body" so the warning box can lead with the title. */
export const splitTitle = (message) => {
  const text = String(message || '');
  const idx = text.indexOf(': ');
  // Only treat it as a title if the prefix is short and reads like one.
  if (idx > 0 && idx <= 40 && /^[A-Z][A-Za-z ]+$/.test(text.slice(0, idx))) {
    return { title: text.slice(0, idx), body: text.slice(idx + 2) };
  }
  return { title: null, body: text };
};
