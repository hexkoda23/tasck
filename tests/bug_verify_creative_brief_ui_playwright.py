
# Playwright script for mcp_browser_automation: verifies Creative Brief Studio unsent/sent DOCX downloads from UI.
# This script is stored for reproducibility; executed via the browser automation tool in this verification run.
await page.set_viewport_size({"width": 1920, "height": 1080})
try:
    import os, zipfile
    from pathlib import Path
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
    await page.goto("http://localhost:3000/admin/business-cases/bc-942ddda2/frame/brief", wait_until="networkidle")
    await page.wait_for_selector('[data-testid="creator-brief-card"]', timeout=45000)
    print("Creative Brief Studio loaded with creator card(s)")
    # Make draft deterministic and clearly unsent; this business case had no persisted briefs in API precheck.
    editor = page.locator('[data-testid^="brief-editor-"]').first
    await editor.fill("Objective: UI verification draft for Google Docs DOCX download.\nDeliverables: 1 Reel and 2 Stories.\nTone: Premium TASCK template smoke test.")
    await page.wait_for_timeout(500)
    download_button = page.get_by_role("button", name="Download Google Docs").first
    async with page.expect_download(timeout=45000) as dl_info:
        await download_button.click()
    download = await dl_info.value
    unsent_path = "/app/test_reports/ui_unsent_creative_brief.docx"
    await download.save_as(unsent_path)
    print(f"Unsent draft download saved: {unsent_path}, suggested={download.suggested_filename}")
    assert download.suggested_filename.lower().endswith('.docx'), "Unsent draft did not download a .docx file"
    with zipfile.ZipFile(unsent_path) as z:
        names = set(z.namelist())
        document = z.read('word/document.xml').decode('utf-8', errors='ignore')
        header = z.read('word/header1.xml').decode('utf-8', errors='ignore')
        footer = z.read('word/footer1.xml').decode('utf-8', errors='ignore')
        font_table = z.read('word/fontTable.xml').decode('utf-8', errors='ignore')
    required = {'word/media/tasck_logo.png','word/media/footer_contact.png','word/media/decorative_curves.png'}
    missing = sorted(required - names)
    assert not missing, f"Unsent DOCX missing template media: {missing}"
    assert 'TasckWatermark' in header and 'rIdWatermark' in header, "Unsent DOCX missing watermark VML in header"
    assert 'Century Gothic' in document and 'Century Gothic' in font_table, "Unsent DOCX missing Century Gothic references"
    assert '1. Project Reference' in document and '2. Context (High-Level)' in document, "Unsent DOCX missing bold template section headings"
    assert 'Objective: UI verification draft' in document, "Unsent DOCX missing draft body content"
    print("PASS: Unsent draft Download Google Docs produced a templated DOCX, not plain HTML/tab")

    # Sent path: click Email to creator to persist, then close popup if it appears, then download again.
    async with page.expect_response(lambda r: '/api/v3/creative-briefs' in r.url and r.request.method == 'POST', timeout=60000) as resp_info:
        await page.locator('[data-testid^="brief-email-"]').first.click()
    resp = await resp_info.value
    print(f"Email/persist response status: {resp.status}")
    await page.wait_for_timeout(1500)
    ok_button = page.get_by_role("button", name="OK")
    if await ok_button.count() > 0:
        await ok_button.first.click(force=True)
        await page.wait_for_timeout(300)
    async with page.expect_download(timeout=45000) as dl_info2:
        await download_button.click()
    download2 = await dl_info2.value
    sent_path = "/app/test_reports/ui_sent_creative_brief.docx"
    await download2.save_as(sent_path)
    print(f"Sent brief download saved: {sent_path}, suggested={download2.suggested_filename}")
    assert download2.suggested_filename.lower().endswith('.docx'), "Sent brief did not download a .docx file"
    with zipfile.ZipFile(sent_path) as z:
        names2 = set(z.namelist())
        document2 = z.read('word/document.xml').decode('utf-8', errors='ignore')
        header2 = z.read('word/header1.xml').decode('utf-8', errors='ignore')
        font_table2 = z.read('word/fontTable.xml').decode('utf-8', errors='ignore')
    missing2 = sorted(required - names2)
    assert not missing2, f"Sent DOCX missing template media: {missing2}"
    assert 'TasckWatermark' in header2 and 'rIdWatermark' in header2, "Sent DOCX missing watermark VML in header"
    assert 'Century Gothic' in document2 and 'Century Gothic' in font_table2, "Sent DOCX missing Century Gothic references"
    assert '1. Project Reference' in document2 and '2. Context (High-Level)' in document2, "Sent DOCX missing template section headings"
    print("PASS: Sent brief Download Google Docs produced a templated DOCX")

    error_text = await page.evaluate("""() => {
    const errorElements = Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]'));
    return errorElements.map(el => el.textContent).join(", ");
    }""")
    if error_text:
        print(f"Found error message: {error_text}")
    else:
        print("No error messages found on the page")
except Exception as e:
    print(f"FAIL: Creative Brief UI download verification failed: {e}")
    raise
