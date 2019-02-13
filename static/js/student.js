'use strict';

$(() => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const soundFiles = new SoundFiles(audioContext, ['/static/audio/triangle.wav']);
    const status = new Status();
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + '/student');

    function name_index()   {return Number($('#name-index').val());}
    function row()          {return $('#row').val();}
    function column()       {return $('#column').val();}
    [Chat, Shares].forEach(fn => new fn(socket, name_index, true));
    function getSeatIndex() {return (Number(row()) - 1) * settings.columns + Number(column()) - 1;}

    function todayWithHourMin(hhmm) {
        const parts = hhmm.split(':').map(n => Number(n));
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), parts[0], parts[1], 0);
    }

    function formatTime(ms) {
        const s = ms / 1000;
        let hours   = Math.floor(s / 3600);
        if (hours   < 10) hours   = "0" + hours;
        let minutes = Math.floor((s - (hours * 3600)) / 60);
        if (minutes < 10) minutes = "0" + minutes;
        let seconds = Math.floor(s - hours * 3600 - minutes * 60);
        if (seconds < 10) seconds = "0" + seconds;
        return `${hours}:${minutes}:${seconds}`;
    }

    function updateTimeRemaining() {
        const now = new Date();
        let start = 0;
        let end = 0;

        const periodFound = settings.periods.find(period => {
            start = todayWithHourMin(period[1]);
            end   = todayWithHourMin(period[2]);
            return now >= start && now <= end;
        });

        if (periodFound) {
            const periodDuration = end - start;
            const msLeft = periodDuration - (now - start);
            const percentLeft = msLeft / periodDuration * 100;
            $('#time-left').show();
            $('#time-left-text').show();
            $('#time-left').val(percentLeft);
            $('#time-left-text').text(formatTime(msLeft));
        } else {
            $('#time-left').hide();
            $('#time-left-text').hide();
        }

        window.setTimeout(updateTimeRemaining, 1000);
    }

    updateTimeRemaining();

    function setUpPoll() {
        socket.on('start_poll', msg => {
            const scaleSlider = $('#scale');
            $('#question-text').text(msg.question);
            $('#poll').show();

            const pollElem = $(`#poll-${msg.type}`);

            function answerWith(answer) {socket.emit('answer-poll', {seatIndex: getSeatIndex(), answer: answer})}

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
                    scaleSlider.val(0);
                    $('#scale-text').text('0');

                    scaleSlider.change(() => {
                        $('#scale-text').text(scaleSlider.val());
                        socket.emit('answer-poll', {seatIndex: getSeatIndex(), answer: scaleSlider.val()});
                    });
                    break;

                case 'text':
                    const elem = $('#text-answer');
                    elem.keypress(e => {
                        if (e.which === 13) {
                            answerWith(elem.val());
                        }
                    });
            }

            pollElem.show();
        });

        socket.on('stop_poll', () => {
            $('#question-text').text('');
            $('.pollType').hide();
            $('#poll').hide();
        });
    }

    function showOrHideNowAndFromMessage(selector, show, message) {
        function sho(obj, show) {if (show) obj.show(); else obj.hide();}
        const jqObj = $(selector);
        sho(jqObj, show);
        socket.on(message, enabled => sho(jqObj, enabled));
    }

    socket.on('ring_bell', () => soundFiles.play(0));
    socket.on('set_names', msg => {
        $('#name-index option:gt(0)').remove();
        const sel = $('#name-index');
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

    showOrHideNowAndFromMessage('#status-checks', settings.checksEnabled, 'enable_checks');
    showOrHideNowAndFromMessage('#chat',          settings.chatEnabled,   'enable_chat');
    showOrHideNowAndFromMessage('#shares',        settings.sharesEnabled, 'enable_shares');

    socket.on('teacher_msg', msg => {
        if (msg.trim().length)
            $('#teacher-msg').show();
        else
            $('#teacher-msg').hide();
        $('#teacher-msg-text').html(msg);
    });

    $('form#seat').submit(() => {
        if (name_index() >= 0 && row().length > 0 && column().length > 0 &&
                ! settings.missingSeatIndexes.includes(getSeatIndex())) {
            socket.emit('seat', {nameIndex: name_index(), seatIndex: getSeatIndex()});
            $('#comm').show();
            audioContext.resume();
        } else $('#comm').hide();
        return false;
    });

    function updateStatus() {
        const args = {seatIndex: getSeatIndex()};
        status.keys.forEach(key => args[key] = $('#' + key).is(':checked'));
        socket.emit('set_status', args);
        return true;
    }

    settings.statuses.forEach(status => {
        const id = status[0];
        $('#statuses').append(`<input id='${id}' type="checkbox"> <label for="${id}" style="margin-right: 1em">${status[2]}</label> `);
        $('#' + id).click(updateStatus);
    });

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
