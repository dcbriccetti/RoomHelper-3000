settingsTemplate = {
    'teacherName': 'Dave Briccetti',  # Change this
    'missingSeatIndexes': [],
    'chatEnabled': False,
    'checksEnabled': False,
    'nickEnabled': False,
    'chatDelayMs': 5000
}

room1 = {
    'columns': 9,
    'rows': 4,
    'missingSeatIndexes': [8, 35],
    'aisleAfterColumn': 3,
}

room2 = {
    'columns': 3,
    'rows': 2,
}

settings = settingsTemplate
settings.update(room1)
