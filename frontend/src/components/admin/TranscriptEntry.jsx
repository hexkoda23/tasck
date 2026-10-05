import React, { useEffect, useRef, useState } from 'react';
import { ClipboardPaste, Upload } from 'lucide-react';

/*
 * One way in for a transcript: paste it OR upload a file, never both.
 *
 * While the box is empty the admin picks one - "Paste transcript" opens the
 * text box, "Upload file" reads the file into it. Once there is text, only
 * the text box shows (an uploaded file's text stays readable and editable);
 * the choice comes back only if the box is emptied and left.
 */
const TranscriptEntry = ({
  value,
  onChange,
  onFile,
  onFileLoaded,
  placeholder,
  rows = 6,
  accept = '.txt,.md,.vtt,.srt,.csv,.log,.json,text/plain',
  pasteLabel = 'Paste transcript',
  textareaClassName = '',
  testId = 'transcript-entry',
}) => {
  const [mode, setMode] = useState('');
  const textareaRef = useRef(null);
  const fileRef = useRef(null);
  const hasText = Boolean(String(value || '').trim());
  const showTextarea = hasText || mode === 'paste';

  useEffect(() => {
    if (mode === 'paste' && textareaRef.current) textareaRef.current.focus();
  }, [mode]);

  const readFile = async (file) => {
    if (!file) return;
    // The page may read the file itself (its own notices / error handling).
    if (onFile) { onFile(file); return; }
    const text = await file.text();
    if (onFileLoaded) onFileLoaded(text, file);
    else onChange(text);
  };

  if (showTextarea) {
    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => { if (!String(value || '').trim()) setMode(''); }}
        rows={rows}
        placeholder={placeholder}
        className={textareaClassName}
        data-testid={`${testId}-text`}
      />
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2" data-testid={`${testId}-choice`}>
      <button
        type="button"
        onClick={() => setMode('paste')}
        className="flex items-center justify-center gap-2 rounded-md border border-dashed border-[#D7CBB8] bg-[#FBFAF7] px-3 py-4 text-[12px] font-medium text-[#4F3E2F] hover:border-[#1F4A3A] hover:text-[#1F4A3A]"
        data-testid={`${testId}-paste`}
      >
        <ClipboardPaste className="h-4 w-4" /> {pasteLabel}
      </button>
      <button
        type="button"
        onClick={() => fileRef.current && fileRef.current.click()}
        className="flex items-center justify-center gap-2 rounded-md border border-dashed border-[#D7CBB8] bg-[#FBFAF7] px-3 py-4 text-[12px] font-medium text-[#4F3E2F] hover:border-[#1F4A3A] hover:text-[#1F4A3A]"
        data-testid={`${testId}-upload`}
      >
        <Upload className="h-4 w-4" /> Upload file
      </button>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          readFile(event.target.files?.[0]);
          event.target.value = '';
        }}
        data-testid={`${testId}-file`}
      />
    </div>
  );
};

export default TranscriptEntry;
