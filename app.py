from random import choice
from time import time

from flask import Flask, render_template, request, json
from flask_socketio import SocketIO, emit
from markdown import markdown
from persister import Persister
from settings import settings
from applog import logger

STUDENT_NS = '/student'
TEACHER_NS = '/teacher'
ALL_NS = (TEACHER_NS, STUDENT_NS)

status_toggles = ('haveAnswer', 'needHelp', 'done')
names = []
stations = [{} for i in range(settings['columns'] * settings['rows'])]
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


def relay_chat(sender, msg):
    r = request
    logger.info('Chat message from %s at %s: %s', sender, r.remote_addr, msg)
    html = markdown(sender + ': ' + msg)
    for ns in ALL_NS:
        if settings['chatEnabled'] or ns == TEACHER_NS:
            emit('chat_msg', html, namespace=ns, broadcast=True)


def relay_teacher_msg(msg):
    r = request
    logger.info('Teacher message from %s: %s', r.remote_addr, msg)
    html = markdown(msg)
    for ns in ALL_NS:
        emit('teacher_msg', html, namespace=ns, broadcast=True)


on_all_namespaces('connect', connect)
on_all_namespaces('chat_msg', relay_chat)
on_all_namespaces('teacher_msg', relay_teacher_msg)


@socketio.on('auth', namespace=TEACHER_NS)
def auth(password):
    global authenticated
    if password == teacher_password:
        authenticated = True
    return authenticated


@socketio.on('disconnect', namespace=STUDENT_NS)
def disconnect_request():
    r = request
    logger.info('Disconnected: %s, %s', r.remote_addr, r.sid)
    matches = [item for item in enumerate(stations) if r.sid == item[1].get('sid')]
    if matches:
        station_index, station = matches[0]
        clear_station(station)
        emit('clear_station', station_index, broadcast=True, namespace=TEACHER_NS)


@socketio.on('ring_bell', namespace=TEACHER_NS)
def ring_bell():
    if authenticated:
        emit('ring_bell', broadcast=True, namespace=STUDENT_NS)


@socketio.on('start_poll', namespace=TEACHER_NS)
def start_poll(type, question, answers):
    if authenticated:
        emit('start_poll', {'type': type, 'question': question, 'answers': answers}, broadcast=True, namespace=STUDENT_NS)


@socketio.on('stop_poll', namespace=TEACHER_NS)
def stop_poll():
    if authenticated:
        emit('stop_poll', broadcast=True, namespace=STUDENT_NS)


@socketio.on('enable_chat', namespace=TEACHER_NS)
def enable_chat(enable):
    if authenticated:
        settings['chatEnabled'] = enable
        emit('enable_chat', enable, broadcast=True, namespace=STUDENT_NS)


@socketio.on('clear_chat', namespace=TEACHER_NS)
def clear_chat():
    if authenticated:
        for ns in ALL_NS:
            emit('clear_chat', broadcast=True, namespace=ns)


@socketio.on('enable_checks', namespace=TEACHER_NS)
def enable_checks(enable):
    if authenticated:
        settings['checksEnabled'] = enable
        emit('enable_checks', enable, broadcast=True, namespace=STUDENT_NS)


@socketio.on('clear_checks', namespace=TEACHER_NS)
def clear_checks():
    if authenticated:
        for station in stations:
            for st in status_toggles:
                station[st] = None

    emit('clear_checks', broadcast=True, namespace=STUDENT_NS)


@socketio.on('set_names', namespace=TEACHER_NS)
def set_names(message):
    if authenticated:
        r = request
        ip = r.remote_addr
        logger.info('set_names from %s, %s', ip, r.sid)
        emit('set_names', message, broadcast=True, namespace=STUDENT_NS)
        global names
        names = []
        assign_seats = message['assignSeats']

        def skip_missing(start):
            while start in settings['missingSeatIndexes']:
                start += 1
            return start

        si = skip_missing(0)
        for line in message['names'].split('\n'):
            name = line.strip()
            if name:
                names.append(name)
                if assign_seats:
                    station = {'ip': ip, 'nickname': '', 'name': name}
                    stations[si] = station
                    broadcast_seated(station, si)
                    si = skip_missing(si + 1)


@socketio.on('seat', namespace=STUDENT_NS)
def seat(message):
    if authenticated:
        nickname = message['nickname'] if settings['nickEnabled'] else ''
        name = message['name']
        si = message['seatIndex']
        ip = request.remote_addr
        persister.seat_indexes_by_ip[ip] = si
        persister.save()
        logger.info('%s seat %s %s to %d', ip, name, nickname, si)
        existing_different_index = [i for i, station in enumerate(stations) if station.get('name') == name and i != si]
        if existing_different_index:
            stations[existing_different_index[0]] = {}
        station = {'ip': ip, 'sid': request.sid, 'nickname': nickname, 'name': name}
        stations[si] = station
        broadcast_seated(station, si)


@socketio.on('answer-poll', namespace=STUDENT_NS)
def yes_no_answer(answer):
    if authenticated:
        emit('answer-poll', answer, broadcast=True, namespace=TEACHER_NS)


@socketio.on('random_set', namespace=TEACHER_NS)
def random_set(random_calls_limit):
    if authenticated:
        logger.info('Random calls limit set to %d', random_calls_limit)
        for station in stations:
            if station.get('name'):
                station['callsLeft'] = random_calls_limit


@socketio.on('random_call', namespace=TEACHER_NS)
def random_call(any):
    if authenticated:
        eligible = [(k, v) for k, v in enumerate(stations) if v.get('callsLeft', 0) > 0
                    and (True if any else v.get('haveAnswer', False))]
        if not eligible:
            return -1
        chosen = choice(eligible)
        chosen[1]['callsLeft'] -= 1
        logger.info('%s %s called randomly', chosen[1].get('nickname', ''), chosen[1]['name'])
        return chosen[0]


def broadcast_seated(station, seat_index):
    emit('seated', {'seatIndex': seat_index, 'station': station}, broadcast=True, namespace=TEACHER_NS)


@socketio.on('set_status', namespace=STUDENT_NS)
def set_status(message):
    if authenticated:
        si = message['seatIndex']
        station = stations[si]
        if station:
            logger.info('set_status: %s', message)
            now = time()
            for st in status_toggles:
                station[st] = now if message.get(st, False) else None
            ss_msg = {'seatIndex': si, 'station': station}
            emit('status_set', ss_msg, broadcast=True, namespace=TEACHER_NS)


def clear_station(station):
    for key in ('nickname', 'name', 'needHelp', 'done', 'haveAnswer'):
        if key in station:
            del station[key]


if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0')
