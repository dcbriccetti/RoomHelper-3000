import { Socket } from 'socket.io-client';
import {q} from "./dom-util"

export class Messenger {
  constructor(
      settings: any,
      socket: Socket,
      nameIndexFn: () => number,
      prefix: string
      , controlFlood: boolean) {
    const messageMessage = prefix + '_msg';
    const clearMessage = 'clear_' + prefix;
    const entrySelector = `#${prefix}-msg`;
    const contentsSelector = `#${prefix}-log`;

    const contents = q(contentsSelector);

    socket.on(messageMessage, (msg: string) =>
      contents?.insertAdjacentHTML('afterbegin', msg)
    );
    socket.on(clearMessage, () => contents!.innerHTML = '');

    const entryField = q(entrySelector) as HTMLInputElement;
    let chatAfterTime = 0;

    entryField.addEventListener('keypress', (e) => {
      const msgLen = entryField.value.length;
      if (
        e.key === 'Enter' &&
        msgLen > 0 &&
        msgLen < settings.chatMessageMaxLen &&
        new Date().getTime() > chatAfterTime
      ) {
        socket.emit(messageMessage, nameIndexFn(), entryField.value);
        entryField.value = '';
        if (controlFlood)
          chatAfterTime = new Date().getTime() + settings.chatDelayMs;
      }
    });
  }
}

export class Chat extends Messenger {
  constructor(
    settings: any,
    socket: Socket,
    nameIndexFn: () => number,
    controlFlood: boolean
  ) {
    super(settings, socket, nameIndexFn, 'chat', controlFlood);
  }
}

export class TeacherChat extends Chat {
  constructor(
      settings: any,
      socket: Socket,
      nameIndexFn: () => number
  ) {
    super(settings, socket, nameIndexFn, false);
  }
}

export class Shares extends Messenger {
  constructor(
    settings: any,
    socket: Socket,
    nameIndexFn: () => number,
    controlFlood: boolean
  ) {
    super(settings, socket, nameIndexFn, 'shares', controlFlood);
  }
}
