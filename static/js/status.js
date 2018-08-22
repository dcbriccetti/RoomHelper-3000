class Status {
    constructor(stations) {
        this.stations = stations;
        this.keys = ['needHelp', 'haveAnswer', 'done'];
        this.onHaveAnswerChangeCallbacks = []
    }

    set(msg) {
        const station = this.stations[msg.seatIndex];
        station.done = msg.station.done;
        const haveAnswerChange = station.haveAnswer !== msg.station.haveAnswer;
        station.haveAnswer = msg.station.haveAnswer;
        station.needHelp = msg.station.needHelp;
        if (haveAnswerChange) {
            const numHave = this.stations.filter(s => s.haveAnswer).length;
            this.onHaveAnswerChangeCallbacks.forEach(cb => cb(numHave));
        }
    }

    onHaveAnswerChange(callback) {
        this.onHaveAnswerChangeCallbacks.push(callback);
    }
}
