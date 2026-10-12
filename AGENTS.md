<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Editor architecture
- Keep the normalized Project/Clip/MediaAsset model independent of timeline DOM because persistence, history and composition must share one source of truth.
- Preview and browser export use the same Canvas compositor with one media element per clip because duplicated and overlapping sources require independent playback positions.
- Save authenticated projects in Cloud with owner-scoped RLS and private storage signed URLs; use resumable chunked uploads to avoid reading entire video files into memory.
- Browser rendering uses capability-detected MediaRecorder formats and validates output before download; never substitute an original source for a rendered composition.
- Heavy FFmpeg rendering and person segmentation require external capable services; keep them explicitly unavailable until configured because the hosted runtime cannot spawn FFmpeg.
