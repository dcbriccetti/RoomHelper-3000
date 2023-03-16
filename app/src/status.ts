type Station = any
type OnHaveAnswerChangeCallback = (numHave: number) => void;

export class Status {
    orders: any
    onHaveAnswerChangeCallbacks: OnHaveAnswerChangeCallback[]

    constructor(public keys: string[]) {
        this.orders = {};
        this.onHaveAnswerChangeCallbacks = [];
    }

    set(stations: Station[], seatIndex: number, key: string, value: any) {
        stations[seatIndex][key] = value;
        const numHave = this.numWithAnswer(stations);
        this.onHaveAnswerChangeCallbacks.forEach(cb => cb(numHave));
        this.recalculateStatusOrders(stations);
    }

    numWithAnswer(stations: Station[]) {
        return stations.filter(s => s.haveAnswer).length;
    }

    onHaveAnswerChange(callback: OnHaveAnswerChangeCallback) {
        this.onHaveAnswerChangeCallbacks.push(callback);
    }

    recalculateStatusOrders(stations: Station[]): void {
        this.keys.forEach((key: string) => {
            const nameTimes: (string | any)[][] = stations
                .filter(station => station[key])
                .map(station => [station.name, station[key]])
                .sort((a, b) => a[1] - b[1]);
            const timesInOrder = {};
            nameTimes.forEach((nameTime: any[], i: number) => {
                timesInOrder[nameTime[0]] = {'time': nameTime[1], 'order': i + 1}
            });
            this.orders[key] = timesInOrder;
        });
    }

    clearAll(stations: Station[]) {
        stations.forEach(station => {
            this.keys.forEach(key => station[key] = null);
        });
        this.recalculateStatusOrders(stations);
    }
}
