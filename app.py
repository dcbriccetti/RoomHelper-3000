from flask import Flask, render_template, request, json
from flask_socketio import SocketIO, emit, disconnect
import logging

logging.basicConfig(filename='log.txt', level=logging.DEBUG,
    format='%(asctime)s\t%(levelname)s\t%(module)s\t%(message)s')
logger = logging.getLogger(__name__)

settings = {
    'columns': 9,
    'rows': 4,
    'missingSeatIndexes': [8, 35],
    'aisleAfterColumn': 3
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


@socketio.on('connect')
def connect():
    r = request
    logger.info('Connection from %s, %s, %s', r.remote_addr, r.sid, r.user_agent)


@socketio.on('disconnect_request')
def disconnect_request():
    r = request
    logger.info('Disconnecting %s, %s', r.remote_addr, r.sid)
    disconnect()


@socketio.on('set_names')
def set_names(message):
    r = request
    ip = r.remote_addr
    logger.info('set_names from %s, %s', ip, r.sid)
    emit('set_names', message, broadcast=True)
    global names
    names = []
    assign_seats = message['assignSeats']
    for si, line in enumerate(message['names'].split('\n')):
        name = line.strip()
        names.append(name)
        if assign_seats:
            station = {'ip': ip, 'nickname': '', 'name': name}
            stations[si] = station
            broadcast_seated(station, si)


@socketio.on('seat')
def seat(message):
    nickname = message['nickname']
    name = message['name']
    si = message['seatIndex']
    ip = request.remote_addr
    logger.info('%s seat %s %s to %d', ip, name, nickname, si)
    existing_different_index = [i for i, station in stations.items() if station['name'] == name and i != si]
    if existing_different_index:
        del stations[existing_different_index[0]]
    station = {'ip': ip, 'nickname': nickname, 'name': name}
    stations[si] = station
    broadcast_seated(station, si)


def broadcast_seated(station, seat_index):
    emit('seated', {'seatIndex': seat_index, 'station': station}, broadcast=True)


@socketio.on('set_status')
def set_status(message):
    si = message['seatIndex']
    station = stations.get(si)
    if station:
        done = message['done']
        need_help = message['needHelp']
        logging.info('set_status %s: done: %s, need help: %s', message['name'], done, need_help)
        station['done'] = done
        station['needHelp'] = need_help
        ss_msg = {'seatIndex': si, 'station': station}
        emit('status_set', ss_msg, broadcast=True)


if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0')
