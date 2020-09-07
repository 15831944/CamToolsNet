interface Point {
    x: number;
    y: number;
}

interface Bounds {
    min: Point;
    max: Point;
}

const uri = 'api/Editor';
let drawModel: any = [];
let bounds: Bounds = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } };

// get on-screen canvas
const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
const ctx = canvas.getContext('2d');

var translatePos = {
    x: canvasWidth / 2,
    y: canvasHeight / 2
};

var scale: number = 1.0;
var scaleMultiplier: number = 0.8;
var startDragOffset: Point = { x: 0, y: 0 };
var mouseDown: boolean = false;

let originTransform = new DOMMatrix();
let inverseOriginTransform = new DOMMatrix();

// https://stackoverflow.com/questions/45852075/getting-relative-mouse-position-on-canvas-after-scaling
function setZoomAndOffsetTransform() {
    originTransform = new DOMMatrix();
    originTransform.translateSelf(translatePos.x, translatePos.y);
    originTransform.scaleSelf(scale, scale);
    inverseOriginTransform = originTransform.inverse();
}

function getElementRelativeMousePosition(e: MouseEvent) {
    return [e.offsetX, e.offsetY];
}

function getCanvasRelativeMousePosition(e: MouseEvent) {
    const pos = getElementRelativeMousePosition(e);
    pos[0] = pos[0] * ctx.canvas.width / ctx.canvas.clientWidth;
    pos[1] = pos[1] * ctx.canvas.height / ctx.canvas.clientHeight;
    return pos;
}

function getTransformRelativeMousePosition(e: MouseEvent) {
    const pos = getCanvasRelativeMousePosition(e);
    const p = new DOMPoint(...pos);
    const point = inverseOriginTransform.transformPoint(p);
    return { x: point.x, y: point.y };
}

// add event listeners to handle screen drag
canvas.addEventListener("mousedown", function (evt: MouseEvent) {
    mouseDown = true;
    startDragOffset.x = evt.clientX - translatePos.x;
    startDragOffset.y = evt.clientY - translatePos.y;
});

canvas.addEventListener("mouseup", function (evt) {
    mouseDown = false;
});

canvas.addEventListener("mouseover", function (evt) {
    mouseDown = false;
});

canvas.addEventListener("mouseout", function (evt) {
    mouseDown = false;
});

canvas.addEventListener("mousemove", function (evt: MouseEvent) {

    var mousePos = getTransformRelativeMousePosition(evt);

    // clear small area where the mouse pos is plotted
    ctx.clearRect(10, 43, 100, 20);

    ctx.font = '10px sans-serif';
    ctx.fillText('pos: ' + round2TwoDecimal(mousePos.x) + ' : ' + round2TwoDecimal(mousePos.y), 10, 50);

    if (mouseDown) {
        translatePos.x = evt.clientX - startDragOffset.x;
        translatePos.y = evt.clientY - startDragOffset.y;
        draw(scale, translatePos);
    }
});

var handleScroll = function (evt) {
    // e is the mouse wheel event
    const x = evt.offsetX;
    const y = evt.offsetY;

    const amount: number = evt.wheelDelta > 0 ? 1.1 : 1 / 1.1;

    // set limits
    var tmpScale = scale * amount;
    if (tmpScale > 30) return;
    if (tmpScale < 0.3) return;

    scale *= amount;  // the new scale

    // move the origin  
    translatePos.x = x - (x - translatePos.x) * amount;
    translatePos.y = y - (y - translatePos.y) * amount;

    draw(scale, translatePos);

    return evt.preventDefault() && false;
};

canvas.addEventListener('DOMMouseScroll', handleScroll, false);
canvas.addEventListener('mousewheel', handleScroll, false);

function zoomToFit() {
    // https://stackoverflow.com/questions/38354488/zoom-to-fit-canvas-javascript

    var dataWidth = bounds.max.x - bounds.min.x;
    var dataHeight = bounds.max.y - bounds.min.y;

    var scaleY = canvasHeight / dataHeight;
    var scaleX = canvasWidth / dataWidth;
    scale = Math.min(scaleX, scaleY);

    // move the origin  
    translatePos.x = (canvasWidth / 2) - ((dataWidth / 2) + bounds.min.x) * scale;
    translatePos.y = ((canvasHeight / 2) - ((dataHeight / 2) + bounds.min.y) * scale);
}

function round2TwoDecimal(number) {
    return Math.round((number + Number.EPSILON) * 100) / 100;
}

function createOffscreenContext(width, height) {
    var offScreenCanvas = document.createElement('canvas');
    offScreenCanvas.width = width;
    offScreenCanvas.height = height;
    var off_ctx = offScreenCanvas.getContext("2d");
    return off_ctx; // use off_ctx.canvas to get the the context's canvas
}

function drawPixel(imgData, canvasWidth, x, y, r, g, b, a) {
    var index = (x + y * canvasWidth) * 4;
    imgData.data[index + 0] = r;
    imgData.data[index + 1] = g;
    imgData.data[index + 2] = b;
    imgData.data[index + 3] = a;
}

function calculateBounds(): Bounds {

    let maxX = 0;
    let maxY = 0;
    let minX = 100000;
    let minY = 100000;
    let curX = 0;
    let curY = 0;

    drawModel.circles.forEach(circle => {
        var x = circle.center.x;
        var y = circle.center.y;
        var radius = circle.radius;

        curX = x + radius;
        curY = y + radius;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;

        curX = x - radius;
        curY = y - radius;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;
    });

    drawModel.lines.forEach(line => {
        var startX = line.startPoint.x;
        var startY = line.startPoint.y;
        var endX = line.endPoint.x;
        var endY = line.endPoint.y;

        curX = startX;
        curY = startY;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;

        curX = endX;
        curY = endY;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;
    });

    drawModel.arcs.forEach(a => {
        var centerX = a.center.x;
        var centerY = a.center.y;
        var radius = a.radius;
        var startAngle = a.startAngle;
        var endAngle = a.endAngle;
        var startX = (centerX + Math.cos(startAngle * Math.PI / 180) * radius);
        var startY = (centerY + Math.sin(startAngle * Math.PI / 180) * radius);
        var endX = (centerX + Math.cos(endAngle * Math.PI / 180) * radius);
        var endY = (centerY + Math.sin(endAngle * Math.PI / 180) * radius);

        curX = startX;
        curY = startY;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;

        curX = endX;
        curY = endY;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;

        curX = centerX;
        curY = centerY;
        maxX = curX > maxX ? curX : maxX;
        minX = curX < minX ? curX : minX;
        maxY = curY > maxY ? curY : maxY;
        minY = curY < minY ? curY : minY;
    });

    // drawing polylines
    drawModel.polylines.forEach(p => {
        for (let i = 0; i < p.vertexes.length; i++) {
            var vertex = p.vertexes[i];
            var pointX = vertex.x;
            var pointY = vertex.y;

            curX = pointX;
            curY = pointY;
            maxX = curX > maxX ? curX : maxX;
            minX = curX < minX ? curX : minX;
            maxY = curY > maxY ? curY : maxY;
            minY = curY < minY ? curY : minY;
        }
    });

    // drawing polylines light weight
    drawModel.polylinesLW.forEach(p => {
        for (let i = 0; i < p.vertexes.length; i++) {
            var vertex = p.vertexes[i];
            var pointX = vertex.position.x;
            var pointY = vertex.Position.y;

            curX = pointX;
            curY = pointY;
            maxX = curX > maxX ? curX : maxX;
            minX = curX < minX ? curX : minX;
            maxY = curY > maxY ? curY : maxY;
            minY = curY < minY ? curY : minY;
        }
    });

    // add canvasHeight to y axis to flip the y axis
    return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}

function drawGrid(gridCanvas: HTMLCanvasElement, gridPixelSize: number, color: string, gap: number) {
    var ctx = gridCanvas.getContext("2d");
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = color;

    // horizontal grid lines
    for (var i = 0; i <= gridCanvas.height; i = i + gridPixelSize) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(gridCanvas.width, i);
        if (i % gap == 0) {
            ctx.lineWidth = 0.5;
        } else {
            ctx.lineWidth = 0.5;
        }
        ctx.closePath();
        ctx.stroke();
    }

    // vertical grid lines
    for (var j = 0; j <= gridCanvas.width; j = j + gridPixelSize) {
        ctx.beginPath();
        ctx.moveTo(j, 0);
        ctx.lineTo(j, gridCanvas.height);
        if (j % gap == 0) {
            ctx.lineWidth = 0.5;
        } else {
            ctx.lineWidth = 0.5;
        }
        ctx.closePath();
        ctx.stroke();
    }

    for (var ii = 0; ii <= gridCanvas.width; ii += 2) {
        for (var jj = 0; jj <= gridCanvas.height; jj += 2) {
            ctx.clearRect(ii, jj, 1, 1);
        }
    }
}

function draw(scale: number, translatePos: Point) {

    // create off-screen canvas to draw pixels on
    // https://stackoverflow.com/questions/48858220/javascript-put-image-data-on-top-of-canvas
    var off_ctx = createOffscreenContext(canvasWidth, canvasHeight);
    var imgData = off_ctx.createImageData(canvasWidth, canvasHeight);

    // clear
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // debugging: draw non zoomed and non panned
    ctx.font = '10px sans-serif';
    ctx.fillText('scale: ' + round2TwoDecimal(scale), 10, 10);
    ctx.fillText('panning: ' + round2TwoDecimal(translatePos.x) + ' : ' + round2TwoDecimal(translatePos.y), 10, 20);

    // get bounds
    ctx.fillText('x bounds: ' + round2TwoDecimal(bounds.min.x) + ' - ' + round2TwoDecimal(bounds.max.x), 10, 30);
    ctx.fillText('y bounds: ' + round2TwoDecimal(bounds.min.y) + ' - ' + round2TwoDecimal(bounds.max.y), 10, 40);

    ctx.save();
    // ctx.translate(translatePos.x, translatePos.y);
    // ctx.scale(scale, scale);
    setZoomAndOffsetTransform();
    ctx.setTransform(
        originTransform.a,
        originTransform.b,
        originTransform.c,
        originTransform.d, // flip y axis (-originTransform.d)
        originTransform.e,
        originTransform.f); // (canvasHeight - originTransform.f) move by canvasHeight (due to flipping)

    // ---- start drawing the model ---
    // drawGrid(canvas, 40, 'gray', 10);

    // drawing circles
    ctx.beginPath(); // begin
    drawModel.circles.forEach(circle => {
        var startAngle = 0;
        var endAngle = 2 * Math.PI;
        var x = circle.center.x;
        var y = circle.center.y;
        var radius = circle.radius;

        ctx.moveTo(x + radius, y);
        ctx.arc(x, y, radius, startAngle, endAngle, false);

        // doesn't work for negative x or y
        // drawPixel(imgData, canvasWidth, x, y, 255, 0, 0, 255);
        ctx.fillRect(x - 0.2, y - 0.2, 0.4, 0.4); // fill in the pixel

        // draw diameter
        var dia = round2TwoDecimal(radius * 2);
        ctx.font = '2px sans-serif';
        ctx.fillText('' + dia, x, y + 6);
    });
    ctx.closePath(); // end
    ctx.lineWidth = 0.3;
    ctx.strokeStyle = "#0000ff";
    ctx.stroke();
    // done drawing circles


    // drawing lines
    ctx.beginPath(); // begin
    drawModel.lines.forEach(line => {
        var startX = line.startPoint.x;
        var startY = line.startPoint.y;
        var endX = line.endPoint.x;
        var endY = line.endPoint.y;

        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
    });
    ctx.closePath(); // end

    ctx.lineWidth = 0.3;
    ctx.strokeStyle = "#44cc44";
    ctx.stroke();
    // done drawing lines    


    // drawing arcs
    ctx.beginPath(); // begin
    drawModel.arcs.forEach(a => {
        var centerX = a.center.x;
        var centerY = a.center.y;
        var radius = a.radius;
        var startAngle = a.startAngle;
        var endAngle = a.endAngle;

        var startX = (centerX + Math.cos(startAngle * Math.PI / 180) * radius);
        var startY = (centerY + Math.sin(startAngle * Math.PI / 180) * radius);
        var endX = (centerX + Math.cos(endAngle * Math.PI / 180) * radius);
        var endY = (centerY + Math.sin(endAngle * Math.PI / 180) * radius);

        var isCounterClockwise = false;

        ctx.moveTo(startX, startY);
        ctx.arc(centerX, centerY, radius, startAngle * Math.PI / 180, endAngle * Math.PI / 180, isCounterClockwise);
        ctx.moveTo(endX, endY);
    });
    ctx.closePath(); // end

    ctx.lineWidth = 0.3;
    ctx.strokeStyle = "#000000";
    ctx.stroke();
    // done drawing arcs    


    // drawing polylines
    ctx.beginPath(); // begin
    drawModel.polylines.forEach(p => {
        for (let i = 0; i < p.vertexes.length; i++) {
            var vertex = p.vertexes[i];
            var pointX = vertex.x;
            var pointY = vertex.y;

            if (i == 0) {
                ctx.moveTo(pointX, pointY);
            }
            else {
                ctx.lineTo(pointX, pointY);
            }
        }
    });
    ctx.closePath(); // end

    ctx.lineWidth = 0.3;
    ctx.strokeStyle = "#ff00ff";
    ctx.stroke();
    // done drawing polylines


    // drawing polylines light weight
    ctx.beginPath(); // begin
    drawModel.polylinesLW.forEach(p => {
        for (let i = 0; i < p.vertexes.length; i++) {
            var vertex = p.vertexes[i];
            var pointX = vertex.position.x;
            var pointY = vertex.Position.y;
            var bulge = vertex.bulge;
            var prePointX = 0;
            var prePointY = 0;

            if (i == 0) {
                ctx.moveTo(pointX, pointY);
            }
            else {
                let angle = 4 * Math.atan(Math.abs(bulge)) / Math.PI * 180;
                let length = Math.sqrt((pointX - prePointX) * (pointX - prePointX) + (pointY - prePointY) * (pointY - prePointY));
                let radius = Math.abs(length / (2 * Math.sin(angle / 360 * Math.PI)));
                ctx.arc(pointX, pointY, radius, 0, angle * Math.PI / 180, false);

                prePointX = pointX;
                prePointY = pointY;
            }
        }
    });
    ctx.closePath(); // end

    ctx.lineWidth = 0.3;
    ctx.strokeStyle = "#002266";
    ctx.stroke();
    // done drawing polylines light weight


    // copy offscreen to onscreen
    off_ctx.putImageData(imgData, 0, 0);
    ctx.drawImage(off_ctx.canvas, 0, 0);

    // mark bounds area
    // ctx.strokeStyle = "hsl(" + (360 * Math.random()) + ", 80%, 50%)";
    // ctx.strokeRect(bounds.min.x, bounds.min.y, bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y);

    ctx.restore();
}

function getDrawModel() {
    fetch(uri)
        .then(response => response.json())
        .then(data => {
            // console.log(data);
            drawModel = data;
            bounds = calculateBounds();
            zoomToFit();
            draw(scale, translatePos);
        })
        .catch(error => console.error('Unable to get draw model.', error));
}