const originalBackend = process.env.REACT_APP_BACKEND_URL;

afterEach(() => {
  if (originalBackend === undefined) delete process.env.REACT_APP_BACKEND_URL;
  else process.env.REACT_APP_BACKEND_URL = originalBackend;
  jest.resetModules();
});

test('copied and WhatsApp brief links include the site when the API is same-origin', () => {
  process.env.REACT_APP_BACKEND_URL = '';
  const { v3TemplateBriefPreviewUrl, v3AlignmentPreviewUrl } = require('./v3api');
  const link = v3TemplateBriefPreviewUrl('bc-48d65fb5', 'snapshot-1', 'creator-7992397f');
  const parsed = new URL(link);
  expect(parsed.origin).toBe(window.location.origin);
  expect(parsed.pathname).toBe('/api/v3/business-cases/bc-48d65fb5/creative-brief/preview');
  expect(parsed.searchParams.get('alignment_snapshot_id')).toBe('snapshot-1');
  expect(parsed.searchParams.get('creator_id')).toBe('creator-7992397f');
  expect(v3AlignmentPreviewUrl('snapshot-1')).toBe(`${window.location.origin}/api/v3/alignment-snapshots/snapshot-1/preview`);
});

test('configured API origin remains in document URLs', () => {
  process.env.REACT_APP_BACKEND_URL = 'https://api.example.com/';
  const { v3TemplateBriefPreviewUrl } = require('./v3api');
  expect(v3TemplateBriefPreviewUrl('bc-1')).toBe('https://api.example.com/api/v3/business-cases/bc-1/creative-brief/preview');
});
