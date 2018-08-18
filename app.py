from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, disconnect

COLS = 9
names = []
stations = {}
pre_fill = False

with open('names.txt', 'r') as f:
    i = 0
    for line in f.readlines():
        name = line.strip()
        names.append(name)
        if pre_fill:
            stations[i] = name
            i += 1

async_mode = None
app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode=async_mode)


@app.route('/')
def index():
    return render_template('student.html', names=names)


@app.route('/teacher')
def teacher():
    return render_template('teacher.html', stations=stations)


@socketio.on('seat')
def seat(message):
    seat_index = (int(message['row']) - 1) * COLS + int(message['column']) - 1
    name = message['name']
    stations[seat_index] = name
    emit('seated', {
        'ip': request.remote_addr,
        'name': name,
        'seatIndex': seat_index},
        broadcast=True)


@socketio.on('disconnect_request')
def disconnect_request():
    disconnect()


if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0')
