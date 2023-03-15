import {Sketch} from "./sketch"
import {Socket} from "socket.io-client"

export class Polls {
    private savedQas: any[]

    constructor(stations: any, socket: Socket, private sketch: Sketch) {
        $('#show-multi-text').hide();
        $('#show-multi-text').click(() => {
            $('#show-multi-text').hide();
            $('#multiple-question-text').show();
        });
        $('#multiple-question-text').change(() => {
            $('#multiple-question-text').hide();
            $('#show-multi-text').show();
            $('#multiple-question-select option').remove();
            const qas = (document.getElementById('multiple-question-text') as HTMLInputElement).value.split('\n');
            this.savedQas = [];
            qas.forEach(qa => {
                const qaArray = qa.split("|");
                const q = qaArray[0];
                this.savedQas.push(qaArray);
                $('#multiple-question-select').append(`<option value="${q}">${q}</option>`);
            });
            $('#multiple-question-select').change();
        });

        $('#multiple-question-select').change(() => {
            $('#question-text').val($('#multiple-question-select').val());
        });
        const pollTabPrefix = 'poll-tab-';  // In tab IDs in teacher.html
        const enablePoll = $('#enable-poll');
        enablePoll.click(() => {
            if (enablePoll.is(':checked')) {
                this.updateNumAnswersDisplay();
                const activePollTabId = $('#poll li a.active').attr('id');
                const multiAnswers = (document.querySelector<HTMLInputElement>('#multi-answers')).value.split('\n').filter(line => line.trim().length > 0);
                socket.emit('start_poll', activePollTabId.substring(pollTabPrefix.length), $('#question-text').val(),
                    multiAnswers);
            } else {
                ['#show-here', '#show-in-chart'].forEach(sel => {
                    if ($(sel).is(':checked')) $(sel).trigger('click');
                });
                const answerRows = document.querySelectorAll('#answers tbody tr');
                document.querySelector('#num-answers').textContent = answerRows.length.toString();
                answerRows.forEach(row => row.remove());
                this.updateNumAnswersDisplay();
                socket.emit('stop_poll');
                stations.forEach(station => delete station.answer);
                sketch.loop();
            }
        });
        function show(what, show) {show ? $(what).show() : $(what).hide();}

        $('#show-here').change(() => show('#answers', $('#show-here').is(':checked')));
        $('#show-in-chart').change(() => {
            sketch.setShowAnswersInStations($('#show-in-chart').is(':checked'))
            sketch.loop();
        });

        socket.on('answer_poll', msg => {
            const station = stations[msg.seatIndex];
            if (! $('#show-here').is(':checked') && ! $('#show-in-chart').is(':checked')) {
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
                const answerClass = this.getAnswerClass(msg.answer);
                const newRow = $(`<tr id="answer-${msg.seatIndex}"><td>${station.name}</td><td class="${answerClass}">${msg.answer}</td></tr>`);
                if (insertBefore)
                    newRow.insertBefore(insertBefore);
                else
                    newRow.appendTo($('#answers table tbody'));
                this.updateNumAnswersDisplay();
            } else console.log(`Ignoring poll response from ${station.name}: ${msg.answer}`)
        });

        this.updateNumAnswersDisplay();
    }

    getAnswerClass(studentAnswer) {
        if (this.savedQas) {
            const currentQuestion = $('#question-text').val();
            const foundQa = this.savedQas.find(e => e[0] === currentQuestion);
            if (foundQa) {
                const answerRegEx = foundQa[1];
                if (answerRegEx && new RegExp(answerRegEx).exec(studentAnswer))
                    return 'right-answer';
            }
        }
        return 'unknown-answer';
    }

    updateNumAnswersDisplay() {
        const numAnswers = $('#answers tbody tr').length;
        $('#num-answers').text(numAnswers);
        $('#num-answers-plural').text(numAnswers === 1 ? '' : 's');
        const showAnswers = $('#show-answers');
        if (numAnswers > 0) showAnswers.show(); else showAnswers.hide();
    }
}
