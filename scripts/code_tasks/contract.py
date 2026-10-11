"""Exact normalized-text exposure/citations for original code archives."""
from pathlib import Path, PurePosixPath
from scripts.qasper.contract import intersection, union


def text_bytes(root, name):
    relative = PurePosixPath(name)
    if relative.is_absolute() or '..' in relative.parts or '\\' in name or ':' in name:
        raise ValueError('Source path outside archive')
    path = root / name
    if not path.is_file() or path.is_symlink() or not path.resolve().is_relative_to(root.resolve()):
        raise ValueError('Source path outside archive')
    text = path.read_bytes().decode('utf-8').replace('\r\n', '\n')
    # Same one-final-LF convention as current engine, not whitespace trimming.
    return text.removesuffix('\n').encode('utf-8')


def line_range(root, name, start, end):
    raw = text_bytes(root, name)
    lines = raw.decode().split('\n')
    if type(start) is not int or type(end) is not int or not 1 <= start <= end <= len(lines):
        raise ValueError('Source lines out of bounds')
    offset = len(('\n'.join(lines[:start-1]) + ('\n' if start > 1 else '')).encode())
    content = '\n'.join(lines[start-1:end])
    return offset, offset + len(content.encode()), content


def exposed(value, root):
    rows = value.get('results', [])
    if 'view' in value:
        rows = [{'path': value['view']['path'], 'view': value['view']}]
    ranges = []
    for row in rows:
        view = row.get('view')
        if view is None:
            if not row.get('evidence_omitted'):
                raise ValueError('Unexplained missing evidence')
            continue
        if row['path'] != view['path']:
            raise ValueError('View and result source identities differ')
        a, b, text = line_range(root, row['path'], view['start_line'], view['end_line'])
        if view['text'] != text:
            raise ValueError('Displayed view differs from original source')
        ranges.append([row['path'], a, b])
    if 'slice' in value:
        part = value['slice']
        raw = text_bytes(root, part['path'])
        start, end = part['start_byte'], part['end_byte']
        if type(start) is not int or type(end) is not int or not 0 <= start <= end <= len(raw):
            raise ValueError('Invalid character slice coordinates')
        if raw[start:end].decode() != part['text']:
            raise ValueError('Character slice differs from original source')
        ranges.append([part['path'], start, end])
    return ranges


def citation_ranges(citations, calls, root):
    intervals = {}
    for citation in citations:
        call = next(row for row in calls if row['request']['id'] == citation['call_id'])
        name = citation['path']
        a, b, _ = line_range(root, name, citation['start_line'], citation['end_line'])
        observed = union((x, y) for path, x, y in call['exposed_ranges'] if path == name)
        if b <= a or intersection(observed, a, b) != b - a:
            raise ValueError('Citation not fully shown by its referenced call')
        intervals.setdefault(name, []).append((a, b))
    return {name: union(ranges) for name, ranges in intervals.items()}
