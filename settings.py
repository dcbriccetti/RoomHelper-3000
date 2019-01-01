settingsTemplate = {
    'teacherName': 'Dave Briccetti',  # Change this
    'missingSeatIndexes': [],
    'chatEnabled': False,
    'sharesEnabled': False,
    'checksEnabled': False,
    'statuses': [
        ['needHelp',   '?', 'Need Help'],
        ['haveAnswer', 'A', 'Have Answer'],
        ['done',       'D', 'Done']
    ],
    'chatDelayMs': 5000,
    'allowedSharesDomains': ['repl.it', 'editor.p5js.org']
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

school1_config = {
    'periods': [
        (1, '18:20', '18:40'),
        (2, '18:40', '19:00'),
        (3, '19:00', '19:20'),
        # (3, '09:50', '10:35'),
        # (4, '11:00', '11:50'),
        # (5, '11:50', '12:35'),
    ]
}

settings = settingsTemplate
settings.update(room1)
settings.update(school1_config)
