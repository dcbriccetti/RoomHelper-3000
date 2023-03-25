import {Socket} from "socket.io-client"
import {Sketch} from "./sketch"
import {Station} from "./station"
import {q, qi, Hider} from "./dom-util"

export class PollTeacher {
    private savedQas: string[][]

    constructor(private stations: Station[], socket: Socket, private sketch: Sketch) {
        const showMultiText             = qi('#show-multi-text');
        const multiQuestionSelect       = qi('#multiple-question-select');
        const multiQuestionText         = qi('#multiple-question-text');
        const questionText              = qi('#question-text');
        const hider                     = new Hider();

        hider.hide(showMultiText)
        showMultiText.addEventListener('click', () => {
            hider.hide(showMultiText)
            hider.show(multiQuestionText)
        })
        multiQuestionText.addEventListener('change', () => {
            hider.hide(multiQuestionText)
            hider.show(showMultiText)
            multiQuestionSelect.innerHTML = ''
            this.savedQas = []
            for (const qa of multiQuestionText.value.split('\n')) {
                const qaParts = qa.split("|")
                this.savedQas.push(qaParts)
                const question = qaParts[0]
                const option = document.createElement('option')
                option.value = question
                option.text = question
                multiQuestionSelect.appendChild(option)
            }
            multiQuestionSelect.dispatchEvent(new Event('change'))
        })
        multiQuestionSelect.addEventListener('change', () => {
            questionText.value = multiQuestionSelect.value
        })

        const pollTabPrefix = 'poll-tab-';  // In tab IDs in teacher.html
        const enablePoll = $('#enable-poll');
        enablePoll.click(() => {
            if (enablePoll.is(':checked')) {
                this.updateNumAnswersDisplay();
                const activePollTabId = $('#poll li a.active').attr('id');
                const questionType: string = activePollTabId.substring(pollTabPrefix.length)
                const multiAnswers: string[] = qi('#multi-answers').value.split('\n').filter(line => line.trim().length > 0);
                socket.emit('start_poll', questionType, qi('#question-text').value, multiAnswers);
            } else {
                ['#show-here', '#show-in-chart'].forEach(sel => {
                    if ($(sel).is(':checked')) $(sel).trigger('click');
                });
                const answerRows = document.querySelectorAll('#answers tbody tr');
                qi('#num-answers').textContent = answerRows.length.toString();
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

        socket.on('answer_poll', this.answerPoll);

        this.updateNumAnswersDisplay();
    }

    updateNumAnswersDisplay() {
        const numAnswers = $('#answers tbody tr').length;
        $('#num-answers').text(numAnswers);
        $('#num-answers-plural').text(numAnswers === 1 ? '' : 's');
        const showAnswers = $('#show-answers');
        if (numAnswers > 0) showAnswers.show();
        else showAnswers.hide();
    }

    answerPoll(msg) {
        const station = this.stations[msg.seatIndex]

        const showHereCheckbox = qi('#show-here')
        const showInChartCheckbox = qi('#show-in-chart')

        if (!showHereCheckbox.checked && !showInChartCheckbox.checked) {
            station.answer = msg.answer
            this.sketch.loop()

            const answerRow = q(`#answer-${msg.seatIndex}`)
            if (answerRow) {
                answerRow.remove()
            }

            let insertBefore
            const tableRows = document.querySelectorAll('#answers table tbody tr')
            for (const tr of tableRows) {
                const tds = tr.children
                if (!insertBefore && tds[0].textContent > station.name) {
                    insertBefore = tr
                }
            }

            const newRow = document.createElement('tr')
            newRow.id = `answer-${msg.seatIndex}`

            const stationNameCell = document.createElement('td')
            stationNameCell.textContent = station.name
            newRow.appendChild(stationNameCell)

            const answerCell = document.createElement('td')
            answerCell.textContent = msg.answer
            newRow.appendChild(answerCell)

            const tableBody = q('#answers table tbody')

            if (insertBefore) {
                tableBody.insertBefore(newRow, insertBefore)
            } else {
                tableBody.appendChild(newRow)
            }

            this.updateNumAnswersDisplay()
        } else {
            console.log(`Ignoring poll response from ${station.name}: ${msg.answer}`)
        }
    }
}
