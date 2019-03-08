from typing import Any, List, Dict, Tuple, Union
from random import choice
import datetime
from time import time, strftime
from urllib.parse import urlparse
from html import escape

from flask import Flask, render_template, request, json
from flask_socketio import SocketIO, emit
from markdown import markdown
from persister import Persister
from settings import settings
from applog import logger

TEACHER_ID = -1
RH3K_ID = -2
OK = 'OK'
DISCONNECTED = 'disconnected'
STUDENT_NS = '/student'
TEACHER_NS = '/teacher'
ALL_NS = (TEACHER_NS, STUDENT_NS)

names: List[str] = []
stations: List[Dict[str, Any]] = [{} for i in range(settings['columns'] * settings['rows'])]
teacher_password = ''  # Change this
authenticated = False

persister = Persister()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, ping_interval=20)  # A bit more frequent than the default of 25, to try to avoid timeouts causing disconnections


@app.route('/')
def index():
    r = request
    seat_index = persister.seat_indexes_by_ip.get(r.remote_addr, -1)
    logger.info(f'Student page requested from {r.remote_addr} (last seat index: {seat_index})')
    return render_template('student.html', settings=json.dumps(settings), names=names, lastSeatIndex=seat_index)


@app.route('/teacher')
def teacher():
    r = request
    logger.info(f'Teacher page requested from {r.remote_addr}, {r.user_agent}')
    return render_template('teacher.html', settings=json.dumps(settings), stationJson=json.dumps(stations))


def on_all_namespaces(event, handler):
    for ns in ALL_NS:
        socketio.on_event(event, handler, namespace=ns)


def station_by_ip(ip: str) -> Union[None, Tuple[int, Dict[str, any]]]:
    matches = [item for item in enumerate(stations) if ip == item[1].get('ip')]
    if not matches: return None
    if len(matches) > 1:
        logger.warning(f'More than one station has IP {ip}. Using first one.')
    return matches[0]


@socketio.on('connect', namespace=TEACHER_NS)
def connect():
    log_connection(request)


@socketio.on('connect', namespace=STUDENT_NS)
def connect():
    r = request
    log_connection(r)
    if connect_or_disconnect(True, r):
        logger.warning('Reconnection')


@socketio.on('disconnect', namespace=STUDENT_NS)
def disconnect_request() -> None:
    r = request
    logger.info(f'Disconnected: {r.remote_addr}, {r.sid}')
    connect_or_disconnect(False, r)


def connect_or_disconnect(connected, r) -> bool:
    match: Union[None, Tuple[int, Dict[str, any]]] = station_by_ip(r.remote_addr)
    if match:
        seat_index, station = match
        station['connected'] = connected
        emit('connect_station', {'seatIndex': seat_index, 'connected': connected}, broadcast=True, namespace=TEACHER_NS)
        return True
    return False


def log_connection(r):
    logger.info(f'Connection from {r.remote_addr}, {r.sid}, {r.user_agent}')


def relay_chat(sender_id: int, raw_msg: str) -> None:
    'Relay chat message, escaping student messages and processing teacher messages with Markdown'
    r = request
    sender: str = sender_from_id(sender_id)
    logger.info(f'Chat message from {sender} at {r.remote_addr}: {raw_msg}')
    msg = raw_msg if sender_id == TEACHER_ID else escape(raw_msg) + '<br/>'
    prefixed_msg = strftime('%H:%M:%S') + f' {sender} : {msg}'
    html = markdown(prefixed_msg) if sender_id == TEACHER_ID else prefixed_msg
    for ns in ALL_NS:
        if settings['chatEnabled'] or ns == TEACHER_NS:
            emit('chat_msg', html, namespace=ns, broadcast=True)


def relay_teacher_msg(msg: str) -> None:
    r = request
    logger.info(f'Teacher message from {r.remote_addr}: {msg}')
    html = markdown(msg)
    for ns in ALL_NS:
        emit('teacher_msg', html, namespace=ns, broadcast=True)


on_all_namespaces('chat_msg', relay_chat)
on_all_namespaces('teacher_msg', relay_teacher_msg)


def relay_shares(sender_id: str, possible_url: str, allow_any=False) -> None:
    r = request
    sender: str = sender_from_id(sender_id)
    logger.info(f'Shares message from {sender} at {r.remote_addr}: {possible_url}')
    parts = urlparse(possible_url)
    if allow_any or parts.hostname in settings['allowedSharesDomains']:
        html = f'<p>{strftime("%H:%M:%S")} {sender}: <a href="{possible_url}" target="_blank">{possible_url}</a></p>'
        settings['shares'].append(html)
        for ns in ALL_NS:
            if settings['sharesEnabled'] or ns == TEACHER_NS:
                emit('shares_msg', html, namespace=ns, broadcast=True)


def sender_from_id(sender_id):
    return settings['teacherName'] if sender_id == TEACHER_ID else 'RH3K' if sender_id == RH3K_ID else names[sender_id]


@socketio.on('shares_msg', namespace=STUDENT_NS)
def relay_student_share(sender: str, possible_url: str) -> None:
    relay_shares(sender, possible_url)


@socketio.on('shares_msg', namespace=TEACHER_NS)
def relay_teacher_share(sender: str, possible_url: str) -> None:
    relay_shares(sender, possible_url, allow_any=True)


@socketio.on('auth', namespace=TEACHER_NS)
def auth(password: str) -> bool:
    global authenticated
    if password == teacher_password:
        authenticated = True
    return authenticated


@socketio.on('ring_bell', namespace=TEACHER_NS)
def ring_bell() -> None:
    if authenticated:
        emit('ring_bell', broadcast=True, namespace=STUDENT_NS)


def log_poll(*args):
    with open('polllog.txt', 'a') as poll_log:
        poll_log.write(datetime.datetime.now().isoformat() + '\t' + '\t'.join(args) + '\n')


@socketio.on('start_poll', namespace=TEACHER_NS)
def start_poll(type, question, answers) -> None:
    if authenticated:
        log_poll('q', type, question, ';'.join(answers))
        emit('start_poll', {'type': type, 'question': question, 'answers': answers},
             broadcast=True, namespace=STUDENT_NS)


@socketio.on('answer_poll', namespace=STUDENT_NS)
def answer_poll(message):
    if authenticated:
        seat_index = message['seatIndex']
        station: Dict[str, Any] = stations[seat_index]
        student_name = station.get('name')
        log_poll('a', student_name, message['answer'])
        emit('answer_poll', message, broadcast=True, namespace=TEACHER_NS)
        return OK


@socketio.on('stop_poll', namespace=TEACHER_NS)
def stop_poll() -> None:
    if authenticated:
        emit('stop_poll', broadcast=True, namespace=STUDENT_NS)


@socketio.on('enable_chat', namespace=TEACHER_NS)
def enable_chat(enable: bool) -> None:
    if authenticated:
        settings['chatEnabled'] = enable
        emit('enable_chat', enable, broadcast=True, namespace=STUDENT_NS)


@socketio.on('enable_shares', namespace=TEACHER_NS)
def enable_shares(enable: bool) -> None:
    if authenticated:
        settings['sharesEnabled'] = enable
        emit('enable_shares', enable, broadcast=True, namespace=STUDENT_NS)


@socketio.on('clear_chat', namespace=TEACHER_NS)
def clear_chat() -> None:
    if authenticated:
        for ns in ALL_NS:
            emit('clear_chat', broadcast=True, namespace=ns)


@socketio.on('clear_shares', namespace=TEACHER_NS)
def clear_shares() -> None:
    if authenticated:
        settings['shares'] = []
        for ns in ALL_NS:
            emit('clear_shares', broadcast=True, namespace=ns)


@socketio.on('enable_checks', namespace=TEACHER_NS)
def enable_checks(enable: bool) -> None:
    if authenticated:
        settings['checksEnabled'] = enable
        emit('enable_checks', enable, broadcast=True, namespace=STUDENT_NS)


@socketio.on('clear_checks', namespace=TEACHER_NS)
def clear_checks() -> None:
    if authenticated:
        for station in stations:
            for st in settings['statuses']:
                station[st] = None

    emit('clear_checks', broadcast=True, namespace=STUDENT_NS)


@socketio.on('set_names', namespace=TEACHER_NS)
def set_names(message: dict) -> None:
    if authenticated:
        r = request
        ip = r.remote_addr
        logger.info(f'set_names from {ip}, {r.sid}')
        emit('set_names', message, broadcast=True, namespace=STUDENT_NS)
        global names
        names = []
        assign_seats: bool = message['assignSeats']

        def skip_missing(start: int) -> int:
            new_si = start
            while new_si in settings['missingSeatIndexes']:
                new_si += 1
            return new_si

        si = skip_missing(0)
        for name in message['names']:
            names.append(name)
            if assign_seats:
                station = {'ip': ip, 'name': name, 'connected': True}
                stations[si] = station
                broadcast_seated(station, si)
                si = skip_missing(si + 1)


def station_name(index: int) -> str:
    row_from_0 = int(index / settings['columns'])
    col_from_0 = index % settings['columns']
    return chr(ord('A') + row_from_0) + str(col_from_0 + 1)


@socketio.on('seat', namespace=STUDENT_NS)
def seat(message: dict):
    if authenticated:
        name = names[int(message['nameIndex'])]
        si = message['seatIndex']
        ip = request.remote_addr
        persister.seat_indexes_by_ip[ip] = si
        persister.save()

        logger.info(f'{ip} seat {name} to {si}')
        existing_different_index = [i for i, station in enumerate(stations) if station.get('name') == name and i != si]
        if existing_different_index:
            stations[existing_different_index[0]] = {}
        if len(stations[si]):
            name_at_new_station = stations[si].get('name')
            if name_at_new_station and name != name_at_new_station:
                emit('disconnect_station', si, broadcast=True, namespace=TEACHER_NS)
                msg = f'Someone at {ip} claiming to be {name} has moved to {station_name(si)}, ' \
                    f'displacing {name_at_new_station}'
                logger.warning(msg)
                relay_chat(RH3K_ID, msg)

        station = {'ip': ip, 'sid': request.sid, 'name': name, 'connected': True}
        stations[si] = station
        broadcast_seated(station, si)
        return OK


@socketio.on('random_set', namespace=TEACHER_NS)
def random_set(random_calls_limit: int) -> None:
    if authenticated:
        logger.info('Random calls limit set to %d', random_calls_limit)
        for station in stations:
            if station.get('name'):
                station['callsLeft'] = random_calls_limit


@socketio.on('random_call', namespace=TEACHER_NS)
def random_call(anyone: bool) -> int:
    if authenticated:
        eligible = [(k, v) for k, v in enumerate(stations) if v.get('callsLeft', 0) > 0
                    and (anyone or v.get('haveAnswer', False))]
        if eligible:
            chosen = choice(eligible)
            chosen[1]['callsLeft'] -= 1
            logger.info(f'{chosen[1]["name"]} called randomly')
            return chosen[0]
    return -1


def broadcast_seated(station, seat_index: int) -> None:
    emit('seated', {'seatIndex': seat_index, 'station': station}, broadcast=True, namespace=TEACHER_NS)


@socketio.on('set_status', namespace=STUDENT_NS)
def set_status(message: dict) -> any:
    if authenticated:
        seat_index = message['seatIndex']
        station: Dict[str, Any] = stations[seat_index]
        student_name = station.get('name')
        if student_name:
            key, value = message['status']
            logger.info(f'{student_name} status: {key}: {value}')

            # Temporarily log haveAnswer toggles until reliability problem is solved
            if key == 'haveAnswer':
                chat_log_msg = student_name + ' ' + ('is' if value else 'is not') + ' ready'
                relay_chat(RH3K_ID, chat_log_msg)

            station[key] = time() if value else None
            emit('status_set', {'seatIndex': seat_index, 'key': key, 'value': value}, broadcast=True, namespace=TEACHER_NS)
            return OK

        r = request
        logger.warning(f'set_status from disconnected user {r.remote_addr}, {seat_index}, {r.sid}')
        return DISCONNECTED


if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0')
