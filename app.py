from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, disconnect

COLS = 9
names = []
stations = {}
pre_fill = False

with open('names.txt', 'r') as f:
    for i, line in enumerate(f.readlines()):
        name = line.strip()
        names.append(name)
        if pre_fill:
            stations[i] = {'name': name}

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)


@app.route('/')
def index():
    return render_template('student.html', names=names)


@app.route('/teacher')
def teacher():
    return render_template('teacher.html', stations=stations)


def seat_index(message):
    row_string = message['row']
    column_string = message['column']
    return (int(row_string) - 1) * COLS + int(column_string) - 1 \
        if row_string.strip() and column_string.strip() else None

@socketio.on('seat')
def seat(message):
    si = seat_index(message)
    if si:
        name = message['name']
        stations[si] = {'name': name}
        emit('seated', {
            'ip': request.remote_addr,
            'name': name,
            'seatIndex': si},
            broadcast=True)


@socketio.on('set_status')
def set_status(message):
    si = seat_index(message)
    if si is not None:
        station = stations.get(si)
        if station:
            station['done'] = message['done']
            station['needHelp'] = message['needHelp']
            message['seatIndex'] = si
            ss_msg = {'seatIndex': si, 'station': station}
            emit('status_set', ss_msg, broadcast=True)


@socketio.on('disconnect_request')
def disconnect_request():
    disconnect()


if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0')
