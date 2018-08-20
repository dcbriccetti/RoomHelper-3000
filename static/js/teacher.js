const rows = 4;
const cols = 9;
const seats = [
    'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', '', 
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 
    'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9',
    'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', '', 
];

class Station {
    constructor() {
        this.reset();
    }

    reset() {
        this.ip = this.nickname = this.name = this.done = this.needHelp = null;
    }
}

const stations = new Array(rows * cols).map(() => new Station());
const missingSeatIndexes = new Set([8, 35]);
const aisleAfterColumn = 3;
let selectedSeatIndex = null;

$(document).ready(() => {
    const socket = io.connect();

    function clearNameElsewhere(newSeatIndex, clearName) {
        stations.forEach((station, i) => {
            if (i !== newSeatIndex && station.name === clearName) {
                station.reset();
            }
        });
    }

    socket.on('seated', msg => {
        clearNameElsewhere(msg.seatIndex, msg.name);
        const s = new Station();
        s.ip = msg.ip;
        s.nickname = msg.nickname;
        s.name = msg.name;
        stations[msg.seatIndex] = s;
    });

    socket.on('status_set', msg => {
        stations[msg.seatIndex].done = msg.station.done;
        stations[msg.seatIndex].needHelp = msg.station.needHelp;
    });

    $('#set-names').click(event => {
        socket.emit('set_names', {names: $('#names').val(), assignSeats: $('#assign-seats').is(':checked')});
    });

    $('#choose').click(event => {
        const s = [];
        stations.forEach((station, index) => {if (station.name) s.push(index);});
        selectedSeatIndex = s.length === 0 ? null : s[Math.floor(Math.random() * s.length)];
    });
});
