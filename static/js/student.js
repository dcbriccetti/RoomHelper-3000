'use strict';

$(() => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const soundFiles = new SoundFiles(audioContext, ['/static/audio/triangle.wav']);
    const status = new Status();
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + '/student');

    let submittedName, submittedNickname;
    function nickname()     {return $('#nickname').val();}
    function name()         {return $('#name').val();}
    function row()          {return $('#row').val();}
    function column()       {return $('#column').val();}
    function firstLast()    {
        const parts = submittedName.split(', ');
        return (submittedNickname || parts[1]) + ' ' + parts[0];
    }
    function getSeatIndex() {return (Number(row()) - 1) * settings.columns + Number(column()) - 1;}

    function setUpPoll() {
        socket.on('enable-yes-no', msg => {
            $('#yes-no-question').text(msg.question);
            const e = $('#yes-no-poll');
            if (msg.enable) e.show(); else e.hide();
        });

        const answersById = {'no-answer': '', 'yes': 'Yes', 'no': 'No'};
        $('input[name="yes-no-answer"]').click(event =>
            socket.emit('yes-no-answer', {seatIndex: getSeatIndex(), answer: answersById[event.target.id]})
        );
    }

    socket.on('ring_bell', () => soundFiles.play(0));
    socket.on('set_names', msg => {
        $('#name option:gt(0)').remove();
        const sel = $('#name');
        msg.names.split('\n').forEach(name =>
            sel.append(`<option value="${name}">${name}</option>`));
    });

    socket.on('clear_checks', () => {
        status.keys.forEach(key => {
            const elem = $('#' + key);
            console.log(elem);
            elem.attr('checked', false)
        });
    });

    socket.on('enable_checks', enabled => {
        const c = $('#status-checks');
        if (enabled) c.show(); else c.hide();
    });

    if (settings.nickEnabled) $('#nickname').show();

    if (settings.chatEnabled) $('#chat').show();
    socket.on('chat_msg', msg => {$('#chat-log').prepend(msg);});
    socket.on('clear_chat', () => $('#chat-log').empty());
    socket.on('enable_chat', enabled => {
        const c = $('#chat');
        if (enabled) c.show(); else c.hide();
    });


    const cm = $('#chat-msg');
    cm.keypress(e => {
        if (e.which === 13) {
            socket.emit('chat_msg', firstLast(), cm.val());
            cm.val('');
        }
    });

    socket.on('teacher_msg', msg => {
        if (msg.trim().length)
            $('#teacher-msg').show();
        else
            $('#teacher-msg').hide();
        $('#teacher-msg-text').html(msg);
    });

    $('form#seat').submit(() => {
        if (name().length > 0 && row().length > 0 && column().length > 0) {
            submittedName = name();
            submittedNickname = nickname();
            socket.emit('seat', {nickname: nickname(), name: name(), seatIndex: getSeatIndex()});
            $('#comm').show();
            audioContext.resume();
        }
        return false;
    });

    function updateStatus() {
        const args = {name: firstLast(), seatIndex: getSeatIndex()};
        status.keys.forEach((key) => args[key] = $('#' + key).is(':checked'));
        socket.emit('set_status', args);
        return true;
    }

    status.keys.forEach(id => {$(`#${id}`).click(updateStatus);});

    for (let r = 0; r < settings.rows; ++r) {
        const letter = String.fromCharCode('A'.charCodeAt(0) + r);
        $('#row').append(`<option value='${r + 1}'>${letter}</option>`);
    }

    for (let c = 1; c <= settings.columns; ++c)
        $('#column').append(`<option value='${c}'>${c}</option>`);

    if (lastSeatIndex >= 0) {
        const r = Math.floor((lastSeatIndex / settings.columns)) + 1;
        const c = (lastSeatIndex % settings.columns) + 1;
        $(`#row option:eq(${r})`).attr('selected', true);
        $(`#column option:eq(${c})`).attr('selected', true);
    }

    setUpPoll();
});
