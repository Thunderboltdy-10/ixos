start = 360
end = 450
with open('ui/src/components/search/SearchInput.tsx') as f:
    for idx, line in enumerate(f, 1):
        if start <= idx <= end:
            print(f'{idx:04}: {line.rstrip()}')
