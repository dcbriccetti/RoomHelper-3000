'use strict';

let stations;
const status = new Status();

let selectedSeatIndex = null;

$(() => {
    function setUpPolls() {
        const questionTypesByTabIds = {
            'multi-tab': 'multi',
            'scale-tab': 'scale'
        };
        const eyn = $('#start_poll');
        eyn.click(() => {
            const checked = eyn.is(':checked');
            if (checked) {
                const activePollTab = $('#poll li a.active').attr('id');
                socket.emit('start_poll', questionTypesByTabIds[activePollTab], $('#question-text').val(),
                    $('#multi-answers').val().split('\n').filter(line => line.trim().length > 0));
            } else {
                socket.emit('stop_poll');
                stations.forEach(station => delete station.answer);
                sketch.loop();
            }
        });

        socket.on('answer-poll', msg => {
            stations[msg.seatIndex].answer = msg.answer;
            sketch.loop();
        });
    }

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const soundFiles = new SoundFiles(audioContext, ['/static/audio/triangle.wav']);
    let authd = false;
    status.recalculateStatusOrders(stations);
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + '/teacher');

    socket.on('chat_msg', msg => {$('#chat-log').prepend(msg);});
    socket.on('clear_chat', () => $('#chat-log').empty());

    const cm = $('#chat-msg');
    cm.keypress(e => {
        if (e.which === 13) {
            socket.emit('chat_msg', settings.teacherName, cm.val());
            cm.val('');
        }
    });

    const tm = $('#teacher-msg');
    tm.keypress(e => {
        if (e.which === 13) {
            socket.emit('teacher_msg', `${tm.val()}\n`);
        }
    });

    socket.on('seated', msg => {
        function clearNameElsewhere(newSeatIndex, clearName) {
            stations.forEach((station, i) => {
                if (i !== newSeatIndex && station && station.name === clearName) {
                    station.ip = station.nickname = station.name = station.done = station.needHelp = null;
                }
            });
        }

        clearNameElsewhere(msg.seatIndex, msg.station.name);
        stations[msg.seatIndex] = msg.station;
        sketch.loop();
    });

    socket.on('clear_station', seatIndex => {
        stations[seatIndex] = {};
        sketch.loop();
    });

    function setNumHaveButton(numHave) {
        $('#choose-with-answer').text(`${numHave} with Answer`);
    }

    status.onHaveAnswerChange(numHave => setNumHaveButton(numHave));

    socket.on('status_set', msg => {
        status.set(stations, msg);
        sketch.loop();
    });

    $('#set-names').click(() => {
        socket.emit('set_names', {names: $('#names').val(), assignSeats: $('#assign-seats').is(':checked')});
    });

    $('#clear-checks').click(() => {
        socket.emit('clear_checks');
        status.clearAll(stations);
        sketch.loop();
    });

    $('#ring-bell').click(() => {
        soundFiles.play(0);
        socket.emit('ring_bell')
    });

    $('#clear-chat').click(() => socket.emit('clear_chat'));

    $('#random-set').click(() => socket.emit('random_set', Number($('#random-set-number').val())));

    const ec = $('#enable-chat');
    ec.prop('checked', settings.chatEnabled);
    ec.click(() => socket.emit('enable_chat', ec.is(':checked')));

    const eck = $('#enable-checks');
    eck.prop('checked', settings.checksEnabled);
    eck.click(() => socket.emit('enable_checks', eck.is(':checked')));

    function requestRandomCall(any) {
        socket.emit('random_call', any, (i) => {
            selectedSeatIndex = i === -1 ? null : i;
            sketch.loop();
        });
    }

    $('#chat').show();
    if (!authd) $('#password').focus();

    setNumHaveButton(status.numWithAnswer(stations));
    $('#front-view')        .click(() => sketch.loop());
    $('#choose')            .click(() => {requestRandomCall(true);});
    $('#choose-with-answer').click(() => {requestRandomCall(false);});
    $('#choose-reset')      .click(() => {
        selectedSeatIndex = null;
        sketch.loop();
    });

    const pw = $('#password');
    pw.keypress(e => {
        if (e.which === 13) {
            socket.emit('auth', pw.val(), (valid => {
                if (valid) {
                    $('#main').show();
                    $('#login').hide();
                    $('#names').focus();
                    authd = true;
                }
            }))
        }
    });

    setUpPolls();
});
