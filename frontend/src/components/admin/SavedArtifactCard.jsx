import React from 'react';
import { CheckCircle2, PencilLine } from 'lucide-react';

/*
 * "This is generated and saved" marker for the admin flow.
 *
 * Every page that generates something - the Connect analysis, the Alignment
 * Snapshot, the brainstorm, the creator match, the pitch deck, the brief, the
 * final report - used to offer its Generate button forever, with nothing on
 * screen to say the work had already been done and stored. Admins re-ran
 * generation they did not need, and paid for it in AI calls and in overwritten
 * edits.
 *
 * Two states:
 *   saved  - green. The artifact exists and matches the text it was built
 *            from. The regenerate action is not offered; the page's footer
 *            Next carries the admin onward.
 *   stale  - amber. The source text has been edited since, so the artifact no
 *            longer matches it and regenerating is the right call.
 *
 * `action` is optional. Where the page can tell whether the artifact is stale
 * (the Connect analysis, the Alignment Snapshot) nothing is passed in the
 * saved state, so there is simply no button to press. Where it cannot, the
 * page passes a demoted "Regenerate" that sits inside the card rather than
 * standing in the header as the primary call to action.
 */
const SavedArtifactCard = ({
  title,
  savedAt,
  detail,
  stale = false,
  staleMessage = 'The text has changed since this was generated. Regenerate to bring it up to date.',
  action = null,
  testId,
}) => {
  const when = (() => {
    if (!savedAt) return '';
    const date = new Date(savedAt);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
    });
  })();

  return (
    <div
      className={`rounded-lg border p-3 ${stale ? 'border-[#E5C99A] bg-[#FBF4E4]' : 'border-[#C7D7CF] bg-[#EAF4EE]'}`}
      data-testid={testId}
      data-state={stale ? 'stale' : 'saved'}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {stale
            ? <PencilLine className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#8A6E2F]" />
            : <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1F4A3A]" />}
          <div className="min-w-0">
            <p className={`text-[12px] font-semibold ${stale ? 'text-[#7A5A1E]' : 'text-[#1F4A3A]'}`}>
              {stale ? `${title} - needs regenerating` : `${title} - saved`}
            </p>
            <p className={`mt-0.5 text-[11px] leading-5 ${stale ? 'text-[#7A5A1E]' : 'text-[#4F6B5D]'}`}>
              {stale ? staleMessage : (
                <>
                  Stored on this project{when ? ` on ${when}` : ''}. No need to run it again.
                  {detail ? ` ${detail}` : ''}
                </>
              )}
            </p>
          </div>
        </div>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </div>
    </div>
  );
};

export default SavedArtifactCard;
