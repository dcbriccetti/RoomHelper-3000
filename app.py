import logging
from random import choice
from time import time

from flask import Flask, render_template, request, json
from flask_socketio import SocketIO, emit

STUDENT_NS = '/student'
TEACHER_NS = '/teacher'
ALL_NS = (TEACHER_NS, STUDENT_NS)

logFormatter = logging.Formatter("%(asctime)s\t%(levelname)s\t%(module)s\t%(message)s")
logger = logging.getLogger()
logger.setLevel(logging.DEBUG)
for handler in (logging.FileHandler('log.txt'), logging.StreamHandler()):
    handler.setFormatter(logFormatter)
    logger.addHandler(handler)

settings = {
    'columns': 9,
    'rows': 4,
    'missingSeatIndexes': [8, 35],
    'aisleAfterColumn': 3,
    'chatEnabled': False
}
names = []
stations = {}

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)


@app.route('/')
def index():
    r = request
    logger.info('Student page requested from %s, %s', r.remote_addr, r.user_agent)
    return render_template('student.html', settings=json.dumps(settings), names=names)


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


def relay_chat(msg):
    r = request
    logger.info('Chat message from %s: %s', r.remote_addr, msg)
    for ns in ALL_NS:
        emit('chat_msg', msg, namespace=ns, broadcast=True)


on_all_namespaces('connect', connect)
on_all_namespaces('chat_msg', relay_chat)


@socketio.on('disconnect', namespace=STUDENT_NS)
def disconnect_request():
    r = request
    logger.info('Disconnected: %s, %s', r.remote_addr, r.sid)
    matches = [item for item in stations.items() if r.sid == item[1].get('sid')]
    if matches:
        station_index, station = matches[0]
        clear_station(station)
        emit('clear_station', station_index, broadcast=True, namespace=TEACHER_NS)


@socketio.on('enable_chat', namespace=TEACHER_NS)
def enable_chat(enable):
    settings['chatEnabled'] = enable
    emit('enable_chat', enable, broadcast=True, namespace=STUDENT_NS)


@socketio.on('set_names', namespace=TEACHER_NS)
def set_names(message):
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
        names.append(name)
        if assign_seats:
            station = {'ip': ip, 'nickname': '', 'name': name}
            stations[si] = station
            broadcast_seated(station, si)
            si = skip_missing(si + 1)


@socketio.on('seat', namespace=STUDENT_NS)
def seat(message):
    nickname = message['nickname']
    name = message['name']
    si = message['seatIndex']
    ip = request.remote_addr
    logger.info('%s seat %s %s to %d', ip, name, nickname, si)
    existing_different_index = [i for i, station in stations.items() if station.get('name') == name and i != si]
    if existing_different_index:
        del stations[existing_different_index[0]]
    station = {'ip': ip, 'sid': request.sid, 'nickname': nickname, 'name': name}
    stations[si] = station
    broadcast_seated(station, si)


@socketio.on('random_set', namespace=TEACHER_NS)
def random_set(random_calls_limit):
    logger.info('Random calls limit set to %d', random_calls_limit)
    for station in stations.values():
        if station.get('name'):
            station['callsLeft'] = random_calls_limit


@socketio.on('random_call', namespace=TEACHER_NS)
def random_call(any):
    eligible = [(k, v) for k, v in stations.items() if v.get('callsLeft', 0) > 0
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
    si = message['seatIndex']
    station = stations.get(si)
    if station:
        done = message['done']
        have_answer = message['haveAnswer']
        need_help = message['needHelp']
        logging.info('set_status %s: done: %s, have answer: %s, need help: %s',
            message['name'], done, have_answer, need_help)
        now = time()
        station['done'] = now if done else None
        station['haveAnswer'] = now if have_answer else None
        station['needHelp'] = now if need_help else None
        ss_msg = {'seatIndex': si, 'station': station}
        emit('status_set', ss_msg, broadcast=True, namespace=TEACHER_NS)


def clear_station(station):
    for key in ('nickname', 'name', 'needHelp', 'done', 'haveAnswer'):
        if key in station:
            del station[key]


if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0')
