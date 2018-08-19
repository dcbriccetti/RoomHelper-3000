function setup() {
    createCanvas(800, 400).parent('canvas');
    frameRate(2);
}

function draw() {
    const aisle = 7;
    const w = (width - aisle) / cols;
    const h = height / rows;
    const frontView = $('#front-view').is(':checked');
    const normalColor = [168, 196, 219];
    const selectedColor = [200, 159, 178];
    const doneColor = [99, 255, 139];
    const needHelpColor = [255, 146, 69];

    function drawStation(startX, startY, seatIndex) {
        textFont('Helvetica');
        textSize(14);
        strokeWeight(1);
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
        const name = names[seatIndex] || seats[seatIndex];
        noStroke();
        fill(0);
        const xMargin = 4;
        text(name, startX + xMargin, startY + 5, w - 2 * xMargin, h);
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

