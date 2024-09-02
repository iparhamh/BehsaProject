// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

const Tau = 2 * Math.PI;

const gameDiv = document.getElementById("game-screen");
const gameScreenRect = gameDiv.getBoundingClientRect();
const gameCanvas = document.getElementById("game-canvas");

// setting the canvas y position as same as the div y position
gameCanvas.style.position = "absolute";
gameCanvas.style.top = `${gameScreenRect.y}px`;
gameCanvas.setAttribute("width", gameScreenRect.width);
gameCanvas.setAttribute("height", gameScreenRect.height);
const gameCanvasRect = gameCanvas.getBoundingClientRect();
const gameCanvasCtx = gameCanvas.getContext("2d");

// Target frame rate
const TFPS = 60;
const STEP = 1 / TFPS;
const nStars = 180;
const starRadius = 8;
const starMinSpeed = -30;
const starMaxSpeed = 30;
const starColor = "#ffffff";

// draw a line between two stars only if their distance is less than this value
const drawLineThresh = 170;

// stars wil get pushed back if the get close to the mouse cursor
const distanceFromCursor = 150;

// for calculating the line width based on how close the two stars are
const minLineWidth = 1;
const maxLineWidth = 4;
const dLineWidth = maxLineWidth - minLineWidth;

// what a nice name
const starsOutOfScreenFreedomStart = drawLineThresh;
const starsOutOfScreenFreedom = starsOutOfScreenFreedomStart + 80;


class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    copy() {
        return new Point(this.x, this.y);
    }
}


class Star {
    constructor(pos, radius, speedx, speedy, color) {
        this.originalPos = pos.copy();
        this.pos = pos.copy();
        this.radius = radius;
        this.diameter = radius * 2;
        this.speedx = speedx;
        this.speedy = speedy;
        this.color = color;
    }

    move(dt) {
        this.originalPos.x += this.speedx * dt;
        this.originalPos.y += this.speedy * dt;

        let dx = this.originalPos.x - this.pos.x;
        let dy = this.originalPos.y - this.pos.y;

        this.pos.x += dx * dt;
        this.pos.y += dy * dt;
    }

    render(ctx) {
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Tau);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = this.color;
        ctx.stroke()
    }

    //checks if the coordinate is inside of the rendering area or not
    isOutOfBounds(rect, thresh) {
        return this.pos.x < -thresh || this.pos.x > rect.width + thresh || this.pos.y < -thresh || this.pos.y > rect.height + thresh;
    }
}


class Random {
    // returns a random number between the given range
    static randrange(start, end) {
        return Math.random() * (end - start) + start;
    }

    // returns a random item from the array
    static choice(arr) {
        return arr[Math.floor(this.randrange(0, arr.length))];
    }
}


class RGBA {
    constructor(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    // is used as a style.color for the lines
    toString() {
        return `rgba(${this.r},${this.g},${this.b},${this.a})`;
    }
}

// the r, g, and b values should be 0-255 but the alpha value is 0-1
const lineColor = new RGBA(255, 255, 255, 1);

// tracks the cursor position
var mousePos = new Point(0, 0);

// assigns the mouse position to the mousePos variable on mouse move
function getMousePosOnCanvas(e) {
    mousePos.x = e.pageX;
    mousePos.y = e.pageY;
}

function drawLine(ctx, pos1, pos2, width, color) {
    ctx.beginPath();
    ctx.moveTo(pos1.x, pos1.y);
    ctx.lineTo(pos2.x, pos2.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
}

function clearCanvas() {
    gameCanvasCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
}


// for calculating the delta time
var oldF = 0;
var newF = Date.now();
var dt = 0;

// creating the stars array
var stars = [];
for (let i = 0; i < nStars; i++) {
    stars.push(
        new Star(
            // random position on the screen
            new Point(Random.randrange(-drawLineThresh, gameScreenRect.width + drawLineThresh), Random.randrange(-drawLineThresh, gameScreenRect.height + drawLineThresh)),
            starRadius,
            // random speed
            Random.randrange(starMinSpeed, starMaxSpeed),
            Random.randrange(starMinSpeed, starMaxSpeed),
            starColor)
    );
}


class Game {
    update() {
        if (document.hidden) {
            oldF = newF;
            newF = Date.now();
            dt = (newF - oldF) / 1000;
            return;
        }
        // calculatin the delta time in seconds
        oldF = newF;
        newF = Date.now();
        dt = (newF - oldF) / 1000;

        clearCanvas();

        for (let i = 0; i < stars.length; i++) {
            // render the stars?
            // stars[i].render(gameCanvasCtx);
            stars[i].move(dt);

            // calculating the distance between mouse and the current star
            let dxm = stars[i].pos.x - mousePos.x;
            let dym = stars[i].pos.y - (mousePos.y - gameCanvasRect.y);
            let mouseDistance = (dxm * dxm + dym * dym) ** 0.5;
            // pushing the star back if its close to the cursor
            if (mouseDistance && mouseDistance < distanceFromCursor) {
                let ratio = distanceFromCursor / mouseDistance;
                let newX = dxm * ratio;
                let newY = dym * ratio;
                stars[i].pos.x += newX - dxm;
                stars[i].pos.y += newY - dym;
            }

            // checking if the star is out of the screen (warning, the next few lines of code are very difficult to process by a normal human brain)
            if (stars[i].isOutOfBounds(gameCanvasRect, starsOutOfScreenFreedom)) {
                // removing the star
                stars.splice(i, 1);

                // wow what a readable code ahead
                /* so this will create a new star every time a star is out of the screen
                 * the hard part is that the star needs to spawn out of the screen and gradually make its way inside
                 * there are two main options for choosing the position
                 * 1. make the position free in the x axis but out of the screen in the y axis
                 *      and then we need to choose between A.position be above the screen or B. below the screen
                 * 
                 * 2. make the position free in the y axis but out of the screen in the x axis
                 *      and then we need to choose between A.position be left of the screen or B. right of the screen
                 * 
                 * so this is basically what the code is doing, there may be a better way...
                 * but i rather the easier way.
                 */
                stars.push(
                    Random.choice([
                        new Star(
                            Random.choice([
                                new Point(
                                    Random.randrange(
                                        0,
                                        gameScreenRect.width
                                    ),
                                    Random.choice([
                                        Random.randrange(
                                            gameScreenRect.top - starsOutOfScreenFreedomStart,
                                            gameScreenRect.top - starsOutOfScreenFreedom
                                        ),
                                        Random.randrange(
                                            gameScreenRect.bottom + starsOutOfScreenFreedomStart,
                                            gameScreenRect.bottom + starsOutOfScreenFreedom
                                        )]
                                    )
                                ),
                                new Point(
                                    Random.choice([
                                        Random.randrange(
                                            gameScreenRect.left - starsOutOfScreenFreedomStart,
                                            gameScreenRect.left - starsOutOfScreenFreedom
                                        ),
                                        Random.randrange(
                                            gameScreenRect.right + starsOutOfScreenFreedomStart,
                                            gameScreenRect.right + starsOutOfScreenFreedom
                                        )
                                    ]),
                                    Random.randrange(
                                        0,
                                        gameScreenRect.height
                                    )
                                )
                            ]),
                            starRadius,
                            Random.randrange(starMinSpeed, starMaxSpeed),
                            Random.randrange(starMinSpeed,starMaxSpeed),
                            starColor
                        ),
                    ])
                );
                
            }

            // iterating over the rest of the array with a nested loop
            for (let j = i + 1; j < stars.length; j++) {

                // calculating the distance between star1 and star2
                let dx = stars[i].pos.x - stars[j].pos.x;
                let dy = stars[i].pos.y - stars[j].pos.y;
                let distance = (dx * dx + dy * dy) ** 0.5;

                // drawing a line from star1 to star2 if they are close
                if (distance && distance < drawLineThresh) {

                    // calculating the line color alpha value based on the stars distance from each other
                    lineColor.a = 1 - (distance / drawLineThresh);

                    // calculating the line width based on the stars distance
                    let lineWidth = lineColor.a * dLineWidth + minLineWidth;

                    // finally drawing the line
                    drawLine(gameCanvasCtx, stars[i].pos, stars[j].pos, lineWidth, lineColor.toString());
                }
            }
        }
    }

    run() {
        // running game loop
        setInterval(this.update, STEP);
    }
}

let game = new Game();
game.run();
