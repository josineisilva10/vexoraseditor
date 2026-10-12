# Studio Video AI

- [x] Editor layout adapted to desktop/mobile, normalized composition and media library.
- [x] Functional timeline, playback, trimming, split, undo/redo, text, audio, transformations.
- [x] Cloud login, private uploads, project save/open/duplicate/delete and autosave.
- [x] Real browser composition export and cancellation, validate downloaded video (WebM verified; MP4 conditional on browser codecs).
- [ ] Heavy server FFmpeg rendering — blocked: external render service URL and credential not supplied.
- [ ] Video person-background removal — blocked: segmentation service not configured.
- [x] Test editing, empty-export rejection, desktop/mobile, private upload, save/reopen, downloaded output and account isolation.

Remaining verification: server render failures and MP4 H.264/AAC end-to-end depend on the external rendering service; segmentation tests depend on configured person-segmentation provider.