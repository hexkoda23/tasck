/*
 * Order-independent fingerprint of a set of texts, so a page can tell whether
 * what is on screen is still the text an artifact was generated from.
 *
 * Mirrored by `content_fingerprint()` in backend/v3_routes.py - the backend
 * stamps the fingerprint of the transcripts it analysed onto the record, and
 * the page recomputes it from the transcripts currently loaded. Equal means
 * "already generated from exactly this"; different means the admin edited the
 * text and the generate action should come back.
 *
 * FNV-1a over UTF-16 code units, whitespace collapsed, per-text hashes
 * sorted. Not a security hash - it only has to agree with the Python side,
 * which iterates the same UTF-16 code units so emoji and other non-BMP
 * characters fingerprint identically.
 */
const hash32 = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
};

const normalise = (value) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim();

export const contentFingerprint = (texts) => {
  const parts = (Array.isArray(texts) ? texts : [texts])
    .map(normalise)
    .filter(Boolean)
    .map(hash32)
    .sort();
  return parts.length ? parts.join('-') : '';
};

export default contentFingerprint;
