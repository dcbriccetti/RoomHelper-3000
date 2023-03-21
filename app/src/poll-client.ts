import {q, qi} from "./dom-util"
import {Socket} from "socket.io-client"

export interface StartPollMessage {
    type: string
    question: string
    answers: string[]
}

export function startPoll(msg: StartPollMessage, socket: Socket, seatIndex: () => number) {
    const textAnswerElem        = qi('#text-answer')
    const answerReceivedElem    = q ('#answer-received')
    const questionTextElem      = q ('#question-text')
    const pollElem              = qi('#poll')
    const pollOfTypeElem        = q (`#poll-${msg.type}`);

    textAnswerElem.value = '';
    questionTextElem.textContent = msg.question;
    answerReceivedElem.style.display = 'none';
    pollElem.style.display = 'block';
    pollOfTypeElem.style.display = 'block'

    function answerWith(answer: string, onDone?: (result: string) => void): void {
        socket.emit('answer_poll', {
            seatIndex: seatIndex(),
            answer: answer
        }, (result: string) => {
            if (onDone)
                onDone(result)
        })
    }

    switch (msg.type) {
        case 'text':
            textAnswerElem.addEventListener('keypress', e => {
                if (e.key === 'Enter') {
                    answerWith(textAnswerElem.value, (result: string) => {
                        if (result === 'OK')
                            answerReceivedElem.style.display = 'block';
                    });
                } else answerReceivedElem.style.display = 'none'
            });
            break

        case 'multi':
            while (pollOfTypeElem.firstChild) {
                pollOfTypeElem.removeChild(pollOfTypeElem.firstChild);
            }
            msg.answers.forEach((answer: string, i: number) => {
                const radioId = `ans-${i}`;
                const newRadio = $(`<input name='multi-answer' id='${radioId}' type="radio">`);
                newRadio.click(() => answerWith(answer));
                newRadio.appendTo(pollOfTypeElem);
                $(`<span> </span><label for="${radioId}">${answer}</label><br/>`).appendTo(pollOfTypeElem);
            });
            break;

        case 'scale':
            const scaleSlider = qi('#scale');
            scaleSlider.value = '0';
            const scaleText = qi('#scale-text');
            scaleText.textContent = '0';

            scaleSlider.addEventListener('change', () => {
                scaleText.textContent = scaleSlider.value;
                answerWith(scaleSlider.value);
            });
            break;
    }
    pollOfTypeElem.style.display = 'block'
}
