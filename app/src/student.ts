import {Socket} from "socket.io-client"
import {Chat, Shares} from "./chat.js"
import {SoundFiles} from "./sound.js"
import {Status} from "./status.js"
import {q, qi} from "./dom-util.js"
import {newSocket} from "./io-util.js"

export class Student {
    constructor(private settings: any, private lastSeatIndex: any) {
    }

    run() {
        const settings = this.settings
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const soundFiles = new SoundFiles(audioContext, ['/static/audio/triangle.wav']);
        const appStatus = new Status(settings.statuses.map(s => s[0]));
        const socket: Socket = newSocket("student")

        function nameIndex() {
          return Number(qi('#name-index').value);
        }

        function row() {
          return qi('#row').value;
        }

        function column() {
          return qi('#column').value;
        }

        function seatIndex() {
            return (Number(row()) - 1) * settings.columns + Number(column()) - 1;
        }

        [Chat, Shares].forEach(fn => new fn(settings, socket, nameIndex, true));
        settings.shares.forEach(share => $('#shares-log').prepend(share));

        function todayWithHourMin(hhmm): Date {
            const parts = hhmm.split(':').map(n => Number(n));
            const now = new Date();
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), parts[0], parts[1], 0);
        }

        function formatTime(ms: number): string {
          function zeroPad(value: number): string {
            return (value < 10 ? '0' : '') + value.toString();
          }

          const s = ms / 1000;
          const hours = Math.floor(s / 3600);
          const minutes = Math.floor((s - hours * 3600) / 60);
          const seconds = Math.floor(s - hours * 3600 - minutes * 60);

          return `${zeroPad(hours)}:${zeroPad(minutes)}:${zeroPad(seconds)}`;
        }

        function updateTimeRemaining(): void {
            const now: Date = new Date();
            let start: Date;
            let end: Date;

            const periodFound: any = settings.periods.find(period => {
                start = todayWithHourMin(period[1]);
                end = todayWithHourMin(period[2]);
                return now >= start && now <= end;
            });

            const timeLeftElement: HTMLElement | null = document.querySelector('#time-left');
            const timeLeftTextElement: HTMLElement | null = document.querySelector('#time-left-text');

            if (periodFound && timeLeftElement && timeLeftTextElement) {
                const periodDuration: number = end.getTime() - start.getTime();
                const msLeft: number = periodDuration - (now.getTime() - start.getTime());
                const percentLeft: number = msLeft / periodDuration * 100;

                timeLeftElement.style.display = 'block';
                timeLeftTextElement.style.display = 'block';
                timeLeftElement.setAttribute('value', percentLeft.toString());
                timeLeftTextElement.textContent = formatTime(msLeft);
            } else if (timeLeftElement && timeLeftTextElement) {
                timeLeftElement.style.display = 'none';
                timeLeftTextElement.style.display = 'none';
            }

            window.setTimeout(updateTimeRemaining, 1000);
        }

        updateTimeRemaining();

        function setUpPoll() {
            socket.on('start_poll', msg => {
                qi('#text-answer').value = '';
                q('#question-text').textContent = msg.question;
                q('#answer-received').style.display = 'none';
                const pollElement = qi('#poll')
                pollElement.style.opacity = '0';
                pollElement.style.transition = 'opacity 500ms ease-in-out';
                pollElement.style.display = 'block';
                setTimeout(() => {
                  pollElement.style.opacity = '1';
                }, 0);

                const pollElem = $(`#poll-${msg.type}`);

                function answerWith(answer: any, onDone?: (result: any) => void): void {
                    socket.emit('answer_poll', {
                        seatIndex: seatIndex(),
                        answer: answer
                    }, (result: any) => {
                        if (onDone)
                            onDone(result)
                    })
                }

                switch(msg.type) {
                    case 'multi':
                        pollElem.empty();
                        msg.answers.forEach((answer, i) => {
                            const radioId = `ans-${i}`;
                            const newRadio = $(`<input name='multi-answer' id='${radioId}' type="radio">`);
                            newRadio.click(() => answerWith(answer));
                            newRadio.appendTo(pollElem);
                            $(`<span> </span><label for="${radioId}">${answer}</label><br/>`).appendTo(pollElem);
                        });
                        break;

                    case 'scale':
                        const scaleSlider = qi('#scaleSlider');
                        scaleSlider.value = '0';
                        const scaleText = qi('#scale-text');
                        scaleText.textContent = '0';

                        scaleSlider.addEventListener('change', () => {
                          scaleText.textContent = scaleSlider.value;
                          answerWith(scaleSlider.value);
                        });
                        break;

                    case 'text':
                        const answerReceived = q('#answer-received');
                        const elem = qi('#text-answer');

                        elem.addEventListener('keyup', e => {
                          if (e.key === 'Enter') {
                            answerWith(elem.value, result => {
                              if (result === 'OK') answerReceived.style.display = 'block';
                            });
                          } else answerReceived.style.display = 'none'
                        });
                }

                pollElem.show();
            });

            socket.on('stop_poll', () => {
                $('#poll').fadeOut(500, () => {
                    $('#question-text').text('');
                    $('.pollType').hide();
                });
            });
        }

        function showIf(elem: HTMLElement, condition: boolean) {
          elem.style.display = condition ? 'block' : 'none';
        }

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
            return nameIndex() >= 0 && row().length > 0 && column().length > 0 &&
                !settings.missingSeatIndexes.includes(seatIndex());
        }

        $('form#seat').submit(() => {
            if (seatSettingsValid()) {
                socket.emit('seat', {nameIndex: nameIndex(), seatIndex: seatIndex()}, response => {
                    if (response === 'OK') {
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
            setTimeout(() => checkbox.disabled = false, settings['statusChangeEnableDelayMs']);
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
            const r = Math.floor((this.lastSeatIndex / settings.columns)) + 1;
            const c = (this.lastSeatIndex % settings.columns) + 1;

            const rowSelect = document.getElementById('row') as HTMLSelectElement;
            rowSelect.selectedIndex = r;

            const columnSelect = document.getElementById('column') as HTMLSelectElement;
            columnSelect.selectedIndex = c;
        }

        setUpPoll();
    }
}
