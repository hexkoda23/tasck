
# Playwright script for mcp_browser_automation: verifies Pitch Deck flipbook pagination/density from UI.
await page.set_viewport_size({"width": 1920, "height": 1080})
try:
    backend = "https://tasck-live-demo-1.preview.emergentagent.com"
    await page.goto("http://localhost:3000", wait_until="domcontentloaded")
    res = await page.evaluate("""async (base) => {
        const r = await fetch(`${base}/api/auth/demo-login`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({role:'admin'})});
        return await r.json();
    }""", backend)
    await page.evaluate("""({user, token}) => {
        localStorage.setItem('tasck_user', JSON.stringify(user));
        localStorage.setItem('tasck_token', token);
    }""", res)
    print("Login localStorage seeded for V1 admin")
    await page.goto("http://localhost:3000/admin/business-cases/bc-5e08b38a/frame/pitch-deck", wait_until="networkidle")
    await page.wait_for_selector('[data-testid="pitch-preview-btn"]', timeout=45000)
    section_count = await page.locator('[data-testid^="pitch-section-"]').count()
    print(f"Pitch Deck page loaded with {section_count} editable sections")
    await page.locator('[data-testid="pitch-preview-btn"]').click()
    await page.wait_for_selector('[data-testid="pitch-flipbook-iframe"]', timeout=20000)
    iframe_handle = await page.locator('[data-testid="pitch-flipbook-iframe"]').element_handle()
    frame = await iframe_handle.content_frame()
    await frame.wait_for_selector('#book .pf-leaf', timeout=20000)
    metrics = await frame.evaluate("""() => {
      const leaves = Array.from(document.querySelectorAll('#book .pf-leaf'));
      const allPages = leaves.flatMap((leaf) => Array.from(leaf.querySelectorAll('.pf-page-fill > .pf-paper, .pf-page-fill > .pf-page')));
      const contentPages = allPages.filter((p) => p.querySelectorAll('.pf-sec').length > 0);
      return {
        leafCount: leaves.length,
        totalPagesInBook: allPages.length,
        contentPages: contentPages.length,
        sectionsPerContentPage: contentPages.map((p) => p.querySelectorAll('.pf-sec').length),
        headingsPerContentPage: contentPages.map((p) => Array.from(p.querySelectorAll('.pf-sec-h')).map(h => h.textContent.trim())),
        blankBottomFractions: contentPages.map((p) => {
          const body = p.querySelector('.pf-page-body');
          const sections = Array.from(p.querySelectorAll('.pf-sec'));
          if (!body || !sections.length) return null;
          const bodyRect = body.getBoundingClientRect();
          const lastRect = sections[sections.length - 1].getBoundingClientRect();
          return Math.max(0, (bodyRect.bottom - lastRect.bottom) / bodyRect.height);
        }),
        navLabel: document.querySelector('#label')?.textContent || ''
      };
    }""")
    print(f"Pitch flipbook metrics: {metrics}")
    # User requirement: no 5+ spreads / no one-short-section-per-page; expected ~2-3 spreads and 2-3 sections/page for 10 sections.
    assert metrics['leafCount'] <= 3, f"Flipbook still has too many spreads/leaves: {metrics['leafCount']} (expected ~2-3)"
    assert all(n >= 2 for n in metrics['sectionsPerContentPage']), f"Some content pages still have one section only: {metrics['sectionsPerContentPage']}"
    assert max(metrics['blankBottomFractions']) < 0.45, f"Large bottom blank area remains: {metrics['blankBottomFractions']}"
    print("PASS: Pitch deck flipbook page density meets requested behavior")
except Exception as e:
    print(f"FAIL: Pitch Deck flipbook density verification failed: {e}")
    raise
