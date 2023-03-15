export class Status {
    orders: any;
    onHaveAnswerChangeCallbacks: any[];

    constructor(public keys: string[]) {
        this.orders = {};
        this.onHaveAnswerChangeCallbacks = [];
    }

    set(stations, seatIndex: number, key, value) {
        stations[seatIndex][key] = value;
        const numHave = this.numWithAnswer(stations);
        this.onHaveAnswerChangeCallbacks.forEach(cb => cb(numHave));
        this.recalculateStatusOrders(stations);
    }

    numWithAnswer(stations) {
        return stations.filter(s => s.haveAnswer).length;
    }

    onHaveAnswerChange(callback) {
        this.onHaveAnswerChangeCallbacks.push(callback);
    }

    recalculateStatusOrders(stations) {
        this.keys.forEach(key => {
            const namesTimes = stations.filter(station =>
                station[key]).map(station => [station.name, station[key]]);
            namesTimes.sort((a, b) => a[1] - b[1]);
            const timesInOrder = {};
            namesTimes.forEach((nt, i) => {
                timesInOrder[nt[0]] = {'time': nt[1], 'order': i + 1}
            });
            this.orders[key] = timesInOrder;
        });
    }

    clearAll(stations) {
        stations.forEach(station => {
            this.keys.forEach(key => station[key] = null);
        });
        this.recalculateStatusOrders(stations);
    }
}
