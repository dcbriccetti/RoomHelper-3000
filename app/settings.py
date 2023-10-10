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
    'allowedSharesDomains': 'repl.it replit.com repl.co editor.p5js.org scalafiddle.io'.split(),
    'normalColor': (168, 196, 219),
    'warningColor': (255, 204, 0),
}

school1_config = {
    'periods': [
        (7, '14:05', '14:53'),
    ]
}

room1 = {
    'columns': 7,
    'rows': 3,
}

settings = settingsTemplate
settings.update(room1)
settings.update(school1_config)
