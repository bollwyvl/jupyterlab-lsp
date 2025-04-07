"""Emit a ``pip``-compatible constraints file."""

from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent
DIST = ROOT / "dist"
EXPECT_WHEELS = 2


def main(py_dist: Path) -> int:
    """Print out lines to redirect to a constraint file."""

    wheels = sorted(py_dist.glob("*.whl"))
    if len(wheels) != EXPECT_WHEELS:
        sys.stderr.write(f"Expected {EXPECT_WHEELS}, saw {len(wheels)}: {wheels}")
        return 1
    for wheel in wheels:
        name = wheel.name.split("-")[0]
        print(f"{name} @ {wheel.as_uri()}")

    return 0


if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1])))
