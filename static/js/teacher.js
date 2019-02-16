'use strict';

let stations;
const status = new Status();

let selectedSeatIndex = null;
let showAnswersInStations = false;

$(() => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const soundFiles = new SoundFiles(audioContext, ['/static/audio/triangle.wav']);
    let authd = false;
    status.recalculateStatusOrders(stations);
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + '/teacher');
    [TeacherChat, Shares].forEach(fn => new fn(socket, () => -1 /* teacher ID */, false));
    new Polls(socket);

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
                    station.ip = station.name = station.done = station.needHelp = null;
                }
            });
        }

        clearNameElsewhere(msg.seatIndex, msg.station.name);
        stations[msg.seatIndex] = msg.station;
        $('#names').val(getNamesArray().filter(name => name !== msg.station.name).join('\n'));
        sketch.loop();
    });

    function getNamesArray() {
        return $('#names').val().split('\n').filter(name => name.trim() !== '');
    }

    socket.on('clear_station', seatIndex => {
        const names = getNamesArray();
        names.push(stations[seatIndex].name + '\n');
        names.sort();
        $('#names').val(names.join('\n'));
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
        socket.emit('set_names', {names: getNamesArray(), assignSeats: $('#assign-seats').is(':checked')});
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

    $('#clear-chat'  ).click(() => socket.emit('clear_chat'));
    $('#clear-shares').click(() => socket.emit('clear_shares'));

    $('#random-set').click(() => socket.emit('random_set', Number($('#random-set-number').val())));

    function chk(sel, msg, setting) {
        const ec = $(sel);
        ec.prop('checked', setting);
        ec.click(() => socket.emit(msg, ec.is(':checked')));
    }
    [['#enable-chat',   'enable_chat',   settings.chatEnabled],
     ['#enable-shares', 'enable_shares', settings.sharesEnabled],
     ['#enable-checks', 'enable_checks', settings.checksEnabled],
    ].forEach(a => chk(a[0], a[1], a[2]));

    function requestRandomCall(any) {
        socket.emit('random_call', any, (i) => {
            selectedSeatIndex = i === -1 ? null : i;
            sketch.loop();
        });
    }

    $('#shares').show();
    $('#chat').show();
    if (!authd) $('#password').focus();

    setNumHaveButton(status.numWithAnswer(stations));
    $('#front-view')        .click(() => sketch.reconfigure());
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
});
