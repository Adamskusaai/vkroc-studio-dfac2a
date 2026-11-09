# Marketing video capture — URL params (hidden, not in normal UI)

Base (local): http://localhost:8765/
Base (live):  https://adamskusaai.github.io/vkroc-studio-dfac2a/

## Quick start (premium demo + clean portrait orbit)
```
?demo=1&clean=1&cam=orbit&speed=0.5&w=1080&h=1920
```

## Params
| Param | Values | Effect |
|-------|--------|--------|
| `demo=1` | | Auto-open premium furnished demo house and switch to 3D |
| `clean=1` | | No UI chrome, no cursor, toasts suppressed |
| `cam` | `orbit` | `dollhouse` | `walk` | `descend` | `interior` | Fixed eased camera path |
| `speed` | e.g. `0.5`, `1` | Path speed multiplier (lower = slower) |
| `w`,`h` | e.g. `1080`/`1920` or `2160`/`3840` | Fixed canvas size for recording |
| `tour=1` | | Start cinematic auto-tour after load |

## Camera modes (`cam`)
- **orbit** — slow exterior orbit (eased). Use `speed=0.4`–`0.6` for social.
- **dollhouse** — roof fades out + cinematic top/isometric move.
- **walk** — eased walk along path into the house.
- **descend** — dollhouse roof-off + room-by-room high descent.

## Notes for capture
- `cam=*` always snaps a finished full-height house (no mid wall-growth / dollhouse leak into orbit or walk).
- Prefer `gen` without `grow=1` for recording.

## Also polished (no URL needed)
- Wall-growth 2D→3D on `gen(anim)` / first 3D open with animation
- Roof on/off and sun (`#sunh`) tween smoothly (no hard jumps)
- Auto-prehliadka: exterior orbit → rooms → dollhouse peek → slow exterior finale
- Dollhouse button in 3D toolbar + presentation bar

## Example Social recipes
Portrait Reels/TikTok:
`?demo=1&clean=1&cam=orbit&speed=0.45&w=1080&h=1920`

Dollhouse reveal:
`?demo=1&clean=1&cam=dollhouse&speed=0.7&w=1080&h=1920`

Walk-in:
`?demo=1&clean=1&cam=walk&speed=0.55&w=1080&h=1920`

4K portrait (if machine allows):
`?demo=1&clean=1&cam=orbit&speed=0.4&w=2160&h=3840`


## door=closed
With `cam=walk&door=closed`, the front door starts shut and opens smoothly as the camera approaches (~1.5 m). Demo/clean uses tinted glass.
Example: `?demo=1&clean=1&cam=walk&door=closed&w=1080&h=1920`

## prem5 shots (2026-11-09)
Cache: `v=20261109bg` (prem5: furnished dollhouse cutaway, light oak, anthracite roof, dark plinth, door=closed). Files: `/workspace/shots_studio/prem5_*.png`.
Old prem4 URLs keep working (no tour page changes).
Key recipes:
- Orbit: `?demo=1&clean=1&cam=orbit&speed=0.4&w=1080&h=1920&v=20261109bg`
- Dollhouse: `?demo=1&clean=1&cam=dollhouse&w=1080&h=1920&v=20261109bg`
- Walk door closed: `?demo=1&clean=1&cam=walk&door=closed&w=1080&h=1920&v=20261109bg`

## prem6 (2026-11-09)
Cache `v=20261109bi`. Full-height dollhouse (roof only off). `cam=reveal` ~8s roof-lift. Door-swing clearances.
- Reveal: `?demo=1&clean=1&cam=reveal&w=1080&h=1920&v=20261109bi`
- Dollhouse: `?demo=1&clean=1&cam=dollhouse&w=1080&h=1920&v=20261109bi`
- Walk door=closed: `?demo=1&clean=1&cam=walk&door=closed&w=1080&h=1920&v=20261109bi`

Site import: `detectParcel` → `H.plot` when situation drawing has parcel lines.

## prem7
Cache `v=20261109bl`. Computed exterior fit (bbox+FOV+aspect). White gables, tile courses, no car. Kitchen/bath readable in dollhouse.

## Prem7 (cache `20261109bs`)
- Full Scandi furnishing per room + `birdCam` room crops (`prem7_room_*`)
- `fitExteriorCam` for 9:16/16:9 exterior/reveal start
- Walk: centripetal spline through door centre, `aimWalkCam` (no Orbit fight), wall clear ≥0.4 m, door opens on approach
- White facade gables, roof tile courses + bump, car removed from demo plot
