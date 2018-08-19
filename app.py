from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, disconnect

COLS = 9
names = []
stations = {}

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


@socketio.on('set_names')
def set_names(message):
    global names
    names = []
    assign_seats = message['assignSeats']
    for si, line in enumerate(message['names'].split('\n')):
        name = line.strip()
        names.append(name)
        if assign_seats:
            stations[si] = {'name': name}
            broadcast_seated(name, si)


@socketio.on('seat')
def seat(message):
    si = seat_index(message)
    if si is not None:
        name = message['name']
        stations[si] = {'name': name}
        broadcast_seated(name, si)


def broadcast_seated(name, seat_index):
    emit('seated', {'name': name, 'seatIndex': seat_index}, broadcast=True)


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
