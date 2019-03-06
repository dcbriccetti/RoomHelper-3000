'use strict';

$(() => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const soundFiles = new SoundFiles(audioContext, ['/static/audio/triangle.wav']);
    const status = new Status(settings.statuses.map(s => s[0]));
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + '/student');

    function nameIndex()    {return Number($('#name-index').val());}
    function row()          {return $('#row').val();}
    function column()       {return $('#column').val();}
    function seatIndex()    {return (Number(row()) - 1) * settings.columns + Number(column()) - 1;}

    [Chat, Shares].forEach(fn => new fn(socket, nameIndex, true));
    settings.shares.forEach(share => $('#shares-log').prepend(share));

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
            $('#text-answer').val('');
            $('#question-text').text(msg.question);
            $('#answer-received').hide();
            $('#poll').fadeIn(500);

            const pollElem = $(`#poll-${msg.type}`);

            function answerWith(answer, onDone) {
                socket.emit('answer-poll', {seatIndex: seatIndex(), answer: answer}, result => onDone(result))
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
                    scaleSlider.val(0);
                    $('#scale-text').text('0');

                    scaleSlider.change(() => {
                        $('#scale-text').text(scaleSlider.val());
                        answerWith(scaleSlider.val());
                    });
                    break;

                case 'text':
                    const answerReceived = $('#answer-received');
                    const elem = $('#text-answer');
                    elem.keyup(e => {
                        if (e.which === 13) {
                            answerWith(elem.val(), (result) => {
                                if (result === 'OK') answerReceived.show()
                            });
                        } else answerReceived.hide();
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

    function showIf(jqObj, show) {if (show) jqObj.show(); else jqObj.hide();}

    function showOrHideNowAndFromMessage(selector, show, message) {
        const jqObj = $(selector);
        showIf(jqObj, show);
        socket.on(message, enabled => showIf(jqObj, enabled));
    }

    socket.on('ring_bell', () => soundFiles.play(0));
    socket.on('set_names', msg => {
        $('#name-index option:gt(0)').remove();
        const sel = $('#name-index');
        msg.names.forEach((name, i) => sel.append(`<option value="${i}">${name}</option>`));
    });

    socket.on('clear_checks', () => status.keys.forEach(key => $('#' + key).attr('checked', false)));

    showOrHideNowAndFromMessage('#status-checks', settings.checksEnabled, 'enable_checks');
    showOrHideNowAndFromMessage('#chat',          settings.chatEnabled,   'enable_chat');
    showOrHideNowAndFromMessage('#shares',        settings.sharesEnabled, 'enable_shares');

    socket.on('teacher_msg', msg => {
        showIf($('#teacher-msg'), msg.trim().length);
        $('#teacher-msg-text').html(msg);
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
        const checkbox = $('#' + id);
        checkbox.attr("disabled", true);  // Disable until server response arrives

        const args = {seatIndex: seatIndex(), status: [id, checkbox.is(':checked')]};
        socket.emit('set_status', args, response => {
            if (response !== 'OK') alert('Server reply: ' + response);
            setTimeout(() => checkbox.attr("disabled", false), settings['statusChangeEnableDelayMs']);
        });
    }

    settings.statuses.forEach(status => {
        const id = status[0];
        $('#statuses').append(`<input id='${id}' type="checkbox"> <label for="${id}" style="margin-right: 1em">${status[2]}</label> `);
        $('#' + id).click(() => updateStatus(id));
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
