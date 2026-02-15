start = 1
end = 220
with open('ui/src/components/search/QualitySwitcher.tsx') as f:
    for idx, line in enumerate(f, 1):
        if start <= idx <= end:
            print(f'{idx:04}: {line.rstrip()}')
