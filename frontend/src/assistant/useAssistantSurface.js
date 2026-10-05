// useAssistantSurface
// ---------------------------------------------------------------------------
// How a page tells the assistant what it is looking at.
//
// Deliberately small: the page declares WHAT it is, never HOW to change it. The
// old contract handed the widget an applySectionUpdate callback and the model's
// edit was applied to local draft state that the admin then had to save. Now
// the tool writes to the database and hands back the saved document, so the
// page's only job is to describe itself and to accept the document that comes
// back.
//
//   useAssistantSurface({
//     id: `alignment-snapshot:${snapshot.id}`,
//     label: `Alignment Snapshot — ${brandName}`,
//     mode: 'document',
//     documentKind: 'alignment_snapshot',
//     documentId: snapshot.id,
//     projectId: businessCaseId,
//     onDocumentChanged: (doc) => setSnapshot(doc),
//   });
import { useEffect, useRef } from 'react';

import { useAssistant } from './AssistantProvider';

/**
 * @param {object} descriptor
 * @param {string} descriptor.id            stable per document instance
 * @param {string} descriptor.label         shown to the admin and the model
 * @param {'document'|'record'|'readonly'} descriptor.mode  which tools apply
 * @param {string} [descriptor.documentKind] alignment_snapshot, pitch_deck, ...
 * @param {string} [descriptor.documentId]
 * @param {string} [descriptor.projectId]
 * @param {function} [descriptor.onDocumentChanged] receives the saved document
 */
export const useAssistantSurface = (descriptor) => {
  const { registerSurface } = useAssistant();
  // Held in a ref so a page re-render does not re-register the surface and
  // churn the recent-pages trail on every keystroke in an editor.
  const latest = useRef(descriptor);
  latest.current = descriptor;

  const {
    id, label, mode, documentKind, documentId, projectId,
  } = descriptor || {};

  useEffect(() => {
    if (!id) return undefined;
    return registerSurface({
      id,
      label,
      mode: mode || 'readonly',
      documentKind,
      documentId,
      projectId,
      // Read through the ref so the callback stays current without the effect
      // depending on a function identity that changes every render.
      onDocumentChanged: (doc) => latest.current?.onDocumentChanged?.(doc),
    });
  }, [registerSurface, id, label, mode, documentKind, documentId, projectId]);
};

export default useAssistantSurface;
