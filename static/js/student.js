'use strict';

$(() => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const soundFiles = new SoundFiles(audioContext, ['/static/audio/triangle.wav']);
    const status = new Status();
    const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + '/student');

    let submittedName;
    function name()         {return $('#name').val();}
    function row()          {return $('#row').val();}
    function column()       {return $('#column').val();}
    function firstLast()    {
        const parts = submittedName.split(', ');
        return parts[1] + ' ' + parts[0];
    }
    [Chat, Shares].forEach(fn => new fn(socket, firstLast, true));
    function getSeatIndex() {return (Number(row()) - 1) * settings.columns + Number(column()) - 1;}

    function todayWithHourMin(hhmm) {
        const parts = hhmm.split(':').map(n => Number(n));
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), parts[0], parts[1], 0);
    }

    function updateTimeRemaining() {

        const now = new Date();

        let periodStartMs;
        let periodEndMs;
        let periodLengthMs;

        settings.periods.forEach(p => {
                const period = p.slice(1, 3);
                const start = todayWithHourMin(period[0]);
                const end = todayWithHourMin(period[1]);
                periodStartMs = start.getTime();
                periodEndMs = end.getTime();
                if (now.getTime() >= periodStartMs && now.getTime() <= periodEndMs) {
                    periodLengthMs = periodEndMs - periodStartMs;
                    console.log(`pStartMs: ${periodStartMs}, pEndMs: ${periodEndMs}, pLengthMs: ${periodLengthMs}`);
                }
            }
        );

        let percentLeftInPeriod = 0;

        if (periodLengthMs) {
            const timeNow = now.getTime();
            const timeInPeriod = timeNow - periodStartMs;
            const periodFractionSpent = timeInPeriod / periodLengthMs;
            console.log(`tInPeriod: ${timeInPeriod}, tNow: ${timeNow}, pFractionSpent: ${periodFractionSpent}`);
            percentLeftInPeriod = 100 - periodFractionSpent * 100;
        }

        $('#time-left').val(percentLeftInPeriod);
        window.setTimeout(updateTimeRemaining, 5000);
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
        if (name().length > 0 && row().length > 0 && column().length > 0 &&
                ! settings.missingSeatIndexes.includes(getSeatIndex())) {
            submittedName = name();
            socket.emit('seat', {name: name(), seatIndex: getSeatIndex()});
            $('#comm').show();
            audioContext.resume();
        } else $('#comm').hide();
        return false;
    });

    function updateStatus() {
        const args = {name: firstLast(), seatIndex: getSeatIndex()};
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
