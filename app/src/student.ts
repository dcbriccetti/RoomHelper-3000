import {Socket} from "socket.io-client"
import {Chat, Shares} from "./chat"
import {SoundFiles} from "./sound"
import {Status} from "./status"
import {Settings} from "./settings"
import {updateTimeRemaining} from "./time-util"
import {q, qi, showIf} from "./dom-util"
import {newSocket} from "./io-util"
import {StartPollMessage, startPoll} from "./poll-student"

export class Student {
    constructor(private settings: Settings, private lastSeatIndex: number) {
    }

    run() {
        const settings = this.settings
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const soundFiles = new SoundFiles(audioContext, ['/static/audio/triangle.wav']);
        const appStatus = new Status(settings.statuses.map(s => s[0]));
        const socket: Socket = newSocket("student")

        function seatIndex(): number {
            return (Number(qi('#row').value) - 1) * settings.columns + Number(qi('#column').value) - 1;
        }

        const nameIndexFunc = () => Number(qi('#name-index').value);
        [Chat, Shares].forEach(fn => new fn(settings, socket, nameIndexFunc, true));
        settings.shares.forEach(share => $('#shares-log').prepend(share));

        updateTimeRemaining(settings);

        function showOrHideNowAndFromMessage(selector, show, message) {
            const elem = q(selector);
            showIf(elem, show);
            socket.on(message, enabled => showIf(elem, enabled));
        }

        socket.on('ring_bell', () => soundFiles.play(0));
        socket.on('set_names', msg => {
            $('#name-index option:gt(0)').remove();
            const sel = $('#name-index');
            msg.names.forEach((name, i) => sel.append(`<option value="${i}">${name}</option>`));
        });

        socket.on('clear_checks',
            () => appStatus.keys.forEach(key => qi('#'+key).checked = false)
        )

        showOrHideNowAndFromMessage('#status-checks', settings.checksEnabled, 'enable_checks');
        showOrHideNowAndFromMessage('#chat',          settings.chatEnabled,   'enable_chat');
        showOrHideNowAndFromMessage('#shares',        settings.sharesEnabled, 'enable_shares');

        const teacherMsg = q('#teacher-msg');
        const teacherMsgText = q('#teacher-msg-text');

        socket.on('teacher_msg', msg => {
          showIf(teacherMsg, msg.trim().length);
          teacherMsgText.innerHTML = msg;
        });

        function seatSettingsValid() {
            return Number(qi('#name-index').value) >= 0 && qi('#row').value.length > 0 && qi('#column').value.length > 0 &&
                !settings.missingSeatIndexes.includes(seatIndex());
        }

        $('form#seat').submit(() => {
            if (seatSettingsValid()) {
                socket.emit('seat', {nameIndex: Number(qi('#name-index').value), seatIndex: seatIndex()}, response => {
                    if (response === 'OK') {
                        q('#dash').style.display = 'inline'
                        const selectedOption = (q("#name-index") as HTMLSelectElement).selectedOptions[0];
                        q("#student-name").textContent = selectedOption ? selectedOption.textContent : null
                        $('#name-loc-card').hide();
                        $('#comm').show();
                        audioContext.resume();
                    } else console.log(response);
                });
            } else $('#comm').hide();
            return false;
        });

        function updateStatus(id) {
          const checkbox = qi('#'+id);
          checkbox.disabled = true;  // Disable until server response arrives

          const args = {seatIndex: seatIndex(), status: [id, checkbox.checked]};
          socket.emit('set_status', args, response => {
            if (response !== 'OK') alert('Server reply: ' + response);
            checkbox.disabled = false
          });
        }

        settings.statuses.forEach(appStatus => {
            const id = appStatus[0];
            $('#statuses').append(`<input id='${id}' type="checkbox"> <label for="${id}" style="margin-right: 1em">${appStatus[2]}</label> `);
            $('#' + id).click(() => updateStatus(id));
        });

        for (let r = 0; r < settings.rows; ++r) {
            const letter = String.fromCharCode('A'.charCodeAt(0) + r);
            $('#row').append(`<option value='${r + 1}'>${letter}</option>`);
        }

        for (let c = 1; c <= settings.columns; ++c)
            $('#column').append(`<option value='${c}'>${c}</option>`);

        if (this.lastSeatIndex >= 0) {
            const r = Math.floor(this.lastSeatIndex / settings.columns) + 1;
            const c = this.lastSeatIndex % settings.columns + 1;

            const rowSelect = document.getElementById('row') as HTMLSelectElement;
            rowSelect.selectedIndex = r;

            const columnSelect = document.getElementById('column') as HTMLSelectElement;
            columnSelect.selectedIndex = c;
        }

        socket.on('start_poll', (msg: StartPollMessage) => startPoll(msg, socket, seatIndex));

        socket.on('stop_poll', () =>
            $('#poll').fadeOut(500, () => {
                $('#question-text').text('')
                $('.pollType').hide()
            }));
    }
}
