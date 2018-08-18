function setup() {
    createCanvas(800, 400).parent('container');
    frameRate(1);
}

function draw() {
    const aisle = 7;
    const w = (width - aisle) / 9;
    const h = height / 4;

    function drawGroup(startX, startY, startSeatIndex, num) {
        textFont('Helvetica');
        textSize(14);
        strokeWeight(1);
        for (let i = 0; i < num; ++i) {
            const x = startX + i * w;
            noStroke();
            fill(136, 159, 178);
            rect(x, startY, w - 3, h - 3);
            const name = seats[startSeatIndex + i];
            if (name) {
                noStroke();
                fill(0);
                text(name, x + 5, startY + 10, w, h);
            }
        }
    }

    background(255);

    const x1 = 0;
    const x2 = w * 4 + aisle;
    [4, 5, 5, 4].forEach((cols, i) => {
        drawGroup(x1, h * i, i * 9, 4);
        drawGroup(x2, h * i, 4 + 9 * i, cols);
    });
}

