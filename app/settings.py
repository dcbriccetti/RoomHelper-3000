import re

def ms(text: str, code: str) -> tuple[str, str, str]:  # Make status
    cleaned_text = re.sub(r'\W', '', text)
    key = cleaned_text[0].lower() + cleaned_text[1:]
    return key, code, text

settingsTemplate: dict[str, any] = {  # When changing, also change settings.ts
    'teacherName': 'Dave Briccetti',  # Change this
    'missingSeatIndexes': [],
    'chatEnabled': False,
    'sharesEnabled': False,
    'checksEnabled': True,
    'shares': [],
    'statuses': [
        ms('Need Help',   '?'),
        ms('Have Answer', 'A'),
        ms('Done',        'D')
    ],
    'chatDelayMs': 5000,
    'chatMessageMaxLen': 150,
    'allowedSharesDomains': ['repl.it', 'editor.p5js.org', 'scalafiddle.io'],
    'normalColor': (168, 196, 219),
    'warningColor': (255, 204, 0),
}

school1_config = {
    'periods': [
        (5, '11:50', '12:28'),
        (6, '13:10', '13:58'),
        (7, '14:00', '14:50'),
    ]
}

room1 = {
    'columns': 9,
    'rows': 4,
    'missingSeatIndexes': [num for num in range(8, 32, 9)],
    'aisleAfterColumn': 3,
}

settings = settingsTemplate
settings.update(room1)
settings.update(school1_config)
