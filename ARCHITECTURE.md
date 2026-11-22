# Architecture

- `app/` contains the seven Next.js App Router routes. Static copy and metadata render on the server. Client components handle interactive workspaces.
- `components/shell.tsx` provides navigation and shared state for preferences, in-memory drafts, favorites, and the conversation timeline. Radix-based UI primitives handle modal focus and dismissal.
- `lib/core.ts` contains phrase data, storage parsing, timeline rules, and gesture policy. `lib/browser.ts` integrates clipboard, synthesis, and recognition. `lib/vision.ts` loads the official browser recognizer on demand.
- `public/sw.js` precaches production page documents and static resources. It excludes live media, submissions, and model requests. Offline navigation can reopen precached pages. A full page reload discards in-memory drafts and unsaved history.

## Data flow

Manual text, selected phrases, and confirmed gesture labels enter the editable draft. The user explicitly chooses whether to show, speak, copy, or save the draft. Incoming transcription populates the partner draft. The browser's recognition service can process microphone data remotely. Spacing cleanup proposes a preview and applies it only with confirmation.

The camera session owns one stream and recognizer. It samples at most about nine frames per second and requires six consecutive supported predictions scoring at least 0.75. The laboratory displays the model category and requires confirmation before the user can insert the literal category label. Cancellation or navigation releases the stream, animation frame, and recognizer. Raw media is never sent by the application.

Preferences and favorites use browser storage. The conversation timeline stays in memory unless users enable local history. The clear-data control removes user data and resets preferences. Static offline assets remain cached.

## Future entry points

A validated recognition model can supply candidates through a separate adapter while retaining explicit confirmation. A future language endpoint would need server-side validation, rate limits, timeouts, and affirmative user approval. Optional sync should begin with explicit consent and a separate persistence adapter so core text and phrases remain independent of authentication.
