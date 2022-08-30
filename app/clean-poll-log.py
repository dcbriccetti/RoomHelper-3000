from sys import stdin

last_parts_without_time = None

for line in stdin:
    parts_without_time = line.split('\t')[1:]
    if parts_without_time != last_parts_without_time:
        print(line, end='')
        last_parts_without_time = parts_without_time
