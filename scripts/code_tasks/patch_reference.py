"""Validate supplied old patch context; localization is not patch correctness."""
import re
from scripts.code_tasks.contract import text_bytes


def old_changed_lines(patch, root):
    result, name, cursor = {}, None, None
    source = []
    for line in patch.splitlines():
        if line.startswith('diff --git '):
            match = re.fullmatch(r'diff --git a/(.+) b/(.+)', line)
            if not match or match[1] != match[2]:
                raise ValueError('Unsupported rename/quoted patch path')
            name = match[1]
            source = text_bytes(root, name).decode().split('\n')
            result.setdefault(name, set())
            cursor = None
        elif line.startswith('@@ '):
            match = re.match(r'@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@', line)
            if not match or name is None:
                raise ValueError('Malformed patch hunk')
            cursor = int(match[1])
        elif cursor is not None:
            if line.startswith((' ', '-')):
                if not 1 <= cursor <= len(source) or source[cursor-1] != line[1:]:
                    raise ValueError('Patch old context differs from original source')
                if line[0] == '-':
                    result[name].add(cursor)
                cursor += 1
            elif line.startswith('+'):
                # Insertions have no original line; attribute to next original
                # line (previous at EOF). Report this declared convention.
                result[name].add(min(max(cursor, 1), len(source)))
            elif line != '\\ No newline at end of file':
                cursor = None
    if not result or any(not values for values in result.values()):
        raise ValueError('No supported original changed lines')
    return {name: sorted(values) for name, values in result.items()}
