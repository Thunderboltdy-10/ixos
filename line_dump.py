import sys
path = sys.argv[1]
start = int(sys.argv[2])
end = int(sys.argv[3])
with open(path, encoding='utf-8') as f:
    for idx, line in enumerate(f, 1):
        if start <= idx <= end:
            print(f'{idx:04}: {line.rstrip()}')
