import {Socket} from "socket.io-client"
import {newSocket} from "./io-util.js"
import {Status} from "./status.js"
import {SoundFiles} from "./sound.js"
import {TeacherChat, Shares} from "./chat.js"
import {Polls} from "./polls.js"
import {Sketch} from "./sketch.js"
import {q, qi} from "./dom-util.js"

export class Teacher {
    constructor(private settings: any, private stations: any) {
    }

    run() {
        const objThis = this
        const appStatus = new Status(this.settings.statuses.map(s => s[0]));
        let selectedSeatIndex = null;
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const soundFiles = new SoundFiles(audioContext, ['/static/audio/triangle.wav']);
        let authd = false;
        let unseatedNames = [];
        appStatus.recalculateStatusOrders(this.stations);
        const socket: Socket = newSocket("teacher");
        [TeacherChat, Shares].forEach(fn => new fn(objThis.settings, socket, () => -1 /* teacher ID */, false))
        const sketch = new Sketch(appStatus, this.settings, this.stations)
        sketch.run()
        sketch.addDoubleClickListener((index: number) => {
            const station = this.stations[index]
            if ('name' in station) { // Ignore clicks on empty stations
                if ('warn' in station) delete station.warn
                else {
                    station.warn = true
                    socket.emit('warn', index)
                }
                sketch.loop()
            }
        })
        new Polls(this.stations, socket, sketch);
        const tm = qi('#teacher-msg');
        tm.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            socket.emit('teacher_msg', `${tm.value}\n`);
          }
        });

        function copyNamesToTextArea() {
            $('#names').val(unseatedNames.join('\n'));
        }

        function removeNameFromUnseated(removeName) {
            unseatedNames = unseatedNames.filter(name => name !== removeName);
        }

        socket.on('seated', msg => {
            function clearNameElsewhere(newSeatIndex, clearName) {
                objThis.stations.forEach((station, i) => {
                    if (i !== newSeatIndex && station && station.name === clearName) {
                        station.ip = station.name = station.done = station.needHelp = null;
                    }
                });
            }

            clearNameElsewhere(msg.seatIndex, msg.station.name);
            const nameAlreadyAtSeat = objThis.stations[msg.seatIndex].name;
            if (nameAlreadyAtSeat) {
                addUnseatedNameInOrder(nameAlreadyAtSeat);
                copyNamesToTextArea();
            }
            objThis.stations[msg.seatIndex] = msg.station;
            removeNameFromUnseated(msg.station.name);
            copyNamesToTextArea();
            sketch.loop();
        });

        function getNamesArray() {
            const namesInput = document.querySelector('#names') as HTMLTextAreaElement;
            return namesInput.value.split('\n').filter(name => name.trim() !== '');
        }

        function addUnseatedNameInOrder(name) {
            unseatedNames.push(name);
            unseatedNames.sort();
        }

        socket.on('connect_station', msg => {
            const station = objThis.stations[msg.seatIndex];
            const name = station.name;
            if (msg.connected) {
                if (name) {
                    removeNameFromUnseated(name);
                }
            } else {
                addUnseatedNameInOrder(name);
                copyNamesToTextArea();
            }
            station.connected = msg.connected;
            sketch.loop();
        });

        function setNumHaveButton(numHave) {
            $('#choose-with-answer').text(`${numHave} with Answer`);
        }

        appStatus.onHaveAnswerChange(numHave => setNumHaveButton(numHave));

        socket.on('status_set', msg => {
            appStatus.set(objThis.stations, msg.seatIndex, msg.key, msg.value);
            sketch.loop();
        });

        $('#set-names').click(() => {
            unseatedNames = getNamesArray();
            socket.emit('set_names', {names: unseatedNames, assignSeats: $('#assign-seats').is(':checked')});
        });

        $('#clear-checks').click(() => {
            socket.emit('clear_checks');
            appStatus.clearAll(objThis.stations);
            sketch.loop();
        });

        $('#ring-bell').click(() => {
            soundFiles.play(0);
            socket.emit('ring_bell')
        });

        $('#clear-chat'  ).click(() => socket.emit('clear_chat'));
        $('#clear-shares').click(() => socket.emit('clear_shares'));

        $('#random-set').click(() => socket.emit('random_set', Number($('#random-set-number').val())));

        function chk(sel, msg, setting) {
            const ec = $(sel);
            ec.prop('checked', setting);
            ec.click(() => socket.emit(msg, ec.is(':checked')));
        }
        [['#enable-chat',   'enable_chat',   this.settings.chatEnabled],
         ['#enable-shares', 'enable_shares', this.settings.sharesEnabled],
         ['#enable-checks', 'enable_checks', this.settings.checksEnabled],
        ].forEach(a => chk(a[0], a[1], a[2]));

        function requestRandomCall(any) {
            socket.emit('random_call', any, (i) => {
                selectedSeatIndex = i === -1 ? null : i;
                sketch.setSelectedSeatIndex(selectedSeatIndex)
            });
        }

        q('#shares').style.display = 'block';
        q('#chat').style.display = 'block';
        if (!authd) {
          q('#password').focus();
        }

        setNumHaveButton(appStatus.numWithAnswer(objThis.stations));
        q('#front-view').addEventListener('click', () => sketch.reconfigure());
        q('#choose').addEventListener('click', () => {requestRandomCall(true);});
        q('#choose-with-answer').addEventListener('click', () => {requestRandomCall(false);});
        q('#choose-reset').addEventListener('click', () => {
          selectedSeatIndex = null;
          sketch.setSelectedSeatIndex(selectedSeatIndex);
        });

        const pw = qi('#password');
        pw.addEventListener('keypress', e => {
          if (e.key === 'Enter') {
            socket.emit('auth', pw.value, (valid: boolean) => {
              if (valid) {
                q('#main').style.display = 'block';
                q('#login').style.display = 'none';
                q('#names').focus();
                authd = true;
              }
            });
          }
        });
        q('#shares').style.display = 'block';
        q('#chat').style.display = 'block';
        if (!authd) {
          q('#password').focus();
        }
    }
}
