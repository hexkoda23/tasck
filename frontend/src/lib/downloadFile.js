// Save a server-generated file (the /pdf and /docx routes answer with
// Content-Disposition: attachment) without leaving the page or opening a
// new tab. A same-window navigation to an attachment URL makes the browser
// save it and keep the current page as it is; `target="_blank"` or
// window.open on the same URL flashes an empty tab instead.
export const downloadFile = (url, filename) => {
  if (!url) return;
  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';
  if (filename) link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
};
