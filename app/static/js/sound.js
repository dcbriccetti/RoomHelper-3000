'use strict';

class SoundFiles {
    constructor(context, urlList) {
        this.buffers = [];
        this.context = context;
        const self = this;

        urlList.forEach((url, index) => {
            const xhr = new XMLHttpRequest();
            xhr.responseType = "arraybuffer";
            xhr.onload = () => context.decodeAudioData(xhr.response,
                (buffer) => self.buffers[index] = buffer,
                (error) => console.error('decodeAudioData error', error));
            xhr.open("GET", url);
            xhr.send();
        });
    }

    play(index) {
        const source = this.context.createBufferSource();
        source.buffer = this.buffers[index];
        source.connect(this.context.destination);
        source.start(0);
    }
}
