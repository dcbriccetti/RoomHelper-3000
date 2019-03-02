from typing import Any, Dict, Tuple
import re


def ms(text: str, code: str):  # Make status
    s = re.sub(r'\W', '', text)
    key = s[0].lower() + s[1:]
    return key, code, text


settingsTemplate = {
    'teacherName': 'Dave Briccetti',  # Change this
    'missingSeatIndexes': [],
    'chatEnabled': False,
    'sharesEnabled': False,
    'checksEnabled': False,
    'statuses': [
        ms('Need Help',   '?'),
        ms('Have Answer', 'A'),
        ms('Done',        'D')
    ],
    'chatDelayMs': 5000,
    'statusChangeEnableDelayMs': 3000,
    'chatMessageMaxLen': 150,
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
        (3, '09:50', '10:31'),
        (4, '11:00', '11:46'),
        (5, '11:50', '12:31'),
        (9, '15:30', '16:56'),
    ]
}

school2_config = {
    'periods': [
        (1, '09:30', '10:29'),
        (2, '11:15', '12:13'),
    ]
}

settings = settingsTemplate
settings.update(room1)
settings.update(school1_config)
