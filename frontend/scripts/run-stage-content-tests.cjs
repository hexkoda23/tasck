/* Closed projects stay readable, and nothing regenerates itself twice.
 *
 *   node scripts/run-stage-content-tests.cjs
 *
 * Covers the two rules in src/lib/stageContent.js and then asserts the pages
 * are actually wired to them, so the tests cannot drift from what ships.
 * Uses only @babel/core, already present via react-scripts.
 */
process.env.NODE_ENV = 'test';
process.env.BABEL_ENV = 'test';

const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..');
const babel = require(path.join(ROOT, 'node_modules/@babel/core'));

const compile = (module_, filename) => {
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename,
    presets: [require.resolve(path.join(ROOT, 'node_modules/babel-preset-react-app'))],
    babelrc: false,
    configFile: false,
  });
  return module_._compile(code, filename);
};
const plainJs = Module._extensions['.js'];
Module._extensions['.js'] = (module_, filename) => (
  filename.includes('node_modules') ? plainJs(module_, filename) : compile(module_, filename)
);

const {
  isClosed, listableCases, hasGenerated, shouldAutoGenerate,
} = require('../src/lib/stageContent.js');

let failures = 0;
const check = (label, condition, detail) => {
  const ok = Boolean(condition);
  console.log(`${ok ? 'PASS  ' : 'FAIL  '}${label}`);
  if (!ok) {
    failures += 1;
    if (detail !== undefined) console.log(`        got: ${JSON.stringify(detail)}`);
  }
};

// --------------------------------------------------------------------------
console.log('--- a closed project is still listed, so its stages stay reachable');

const cases = [
  { id: 'live', stage: 'frame', updated_at: '2026-09-20T10:00:00Z' },
  { id: 'closed-new', stage: 'closed', updated_at: '2026-09-24T10:00:00Z' },
  { id: 'closed-old', stage: 'closed', updated_at: '2026-09-01T10:00:00Z' },
  { id: 'archived', stage: 'archived', updated_at: '2026-09-22T10:00:00Z' },
  { id: 'deleted', stage: 'frame', status: 'deleted', updated_at: '2026-09-23T10:00:00Z' },
];
const ts = (c) => Date.parse(c?.updated_at || '') || 0;
const listed = listableCases(cases, ts).map((c) => c.id);

check('closed projects are listed', listed.includes('closed-new') && listed.includes('closed-old'), listed);
check('live projects are still listed', listed.includes('live'), listed);
check('deleted projects stay hidden', !listed.includes('deleted'), listed);
check('archived projects stay hidden, as before', !listed.includes('archived'), listed);
check('live work sorts above closed work', listed[0] === 'live', listed);
check('closed projects sort newest first', listed.indexOf('closed-new') < listed.indexOf('closed-old'), listed);
check('isClosed only means closed', isClosed({ stage: 'closed' })
  && !isClosed({ stage: 'archived' }) && !isClosed({ stage: 'frame' }));
check('isClosed is case-insensitive', isClosed({ stage: 'Closed' }));
check('an empty list is fine', listableCases([], ts).length === 0);
check('a missing list is fine', listableCases(undefined, ts).length === 0);

// --------------------------------------------------------------------------
console.log('\n--- content that exists is never regenerated');

const OPEN = { business_case: { id: 'bc-1', stage: 'frame' } };
const CLOSED = { business_case: { id: 'bc-1', stage: 'closed' } };

check('first visit to an empty stage generates',
  shouldAutoGenerate({ bundle: OPEN, stage: 'pitch_deck' }) === true);

check('a deck already in the bundle blocks it',
  shouldAutoGenerate({ bundle: { ...OPEN, pitch_deck: { id: 'd1' } }, stage: 'pitch_deck' }) === false);

// The point of the fix: the page's own scoped lookup can come back empty
// after the active snapshot moves on, but the case still remembers.
check('a deck the CASE remembers blocks it, even when the bundle lookup missed',
  shouldAutoGenerate({
    bundle: { business_case: { id: 'bc-1', stage: 'frame', plan: { pitch_deck_id: 'd1' } } },
    stage: 'pitch_deck',
  }) === false);

check('a brief the case remembers blocks it',
  shouldAutoGenerate({
    bundle: { business_case: { id: 'bc-1', stage: 'frame', plan: { generated_brief: { title: 'x' } } } },
    stage: 'creative_brief',
  }) === false);

check('a report the case remembers blocks it',
  shouldAutoGenerate({
    bundle: { business_case: { id: 'bc-1', stage: 'reporting', closure: { final_report_id: 'fr-1' } } },
    stage: 'final_report',
  }) === false);

check('a closed project never generates, even with nothing saved',
  shouldAutoGenerate({ bundle: CLOSED, stage: 'pitch_deck' }) === false);
check('an archived project never generates',
  shouldAutoGenerate({ bundle: { business_case: { id: 'b', stage: 'archived' } }, stage: 'pitch_deck' }) === false);

check('nothing generates while the bundle is still loading',
  shouldAutoGenerate({ bundle: null, stage: 'pitch_deck' }) === false);
check('nothing generates before the case has loaded',
  shouldAutoGenerate({ bundle: {}, stage: 'pitch_deck' }) === false);

check('a page holding the document in state does not generate',
  shouldAutoGenerate({ bundle: OPEN, stage: 'pitch_deck', loadedLocally: true }) === false);
check('a page that already fired does not fire again',
  shouldAutoGenerate({ bundle: OPEN, stage: 'pitch_deck', alreadyRan: true }) === false);

check('stages are independent: a saved deck does not block the brief',
  shouldAutoGenerate({ bundle: { ...OPEN, pitch_deck: { id: 'd1' } }, stage: 'creative_brief' }) === true);

check('an unknown stage is never treated as already generated',
  hasGenerated(OPEN, 'nonsense') === false);

// --------------------------------------------------------------------------
console.log('\n--- the pages are actually wired to these rules');

const brandPage = fs.readFileSync(
  path.join(ROOT, 'src/pages/admin/V1AdminCRMBrandDetail.js'), 'utf8');
check('the brand page lists projects through listableCases',
  /listedCasesForBrand = \(items = \[\]\) => listableCases\(/.test(brandPage));
check('  ...and renders that list, not the active-only one',
  /\{listedBusinessCases\.map\(/.test(brandPage) && !/\{activeBusinessCases\.map\(/.test(brandPage));
check('  ...while the current-project decision still uses the active list',
  /const activeBusinessCase = activeBusinessCases\[0\]/.test(brandPage));
check('  ...and closed projects are labelled as such',
  /brand-bc-closed-/.test(brandPage));

const flow = fs.readFileSync(
  path.join(ROOT, 'src/pages/admin/V1BusinessCaseFlowPages.js'), 'utf8');
const guards = flow.match(/shouldAutoGenerate\(\{/g) || [];
check('all three auto-writing stages are guarded', guards.length === 3, guards.length);
for (const stage of ['pitch_deck', 'creative_brief', 'final_report']) {
  check(`  ...including ${stage}`, new RegExp(`stage: '${stage}'`).test(flow));
}

console.log(`\n${failures ? `FAILURES: ${failures}` : 'all passed'}`);
process.exit(failures ? 1 : 0);
