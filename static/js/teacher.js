const rows = 4;
const cols = 9;
const seats = [
    'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', '', 
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 
    'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9',
    'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', '', 
];
const names = new Array(rows * cols);
const dones = new Array(rows * cols);
const needHelps = new Array(rows * cols);
const missingSeatIndexes = new Set([8, 35]);
const aisleAfterColumn = 3;
let selectedSeatIndex = null;

$(document).ready(() => {
    const socket = io.connect();

    socket.on('seated', msg => {
        names[msg.seatIndex] = msg.name;
    });

    socket.on('status_set', msg => {
        dones[msg.seatIndex] = msg.station.done;
        needHelps[msg.seatIndex] = msg.station.needHelp;
    });

    $('#choose').click(event => {
        const s = [];
        names.forEach((name, index) => {if (name) s.push(index);});
        selectedSeatIndex = s.length === 0 ? null : s[Math.floor(Math.random() * s.length)];
    });
});
