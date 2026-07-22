"""Remove Co-authored-by trailers from a commit message file."""
import sys

path = sys.argv[1]
with open(path, encoding="utf-8") as f:
    lines = f.readlines()
with open(path, "w", encoding="utf-8") as f:
    f.writelines(line for line in lines if not line.lstrip().startswith("Co-authored-by:"))
