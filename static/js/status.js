'use strict';

class Status {
    constructor(stations) {
        this.stations = stations;
        this.keys = ['needHelp', 'haveAnswer', 'done'];
        this.shortCodes = ['?', 'A', 'D'];
        this.orders = {};
        this.onHaveAnswerChangeCallbacks = []
    }

    set(msg) {
        this.stations[msg.seatIndex] = msg.station;
        const numHave = this.numWithAnswer();
        this.onHaveAnswerChangeCallbacks.forEach(cb => cb(numHave));
        this.recalculateStatusOrders();
    }

    numWithAnswer() {
        return this.stations.filter(s => s.haveAnswer).length;
    }

    onHaveAnswerChange(callback) {
        this.onHaveAnswerChangeCallbacks.push(callback);
    }

    recalculateStatusOrders() {
        this.keys.forEach(key => {
            const namesTimes = this.stations.filter(station =>
                station[key]).map(station => [station.name, station[key]])
            namesTimes.sort((a, b) => a[1] - b[1]);
            const timesInOrder = {};
            namesTimes.forEach((nt, i) => {
                timesInOrder[nt[0]] = {'time': nt[1], 'order': i + 1}
            });
            this.orders[key] = timesInOrder;
        });
    }
}
