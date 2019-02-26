class Polls {
    constructor(socket) {
        $('#multiple-question-text').change(() => {
            $('#multiple-question-select option').remove();
            const textval = $('#multiple-question-text').val();
            textval.split('\n').forEach(line => {
                $('#multiple-question-select').append(`<option value="${line}">${line}</option>`);
            });
        });

        $('#multiple-question-select').change(() => {
            const question = $('#multiple-question-select').val();
            $('#question-text').val(question);
        });
        const pollTabPrefix = 'poll-tab-';  // In tab IDs in teacher.html
        const enablePoll = $('#enable-poll');
        enablePoll.click(() => {
            if (enablePoll.is(':checked')) {
                const activePollTabId = $('#poll li a.active').attr('id');
                socket.emit('start_poll', activePollTabId.substring(pollTabPrefix.length), $('#question-text').val(),
                    $('#multi-answers').val().split('\n').filter(line => line.trim().length > 0));
            } else {
                socket.emit('stop_poll');
                stations.forEach(station => delete station.answer);
                sketch.loop();
                this.clearAnswers();
            }
        });
        function show(what, show) {show ? $(what).show() : $(what).hide();}

        $('#show-here').change(() => show('#answers', $('#show-here').is(':checked')));
        $('#show-in-chart').change(() => {
            showAnswersInStations = $('#show-in-chart').is(':checked');
            sketch.loop();
        });

        socket.on('answer-poll', msg => {
            if (! $('#show-here').is(':checked') && ! $('#show-in-chart').is(':checked')) {
                const station = stations[msg.seatIndex];
                station.answer = msg.answer;
                sketch.loop();
                $(`#answer-${msg.seatIndex}`).remove();
                let insertBefore;
                $('#answers table tbody').children().each((i, tr) => {
                    const tds = $(tr).children();
                    if (!insertBefore && tds[0].textContent > station.name) {
                        insertBefore = $(tr);
                    }
                });
                const newRow = $(`<tr id="answer-${msg.seatIndex}"><td>${station.name}</td><td>${msg.answer}</td></tr>`);
                if (insertBefore)
                    newRow.insertBefore(insertBefore);
                else
                    newRow.appendTo($('#answers table tbody'));
                this.setNumAnswers();
            }
        });
    }

    setNumAnswers() {
        $('#num-answers').text($('#answers tbody tr').length);
    }

    clearAnswers() {
        $('#num-answers').text($('#answers tbody tr').remove());
        this.setNumAnswers();
    }
}
