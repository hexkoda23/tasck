// Shared helpers to render readiness/Alignment Snapshot field values.
// Never let raw {} objects or Python-repr strings leak into the UI.

const tryParseDictString = (str) => {
  // Match Python repr (single quotes) → JSON.parse-able form
  const s = String(str || '').trim();
  if (!s.startsWith('{') || !s.endsWith('}')) return null;
  try {
    return JSON.parse(s);
  } catch (e) {
    // Convert single quotes to double quotes (defensive — handles Python repr)
    try {
      const fixed = s
        .replace(/'/g, '"')
        // Handle embedded escaped double-quotes inside originally-single-quoted strings (rare)
        .replace(/\\\\"/g, '\\"');
      return JSON.parse(fixed);
    } catch (e2) {
      return null;
    }
  }
};

const normalizeKpiItem = (item) => {
  if (item == null) return null;
  if (typeof item === 'object' && !Array.isArray(item)) {
    return {
      kpi: String(item.kpi || item.metric || item.name || 'Metric').trim(),
      target: String(item.target || '').trim(),
      evidence: String(item.evidence || '').trim(),
    };
  }
  if (typeof item === 'string') {
    const parsed = tryParseDictString(item);
    if (parsed) return normalizeKpiItem(parsed);
    return { kpi: item.trim(), target: '', evidence: '' };
  }
  return { kpi: String(item).trim(), target: '', evidence: '' };
};

export const normalizeKpiList = (kpis) => {
  if (!kpis) return [];
  const list = Array.isArray(kpis) ? kpis : [kpis];
  return list.map(normalizeKpiItem).filter((k) => k && k.kpi);
};

const tagAsNeedsConfirmation = (val) =>
  typeof val === 'string' && /^needs confirmation/i.test(val.trim());

// Stringify a single readiness-field value for plain-text rendering
// (used in tables, PDFs, plain-text emails). Never returns "[object Object]"
// or Python-repr dict text.
export const formatReadinessFieldValue = (key, value) => {
  if (value == null || value === '') return '';
  if (key === 'kpis') {
    const items = normalizeKpiList(value);
    if (!items.length) return '';
    return items
      .map((k, idx) => {
        const lines = [`${idx + 1}. ${k.kpi}`];
        if (k.target) lines.push(`   Target: ${k.target}`);
        if (k.evidence) lines.push(`   Evidence: ${k.evidence}`);
        return lines.join('\n');
      })
      .join('\n');
  }
  if (key === 'key_marketing_channels') {
    const arr = Array.isArray(value) ? value : [value];
    return arr.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ');
  }
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
      .join('\n');
  }
  if (typeof value === 'object') {
    // Don't let raw objects leak; format key:value pairs
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join('\n');
  }
  return String(value);
};

// React renderer for a KPI cell — used in tables and the Alignment Snapshot preview.
export const renderKpiList = (kpis, { className = '' } = {}) => {
  const items = normalizeKpiList(kpis);
  if (!items.length) return null;
  return items.map((k, idx) => ({
    index: idx + 1,
    kpi: k.kpi,
    target: k.target,
    evidence: k.evidence,
    needsConfirmation: tagAsNeedsConfirmation(k.target) || tagAsNeedsConfirmation(k.kpi),
    className,
  }));
};

// Renderer that turns a cell value into a React node — handles dict-shaped
// KPIs cleanly, otherwise falls back to plain text.
export const cellNodeForReadinessValue = (key, value) => {
  if (key === 'kpis' || (Array.isArray(value) && value.length && typeof value[0] === 'object' && value[0] && ('kpi' in value[0] || 'target' in value[0] || 'metric' in value[0]))) {
    const items = normalizeKpiList(value);
    if (!items.length) return '';
    return items;
  }
  return formatReadinessFieldValue(key, value);
};

// Heuristic: detect a row that is rendering KPIs even if `key` isn't passed.
// Used by the generic table renderer to keep KPI cells clean.
export const looksLikeKpiCell = (cellValue) => {
  if (Array.isArray(cellValue) && cellValue.length && cellValue.some((v) => typeof v === 'object' && v && ('kpi' in v || 'target' in v))) return true;
  if (typeof cellValue === 'string') {
    if (/^\s*\{['"]?(kpi|metric)['"]?\s*:/i.test(cellValue)) return true;
    if (/^\s*\d+\.\s+[^\n]+\n\s*Target:/.test(cellValue)) return false; // already formatted
  }
  return false;
};
