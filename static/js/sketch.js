function setup() {
    createCanvas(800, 400).parent('canvas');
    frameRate(2);
}

function draw() {
    const aisle = 7;
    const w = (width - aisle) / cols;
    const h = height / rows;
    const frontView = $('#front-view').is(':checked');
    const normalColor =     [168, 196, 219];
    const selectedColor =   [200, 159, 178];
    const doneColor =       [99,  255, 139];
    const needHelpColor =   [255, 146,  69];

    function drawStation(startX, startY, seatIndex) {
        textFont('Helvetica');
        noStroke();
        if (seatIndex === selectedSeatIndex)
            fill(...selectedColor);
        else if (needHelps[seatIndex])
            fill(...needHelpColor);
        else if (dones[seatIndex])
            fill(...doneColor);
        else
            fill(...normalColor);

        rect(startX, startY, w - 3, h - 3);

        fill(0);
        const xMargin = 2;
        textSize(10);
        textAlign(LEFT, TOP);
        text(seats[seatIndex], startX + xMargin, startY + 3, w - 2 * xMargin, h);
        const name = names[seatIndex];
        if (name) {
            const parts = name.split(', ');
            textSize(20);
            textAlign(CENTER, CENTER);
            if (textWidth(parts[1]) > w) textSize(14);
            text(parts[1], startX + w / 2, startY + h / 3);
            textSize(12);
            text(parts[0], startX + w / 2, startY + h / 3 + 20);
        }
    }

    background(255);

    for (let r = 0; r < rows; ++r) {
        for (let c = 0; c < cols; ++c) {
            const seatIndex = r * 9 + c;
            if (!missingSeatIndexes.has(seatIndex)) {
                const ar = frontView ? rows - 1 - r : r;
                const ac = frontView ? cols - 1 - c : c;
                const aisleAdj = frontView ?
                    ac > cols - 1 - 1 - aisleAfterColumn ? aisle : 0 :
                    ac > aisleAfterColumn ? aisle : 0;
                drawStation(ac * w + aisleAdj, ar * h, seatIndex);
            }
        }
    }
}

