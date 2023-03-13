export class SoundFiles {
    private buffers: AudioBuffer[] = [];
    private loaded: boolean = false;

    constructor(private context: AudioContext, private urlList: string[]) {
        this.load();
    }

    private load(): Promise<void> {
        const requests: Promise<AudioBuffer>[] = [];

        for (let i = 0; i < this.urlList.length; i++) {
            const url = this.urlList[i];
            const request = fetch(url)
                .then(response => response.arrayBuffer())
                .then(buffer => this.context.decodeAudioData(buffer))
                .then(audioBuffer => this.buffers[i] = audioBuffer)
                .catch(error => console.error(`Failed to load audio file at ${url}:`, error));
            // @ts-ignore
            requests.push(request);
        }

        // @ts-ignore
        return Promise.all(requests)
            .then(() => this.loaded = true)
            .catch(error => console.error('Failed to load audio files:', error));
    }

    public play(index: number): void {
        if (!this.loaded) {
            console.warn('Cannot play audio file before it has been loaded.');
            return;
        }

        const source = this.context.createBufferSource();
        source.buffer = this.buffers[index];
        source.connect(this.context.destination);
        source.start(0);
    }
}
