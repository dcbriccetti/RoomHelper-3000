from typing import Any, List, Dict
from random import choice
from time import time, strftime
from urllib.parse import urlparse

from flask import Flask, render_template, request, json
from flask_socketio import SocketIO, emit
from markdown import markdown
from persister import Persister
from settings import settings
from applog import logger

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
socketio = SocketIO(app)


@app.route('/')
def index():
    r = request
    seat_index = persister.seat_indexes_by_ip.get(r.remote_addr, -1)
    logger.info('Student page requested from %s (last seat index: %d), %s',
                r.remote_addr, seat_index, r.user_agent)
    return render_template('student.html', settings=json.dumps(settings), names=names, lastSeatIndex=seat_index)


@app.route('/teacher')
def teacher():
    r = request
    logger.info('Teacher page requested from %s, %s', r.remote_addr, r.user_agent)
    return render_template('teacher.html', settings=json.dumps(settings), stationJson=json.dumps(stations))


def on_all_namespaces(event, handler):
    for ns in ALL_NS:
        socketio.on_event(event, handler, namespace=ns)


def connect():
    r = request
    logger.info('Connection from %s, %s, %s', r.remote_addr, r.sid, r.user_agent)


def relay_chat(sender: str, msg: str) -> None:
    r = request
    logger.info('Chat message from %s at %s: %s', sender, r.remote_addr, msg)
    html = markdown(strftime('%H:%M:%S') + ' ' + sender + ': ' + msg)
    for ns in ALL_NS:
        if settings['chatEnabled'] or ns == TEACHER_NS:
            emit('chat_msg', html, namespace=ns, broadcast=True)


def relay_teacher_msg(msg: str) -> None:
    r = request
    logger.info('Teacher message from %s: %s', r.remote_addr, msg)
    html = markdown(msg)
    for ns in ALL_NS:
        emit('teacher_msg', html, namespace=ns, broadcast=True)


on_all_namespaces('connect', connect)
on_all_namespaces('chat_msg', relay_chat)
on_all_namespaces('teacher_msg', relay_teacher_msg)


def relay_shares(sender: str, possible_url: str, allow_any=False) -> None:
    r = request
    logger.info('Shares message from %s at %s: %s', sender, r.remote_addr, possible_url)
    parts = urlparse(possible_url)
    if allow_any or parts.hostname in settings['allowedSharesDomains']:
        html = '<p>%s %s: <a href="%s" target="_blank">%s</a></p>' % (
            strftime('%H:%M:%S'), sender, possible_url, possible_url)
        for ns in ALL_NS:
            if settings['sharesEnabled'] or ns == TEACHER_NS:
                emit('shares_msg', html, namespace=ns, broadcast=True)


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


@socketio.on('disconnect', namespace=STUDENT_NS)
def disconnect_request() -> None:
    r = request
    logger.info('Disconnected: %s, %s', r.remote_addr, r.sid)
    matches = [item for item in enumerate(stations) if r.sid == item[1].get('sid')]
    if matches:
        station_index, station = matches[0]
        clear_station(station)
        emit('clear_station', station_index, broadcast=True, namespace=TEACHER_NS)


@socketio.on('ring_bell', namespace=TEACHER_NS)
def ring_bell() -> None:
    if authenticated:
        emit('ring_bell', broadcast=True, namespace=STUDENT_NS)


@socketio.on('start_poll', namespace=TEACHER_NS)
def start_poll(type, question, answers) -> None:
    if authenticated:
        emit('start_poll', {'type': type, 'question': question, 'answers': answers},
             broadcast=True, namespace=STUDENT_NS)


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
        logger.info('set_names from %s, %s', ip, r.sid)
        emit('set_names', message, broadcast=True, namespace=STUDENT_NS)
        global names
        names = []
        assign_seats: bool = message['assignSeats']

        def skip_missing(start: int) -> int:
            while start in settings['missingSeatIndexes']:
                start += 1
            return start

        si = skip_missing(0)
        for line in message['names'].split('\n'):
            name = line.strip()
            if name:
                names.append(name)
                if assign_seats:
                    station = {'ip': ip, 'name': name}
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
        name_index = int(message['name']) - 1
        name = names[name_index]
        si = message['seatIndex']
        ip = request.remote_addr
        persister.seat_indexes_by_ip[ip] = si
        persister.save()

        logger.info('%s seat %s to %d', ip, name, si)
        existing_different_index = [i for i, station in enumerate(stations) if station.get('name') == name and i != si]
        if existing_different_index:
            stations[existing_different_index[0]] = {}
        if len(stations[si]):
            name_at_new_station = stations[si].get('name')
            if name_at_new_station and name != name_at_new_station:
                msg = 'Someone at %s claiming to be %s has moved to %s, displacing %s' % (
                    ip, name, station_name(si), name_at_new_station)
                logger.warn(msg)
                relay_chat('RH3K', msg)

        station = {'ip': ip, 'sid': request.sid, 'name': name}
        stations[si] = station
        broadcast_seated(station, si)


@socketio.on('answer-poll', namespace=STUDENT_NS)
def yes_no_answer(answer):
    if authenticated:
        emit('answer-poll', answer, broadcast=True, namespace=TEACHER_NS)


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
            logger.info('%s called randomly', chosen[1]['name'])
            return chosen[0]
    return -1


def broadcast_seated(station, seat_index: int) -> None:
    emit('seated', {'seatIndex': seat_index, 'station': station}, broadcast=True, namespace=TEACHER_NS)


@socketio.on('set_status', namespace=STUDENT_NS)
def set_status(message: dict) -> None:
    if authenticated:
        si = message['seatIndex']
        station = stations[si]
        if station:
            logger.info('set_status: %s', message)
            now = time()
            for st in settings['statuses']:
                id = st[0]
                station[id] = now if message.get(id, False) else None
            ss_msg = {'seatIndex': si, 'station': station}
            emit('status_set', ss_msg, broadcast=True, namespace=TEACHER_NS)


def clear_station(station) -> None:
    for key in ('name', 'needHelp', 'done', 'haveAnswer'):
        if key in station:
            del station[key]


if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0')
