/**
 * Regression: "Download PDF" on the Final Report / Feedback / Contract preview
 * used to be an <a target="_blank"> to the /pdf route, which opened the PDF
 * in a new browser tab instead of saving it. Downloads now go through this
 * helper: a same-window anchor click with no target, so the attachment the
 * server sends is saved and the page stays put.
 */

import { downloadFile } from './downloadFile';

describe('downloadFile', () => {
  let clicked;
  let originalClick;

  beforeEach(() => {
    clicked = [];
    originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function click() {
      clicked.push({
        href: this.href,
        target: this.target,
        download: this.getAttribute('download'),
        inDocument: document.body.contains(this),
      });
    };
  });

  afterEach(() => {
    HTMLAnchorElement.prototype.click = originalClick;
  });

  it('clicks a same-window anchor pointing at the file URL', () => {
    downloadFile('https://api.example.test/api/v3/final-reports/fr-1/pdf');
    expect(clicked).toHaveLength(1);
    expect(clicked[0].href).toBe('https://api.example.test/api/v3/final-reports/fr-1/pdf');
    // No target: a `_blank` here is exactly what opened the PDF in a new tab.
    expect(clicked[0].target).toBe('');
    expect(clicked[0].inDocument).toBe(true);
  });

  it('removes the temporary anchor from the document afterwards', () => {
    downloadFile('https://api.example.test/api/v3/final-reports/fr-1/pdf');
    expect(document.body.querySelectorAll('a')).toHaveLength(0);
  });

  it('passes an explicit filename through as the download attribute', () => {
    downloadFile('https://api.example.test/file.pdf', 'Final Report.pdf');
    expect(clicked[0].download).toBe('Final Report.pdf');
  });

  it('does nothing for an empty URL', () => {
    downloadFile('');
    expect(clicked).toHaveLength(0);
  });
});
