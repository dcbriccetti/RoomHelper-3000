function setup() {
    createCanvas(800, 400).parent('container');
    frameRate(2);
}

function draw() {
    const aisle = 7;
    const w = (width - aisle) / cols;
    const h = height / rows;
    const frontView = $('#front-view').is(':checked');

    function drawGroup(startX, startY, seatIndex) {
        textFont('Helvetica');
        textSize(14);
        strokeWeight(1);
        noStroke();
        fill(136, 159, 178);
        rect(startX, startY, w - 3, h - 3);
        const name = seats[seatIndex];
        noStroke();
        fill(0);
        text(name, startX + 4, startY + 5, w, h);
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
                drawGroup(ac * w + aisleAdj, ar * h, seatIndex);
            }
        }
    }
}

