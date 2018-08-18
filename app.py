from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, disconnect

async_mode = None
app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, async_mode=async_mode)


@app.route('/')
def index():
    return render_template('index.html', async_mode=socketio.async_mode)

@app.route('/admin')
def admin():
    return render_template('admin.html', async_mode=socketio.async_mode)


@socketio.on('seat')
def test_message(message):
    emit('seated', {'ip': request.remote_addr, 'message': message}, broadcast=True)


@socketio.on('disconnect_request')
def disconnect_request():
    emit('my_response', {'data': 'Disconnected!'})
    disconnect()


@socketio.on('connect')
def test_connect():
    emit('my_response', {'data': 'Connected'})


@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected', request.sid)


if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0')
