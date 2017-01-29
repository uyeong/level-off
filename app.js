// Assign element(s).
const main = document.querySelector('.main');
const levelOff = document.querySelector('.level-off');
const preloader = levelOff.querySelector('.level-off__preloader');
const attacher = document.querySelector('.attacher');
const cropBox = document.querySelector('.crop-box');
const svg = cropBox.querySelector('svg');
const download = document.querySelector('.control__download-btn');

// Define svg variable(s).
let controlPoint = null;
let controlLine = null;
let otherLine = null;
let horizonLine = null;

// Define etc variable(s).
const GUIDE_STATE = {
    PENDING: 0,
    STARTED: 1,
    ENDED: 2
};

let cropper = null;
let angle = 0;
let degrees = 0;
let fileName = '';
let guideState = GUIDE_STATE.PENDING;
const {Stepper, inOutQuad} = stepperjs;

// Bind event listener(s).
delegate(main, '.attacher__input',       'change',    onChangeImageAttacher, false);
delegate(main, '.crop-box__guide-line',  'click',     onClickGuideline,      false);
delegate(main, '.crop-box__guide-line',  'mousemove', onMousemoveGuideline,  false);
delegate(main, '.control__download-btn', 'click',     onClickDownload,       false);
delegate(main, '.control__reset-btn',    'click',     onClickReset,          false);

function onChangeImageAttacher(event) {
    const image = event.target.files[0];
    const reader = new FileReader();

    fileName = image.name;

    reader.onload = (event) => {
        const image = cropBox.querySelector('.crop-box__image');

        image.setAttribute('src', event.target.result);
        cropper = createCropper(image);
        levelOff.classList.add('level-off--crop');
    };

    setTimeout(() => reader.readAsDataURL(image), 350);
    setLevelOffLoadingMode(true);
}

function onClickGuideline(event) {
    if (guideState === GUIDE_STATE.STARTED) {
        doLevelOff();
        guideState = GUIDE_STATE.ENDED;
        return;
    }

    if (guideState === GUIDE_STATE.ENDED) {
        return;
    }

    const x = event.offsetX;
    const y = event.offsetY;

    controlPoint = createCircle(x, y);
    controlLine = createLine(x, y);
    otherLine = createLine(x, y);
    horizonLine = createLine(x, y);

    horizonLine.setAttributeNS('', 'stroke-linecap', 'butt');
    horizonLine.setAttributeNS('', 'stroke-dasharray', '5, 5');

    svg.appendChild(controlPoint);
    svg.appendChild(controlLine);
    svg.appendChild(otherLine);
    svg.appendChild(horizonLine);

    guideState = GUIDE_STATE.STARTED;
}

function onMousemoveGuideline(event) {
    if (guideState === GUIDE_STATE.PENDING ||
        guideState === GUIDE_STATE.ENDED) {
        return;
    }

    const x1 = controlLine.getAttributeNS('', 'x1');
    const y1 = controlLine.getAttributeNS('', 'y1');
    const x2 = event.offsetX;
    const y2 = event.offsetY;
    const nx = (x1 * 2) - x2;
    const ny = (y1 * 2) - y2;
    const controlLineLength = getLineLength(x1, y1, x2, y2);
    const horizonLineLength = getLineLength(x1, 0, x2, 0);

    angle = Math.acos(horizonLineLength / controlLineLength);
    degrees = y1 - y2 > 0 ? toDegrees(angle) : -toDegrees(angle);

    if ((x1 - x2) > 0) {
        degrees = -1 * degrees;
    }

    controlLine.setAttributeNS('', 'x2', x2);
    controlLine.setAttributeNS('', 'y2', y2);
    otherLine.setAttributeNS('', 'x2', nx);
    otherLine.setAttributeNS('', 'y2', ny);
    horizonLine.setAttributeNS('', 'x1', nx);
    horizonLine.setAttributeNS('', 'x2', x2);
}

function onClickDownload(event) {
    const target = event.delegateTarget;

    if (target.classList.contains('disabled')) {
        event.preventDefault();
    }
}

function onClickReset(event) {
    event.preventDefault();

    guideState = GUIDE_STATE.PENDING;
    levelOff.classList.remove('level-off--crop');
    download.classList.add('disabled');
    attacher.querySelector('.attacher__input').value = '';

    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

function createCropper(image) {
    return new Cropper(image, {
        dragMode: 'none',
        cropBoxResizable: false,
        cropBoxMovable: false,
        zoomable: false,
        autoCropArea: 1,
        center: false,
        ready: () => {
            setLevelOffLoadingMode(false);

            const containerStyle = cropBox.querySelector('.cropper-container').style;
            const boxStyle = cropBox.querySelector('.cropper-crop-box').style;
            const faceStyle = cropBox.querySelector('.cropper-face').style;
            const imgStyle = cropBox.querySelector('.cropper-canvas img').style;
            const width = parseInt(containerStyle.width, 10);
            const height = parseInt(containerStyle.height, 10);

            boxStyle.top = 0;
            boxStyle.height = `${height}px`;
            imgStyle.height = `${height}px`;
            faceStyle.display = 'none';

            svg.setAttributeNS('', 'viewBox', `0 0 ${width} ${height}`);
        }
    });
}

function doLevelOff() {
    const {width, height} = cropper.image;
    const dilatedWidth = width * Math.abs(Math.cos(angle)) + height * Math.abs(Math.sin(angle));
    const dilatedHeight = height * Math.abs(Math.cos(angle)) + width * Math.abs(Math.sin(angle));
    const scale = (dilatedWidth * dilatedHeight) / (width * height);

    new Stepper({
        duration: 300,
        easing: inOutQuad
    }).on({
        update: (n) => {
            cropper
                .rotateTo(n * degrees)
                .scale((n * (scale - 1)) + 1);

            controlPoint.setAttributeNS('', 'opacity', 1 - (1 * n));
            controlLine.setAttributeNS('', 'opacity', 1 - (1 * n));
            otherLine.setAttributeNS('', 'opacity', 1 - (1 * n));
            horizonLine.setAttributeNS('', 'opacity', 1 - (1 * n));
        },
        ended: () => {
            const namePiece = /^(.+)\.(\w+)$/g.exec(fileName);

            cropper.getCroppedCanvas().toBlob((blob) => {
                download.href = window.URL.createObjectURL(blob);
                download.download = `${namePiece[1]}-leveloff.${namePiece[2]}`;
                download.classList.remove('loading');
                download.classList.remove('disabled');
                setLevelOffLoadingMode(false);
            });

            download.classList.add('loading');
            setLevelOffLoadingMode(true);

            svg.removeChild(controlPoint);
            svg.removeChild(controlLine);
            svg.removeChild(otherLine);
            svg.removeChild(horizonLine);
        }
    }).start();
}

function setLevelOffLoadingMode(state) {
    preloader.style.display = 'block';

    if (levelOff.classList.contains('loading') && !state) {
        const onTransitionEnd = () => {
            preloader.removeEventListener("transitionend", onTransitionEnd);
            preloader.removeEventListener("webkitTransitionEnd", onTransitionEnd);
            preloader.style.display = 'none'
        };

        preloader.addEventListener("transitionend", onTransitionEnd, false);
        preloader.addEventListener("webkitTransitionEnd", onTransitionEnd, false);
    }

    setTimeout(() => levelOff.classList[state ? 'add' : 'remove']('loading'), 0);
}

function createCircle(x, y) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", 'circle');

    circle.setAttributeNS('', 'stroke', '#fff');
    circle.setAttributeNS('', 'fill', '#fff');
    circle.setAttributeNS('', 'r', '2');
    circle.setAttributeNS('', 'cx', x);
    circle.setAttributeNS('', 'cy', y);

    return circle;
}

function createLine(x, y) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", 'line');

    line.setAttributeNS('', 'stroke', '#fff');
    line.setAttributeNS('', 'stroke-width', '1');
    line.setAttributeNS('', 'x1', x);
    line.setAttributeNS('', 'x2', x);
    line.setAttributeNS('', 'y1', y);
    line.setAttributeNS('', 'y2', y);

    return line;
}

function getLineLength(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2));
}

function toDegrees (angle) {
    return angle * (180 / Math.PI);
}
