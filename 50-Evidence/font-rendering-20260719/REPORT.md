# Vietnamese Font Rendering Incident — 2026-07-19

```yaml
observed_at: 2026-07-19T16:40:33+07:00
environment: deployed Cloudflare Worker viewed in desktop Chromium on Windows
source: six owner-supplied raw screenshots
privacy_review: no nightly answers, notes or other personal reflection data visible
verdict_before_fix: fail
verdict_after_local_fix: pass
```

## Observed symptom

Serif headings split visually after Vietnamese glyphs, including `Tối → Tố i`, `điều → điề u`, `Tiến → Tiế n`, `bắt đầu → bắ t đầ u` and `khối → khố i`. Sans-serif text in the same screenshots remained intact.

## Reproduction and cause

- `index.html` declares UTF-8 and the affected strings are present correctly.
- User-facing source files are NFC-normalized and contain no decomposed combining marks.
- Production runtime files matched the local runtime bytes during inspection, so Cloudflare did not transcode the source.
- All affected headings selected `Georgia`; Microsoft's font inventory lists Georgia without Windows code page 1258 (Vietnamese), while Times New Roman lists 1258.
- The observed gaps are therefore font fallback/metric artifacts, not corrupted HTML or character encoding.

Authoritative references:

- Georgia: https://learn.microsoft.com/en-us/typography/font-list/georgia
- Times New Roman: https://learn.microsoft.com/en-us/typography/font-list/times-new-roman

## Remediation

- Centralized serif UI text on `--font-serif-vietnamese: "Times New Roman", Times, "Liberation Serif", serif`.
- Removed every Georgia declaration from `styles.css`.
- Bumped the service-worker cache to `anh-trang-khuya-v2-vietnamese-font`.
- Added required smoke gate `app.vietnamese-font-contract` for font coverage choice and NFC source text.

## Verification

- Pre-fix gate run `20260719T095610Z-02e87d89`: the new font contract failed while all six prior gates passed.
- Final gate run `20260719T100935Z-5f66d979`: all 9/9 required smoke gates passed after evidence/state updates.
- `../browser-smoke-20260719.json`: isolated Chrome verified the app and editor interactions.
- `ui-font-fixed-20260719.png`: post-fix 1440×1400 Chrome capture shows intact Vietnamese serif text; SHA-256 `20C33AABA570405D909D10D47303A33451FB7115B48B3B16FB482FE7B4D7A5E4`.

## Raw screenshot hashes

```text
B6E3B5DE03DCB50CA72E8250280FFA59C5D13CE0E4354B21954016F8E49D89A4  Screenshot 2026-07-19 164033.png
2FDF6C5F4613D4E177C5078AE924593AF708B86C9490936FBE1DE9D4C1AFA0D1  Screenshot 2026-07-19 164041.png
06783736AD702289893055DC9837FEFA11E332D9338B9D0434A7ABFFC1A75495  Screenshot 2026-07-19 164049.png
AFAF04FE9AA6CCC11CF0610EC4139C3D71B6B5902BE391B0A39BD8E5A7FF4F13  Screenshot 2026-07-19 164052.png
40AC1D4CF32974895482B6BC5E877E769FEBC7CC1D62AD2FDA871196F599DE62  Screenshot 2026-07-19 164109.png
4ABFBFAF6CD9214477DAAD7AA60D3D00C1D3513D1998B4FC3DE481382C96E715  Screenshot 2026-07-19 164129.png
```

The raw screenshots were moved unchanged from `10-Resources/` to this dated evidence directory. `10-Resources` is reserved for adopted reusable project resources, not incident evidence.
