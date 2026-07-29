#!/usr/bin/env python3
"""check_shots.py — the visual regression pass.

    python3 -m http.server 8899 &
    python3 scripts/check_shots.py              # diff against docs/shots/
    python3 scripts/check_shots.py --update     # accept what is there now
    python3 scripts/check_shots.py --calibrate  # measure the noise floor

[12.17] `docs/shots/` has been the reference set since chapter 6: one shot
per figure form, per masthead width, per analysis page, on both grounds. A
change that moves one of them shows up in the diff of the commit — but only
if somebody looks, and "somebody will look" is the same argument as a check
that warns instead of failing.

This re-shoots the whole set into a scratch directory and compares it pixel
by pixel against the reference. A figure that moved fails the build; a
figure that did not, does not.

[12.18] THE THRESHOLD, AND WHY IT IS THIS NUMBER

Two identical renders of the same page are not identical images. Glyph
rasterisation and edge antialiasing land differently between runs, so a
naive "any pixel differs" check fails on every run and gets switched off
within a week.

So the threshold is measured rather than guessed. `--calibrate` shoots the
whole set twice in a row, with nothing changed in between, and reports the
worst noise it sees. Measured on this harness, over 58 images:

    per-channel delta on a repeat shot   0 of 255
    pixels differing by more than that   0.00000% of the image

Headless Chromium at a fixed device scale is deterministic enough that two
runs are bit-identical here. That is not a licence to set the threshold to
zero: a build box with a different font build or a different Chromium point
release will not be, and a check that fails on every machine but one is a
check that gets switched off. So the tolerance stays.

The other end was measured the same way. Chapter 6's mark vocabulary
changed the polls scatter, the odds chart and the two analyses, and against
the old reference those moved:

    the odds chart's cursor dot and line weight   2.04% of its pixels
    the polls scatter, rings instead of squares   4.24%
    the two analyses, rebuilt on the system       13.6% and 23.0%
    the masthead, one control two pixels wider    1.13%

so the smallest real change worth catching moves about one pixel in ninety.

    CHANNEL_TOL      12   a pixel counts as changed only if some channel
                          moves by more than this. Twelve levels is below
                          any change a person would call visible and far
                          above rasterisation noise; every real change
                          above moved its pixels by 132 to 233.
    PIXEL_FRACTION   0.002
                          a figure fails when more than 0.2% of its pixels
                          changed. A fifth of the smallest real change
                          measured, and infinitely more than the noise
                          floor.

A change in an image's dimensions is a failure on its own: a figure that
grew is a figure that moved, and there is no fraction to compute.

Re-record the reference with `--update` when a change is intended. The
numbers above can be re-measured at any time with `--calibrate`; if they
move, this docstring is wrong and should be corrected rather than the
threshold quietly raised.
"""

import argparse
import os
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHOTS = ROOT / "docs" / "shots"
SHOOTERS = ["shoot_masthead.py", "shoot_figures.py", "shoot_states.py"]

CHANNEL_TOL = 12
PIXEL_FRACTION = 0.002


def shoot(into: pathlib.Path) -> None:
    into.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, SHOTS_DIR=str(into))
    for name in SHOOTERS:
        r = subprocess.run([sys.executable, str(ROOT / "scripts" / name)],
                           env=env, capture_output=True, text=True)
        if r.returncode != 0:
            sys.stderr.write(r.stdout + r.stderr)
            raise SystemExit("check-shots: %s failed; there is nothing to "
                             "diff against." % name)


def load(path):
    from PIL import Image
    import numpy as np
    with Image.open(path) as im:
        return np.asarray(im.convert("RGB"), dtype=np.int16)


def compare(a_path, b_path):
    """Returns (changed_fraction, worst_channel_delta) or None on a size change."""
    import numpy as np
    a, b = load(a_path), load(b_path)
    if a.shape != b.shape:
        return None
    delta = np.abs(a - b).max(axis=2)
    changed = int((delta > CHANNEL_TOL).sum())
    return changed / float(delta.size), int(delta.max())


def calibrate() -> int:
    """Shoot the set twice with nothing changed and report what moved."""
    one = ROOT / ".shots-scratch-a"
    two = ROOT / ".shots-scratch-b"
    for d in (one, two):
        shutil.rmtree(d, ignore_errors=True)
    try:
        print("shooting the set twice, changing nothing in between...")
        shoot(one)
        shoot(two)
        worst_delta, worst_frac, worst_name = 0, 0.0, ""
        n = 0
        for ref in sorted(one.glob("*.png")):
            other = two / ref.name
            if not other.exists():
                print("  %s was not shot the second time" % ref.name)
                continue
            r = compare(ref, other)
            if r is None:
                print("  %s changed size between two identical runs" % ref.name)
                continue
            frac, delta = r
            n += 1
            if delta > worst_delta:
                worst_delta, worst_name = delta, ref.name
            worst_frac = max(worst_frac, frac)
        print("\nover %d images, with nothing changed:" % n)
        print("  worst per-channel delta   %d of 255  (%s)" % (worst_delta, worst_name))
        print("  worst changed fraction    %.5f%%" % (worst_frac * 100))
        print("\nthe thresholds in force are CHANNEL_TOL=%d and "
              "PIXEL_FRACTION=%.4f (%.2f%%)." % (CHANNEL_TOL, PIXEL_FRACTION,
                                                 PIXEL_FRACTION * 100))
        if worst_delta > CHANNEL_TOL or worst_frac > PIXEL_FRACTION:
            print("\nthe noise floor is above the threshold: the threshold is "
                  "wrong, and this docstring is out of date.", file=sys.stderr)
            return 1
        return 0
    finally:
        for d in (one, two):
            shutil.rmtree(d, ignore_errors=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--update", action="store_true",
                    help="re-record docs/shots/ instead of diffing against it")
    ap.add_argument("--calibrate", action="store_true",
                    help="measure the noise floor between two identical runs")
    args = ap.parse_args()

    if args.calibrate:
        return calibrate()

    if args.update:
        shoot(SHOTS)
        print("check-shots: the reference set is re-recorded.")
        return 0

    try:
        import PIL  # noqa: F401
        import numpy  # noqa: F401
    except ImportError:
        print("check-shots: pillow and numpy are required to diff images.",
              file=sys.stderr)
        return 1

    if not SHOTS.exists() or not any(SHOTS.glob("*.png")):
        print("check-shots: there is no reference set to diff against. Run "
              "with --update once.", file=sys.stderr)
        return 1

    # An explicit scratch directory beside the reference rather than one in
    # the system temp: a sandboxed run does not always give a subprocess the
    # same /tmp its parent sees, and the shooters run as subprocesses. It is
    # gitignored and removed in the finally below.
    tmp = ROOT / ".shots-scratch"
    shutil.rmtree(tmp, ignore_errors=True)
    try:
        shoot(tmp)
        failures, checked = [], 0
        for ref in sorted(SHOTS.glob("*.png")):
            fresh = tmp / ref.name
            if not fresh.exists():
                failures.append("%s is in the reference set and was not shot; "
                                "the figure it recorded is gone." % ref.name)
                continue
            checked += 1
            r = compare(ref, fresh)
            if r is None:
                failures.append("%s changed size" % ref.name)
                continue
            frac, delta = r
            if frac > PIXEL_FRACTION:
                failures.append("%s: %.3f%% of pixels moved, by up to %d of 255"
                                % (ref.name, frac * 100, delta))
        # A figure that is new is not a failure, but it is worth saying: the
        # reference does not have it yet, so nothing is guarding it.
        new = [p.name for p in sorted(tmp.glob("*.png"))
               if not (SHOTS / p.name).exists()]
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    for name in new:
        print("check-shots: %s is new and is not in the reference set yet; "
              "run --update to record it." % name)
    if failures:
        print("check-shots: %d image(s) moved\n" % len(failures), file=sys.stderr)
        for f in failures:
            print("  " + f, file=sys.stderr)
        print("\nIf the change was intended, re-record with "
              "`python3 scripts/check_shots.py --update`.", file=sys.stderr)
        return 1
    print("check-shots: %d image(s) match the reference within %.2f%% of "
          "their pixels." % (checked, PIXEL_FRACTION * 100))
    return 0


if __name__ == "__main__":
    sys.exit(main())
