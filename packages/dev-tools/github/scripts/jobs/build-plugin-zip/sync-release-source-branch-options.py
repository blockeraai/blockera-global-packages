#!/usr/bin/env python3
"""Rewrite source_branch choice options between YAML markers."""

import pathlib
import re
import sys


def main() -> None:
	if len(sys.argv) < 3:
		sys.exit("usage: sync-release-source-branch-options.py FILE DEFAULT_BRANCH [release/* ...]")
	path = pathlib.Path(sys.argv[1])
	default = sys.argv[2]
	releases = sys.argv[3:]
	branches = [default] + [b for b in releases if b and b != default]
	indent = "                    "
	lines = "\n".join(f"{indent}- {b}" for b in branches)
	text = path.read_text()
	pattern = re.compile(
		r"(# BEGIN SOURCE_BRANCH_OPTIONS\n).*?(# END SOURCE_BRANCH_OPTIONS)",
		re.S,
	)
	replacement = r"\1" + lines + "\n" + indent + r"\2"
	new, n = pattern.subn(replacement, text, count=1)
	if n != 1:
		sys.exit(f"build-zip/sync-source-options: expected one option block, found {n}")
	if new != text:
		path.write_text(new)
		print("build-zip/sync-source-options: wrote", path, "→", ", ".join(branches))
	else:
		print("build-zip/sync-source-options: unchanged", path)


if __name__ == "__main__":
	main()
