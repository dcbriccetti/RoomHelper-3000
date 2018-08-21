function setup() {
    createCanvas(800, 400).parent('canvas');
    frameRate(3);
}

function draw() {
    const aisleWidth = 7;
    const w = (width - aisleWidth) / settings.columns;
    const h = height / settings.rows;
    const frontView = $('#front-view').is(':checked');
    const normalColor =     [168, 196, 219];
    const selectedColor =   [200, 159, 178];
    const doneColor =       [99,  255, 139];
    const needHelpColor =   [255, 146,  69];

    function stationName(index) {
        const rowFrom0 = Math.floor(index / settings.columns);
        const colFrom0 = index % settings.columns;
        return String.fromCharCode('A'.charCodeAt(0) + rowFrom0) + (colFrom0 + 1);
    }

    function drawStation(startX, startY, seatIndex) {
        textFont('Helvetica');
        noStroke();
        const station = stations[seatIndex];
        if (seatIndex === selectedSeatIndex)
            fill(...selectedColor);
        else if (station && station.needHelp)
            fill(...needHelpColor);
        else if (station && station.done)
            fill(...doneColor);
        else
            fill(...normalColor);

        rect(startX, startY, w - 3, h - 3);

        fill(0);
        const xMargin = 2;
        textSize(10);
        textAlign(LEFT, TOP);
        text(stationName(seatIndex), startX + xMargin, startY + 3);

        if (station && station.name) {
            textAlign(RIGHT);
            text(station.ip, startX + w - xMargin - 2 /* todo why this 2 */, startY + 3);
            const parts = station.name.split(', ');
            textSize(20);
            textAlign(CENTER, CENTER);
            const name = station.nickname || parts[1];
            if (textWidth(name) > w) textSize(14);
            text(name, startX + w / 2, startY + h / 3);
            textSize(12);
            text(parts[0], startX + w / 2, startY + h / 3 + 20);
        }
    }

    background(255);

    const missingSeatIndexes = new Set(settings.missingSeatIndexes);

    for (let r = 0; r < settings.rows; ++r) {
        for (let c = 0; c < settings.columns; ++c) {
            const seatIndex = r * settings.columns + c;
            if (!missingSeatIndexes.has(seatIndex)) {
                const ar = frontView ? settings.rows - 1 - r : r;
                const ac = frontView ? settings.columns - 1 - c : c;
                const aisleAdj = frontView ?
                    ac > settings.columns - 1 - 1 - settings.aisleAfterColumn ? aisleWidth : 0 :
                    ac > settings.aisleAfterColumn ? aisleWidth : 0;
                drawStation(ac * w + aisleAdj, ar * h, seatIndex);
            }
        }
    }
}

