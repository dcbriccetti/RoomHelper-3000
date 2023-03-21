import {q, qi} from "./dom-util"
import {Socket} from "socket.io-client"

interface Message {
    type: string
    question: string
    answers: string[]
}

export function startPoll(msg: Message, socket: Socket, seatIndex: () => number) {
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

    const pollElem = q(`#poll-${msg.type}`);

    function answerWith(answer: any, onDone?: (result: any) => void): void {
        socket.emit('answer_poll', {
            seatIndex: seatIndex(),
            answer: answer
        }, (result: any) => {
            if (onDone)
                onDone(result)
        })
    }

    switch (msg.type) {
        case 'multi':
            while (pollElem.firstChild) {
                pollElem.removeChild(pollElem.firstChild);
            }
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
    pollElem.style.display = 'block'
}
