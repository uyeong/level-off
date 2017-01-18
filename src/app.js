// Load style file(s).
import 'font-awesome/css/font-awesome.css';
import 'initialize-css/dist/initialize.css';
import 'cropperjs/dist/cropper.css';
import '../scss/styles.scss';

// Load dependency module(s).
import delegate from 'delegate';
import Cropper from 'cropperjs';
import Stepper from 'stepperjs';
import inOutQuad from 'stepperjs/dist/easings/inOutQuad';

// Assign element(s).
const levelOff = document.querySelector('.level-off');
const attacher = document.querySelector('.attacher');
const cropBox = document.querySelector('.crop-box');
const control = document.querySelector('.control');
const download = document.querySelector('.control__download-btn');

// Define svg variable(s).
let circle;
let controlLine;
let otherLine;
let horizonLine;

// Define etc variable(s).
const GUIDE_STATE = {
    PENDING: 0,
    STARTED: 1,
    ENDED: 2
};

let cropper;
let angle;
let degrees;
let guideState = GUIDE_STATE.PENDING;

// Bind event listener(s).
delegate(levelOff, '.attacher__input', 'change', onChangeImageAttacher);
delegate(levelOff, '.crop-box__guide-line', 'click', onClickGuideline);
delegate(levelOff, '.crop-box__guide-line', 'mousemove', onMousemoveGuideline);
delegate(control, '.control__download-btn', 'click', onClickDownload);
delegate(control, '.control__reset-btn', 'click', onClickReset);

function onChangeImageAttacher(event) {
    const image = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => initCropper(event.target.result);
    setTimeout(() => reader.readAsDataURL(image), 350);
    toggleLevelOffLoading(true);
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

    const svg = cropBox.querySelector('svg');
    const x = event.offsetX;
    const y = event.offsetY;

    circle = createCircle(x, y);
    controlLine = createLine(x, y);
    otherLine = createLine(x, y);
    horizonLine = createLine(x, y);

    horizonLine.setAttributeNS('', 'stroke-linecap', 'round');
    horizonLine.setAttributeNS('', 'stroke-dasharray', '1, 2');

    svg.appendChild(circle);
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
    const x1 = controlLine.getAttributeNS(null, 'x1');
    const y1 = controlLine.getAttributeNS(null, 'y1');
    const x2 = event.offsetX;
    const y2 = event.offsetY;
    const nx = (x1 * 2) - x2;
    const ny = (y1 * 2) - y2;
    const controlLineLength = getLineLength(x1, y1, x2, y2);
    const horizonLineLength = getLineLength(x1, 0, x2, 0);

    angle = Math.acos(horizonLineLength / controlLineLength);
    degrees = y1 - y2 > 0 ? toDegrees(angle) : -toDegrees(angle);

    if (x1 - x2 > 0) {
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


function initCropper(image) {
    const target = cropBox.querySelector('.crop-box__image');

    target.setAttribute('src', image);
    levelOff.classList.add('level-off--crop');

    cropper = new Cropper(target, {
        dragMode: 'none',
        cropBoxResizable: false,
        cropBoxMovable: false,
        zoomable: false,
        autoCropArea: 1,
        center: false,
        ready: () => {
            toggleLevelOffLoading(false);

            const container = cropBox.querySelector('.cropper-container');
            const box = cropBox.querySelector('.cropper-crop-box');
            const img = box.querySelector('img');
            const width = parseInt(container.style.width, 10);
            const height = parseInt(container.style.height, 10);

            box.style.top = 0;
            box.style.height = `${height}px`;
            img.style.height = `${height}px`;

            cropBox.querySelector('svg').setAttributeNS('', 'viewBox', `0 0 ${width} ${height}`);
            cropBox.querySelector('.cropper-face').style.display = 'none';

            Array.from(cropBox.getElementsByClassName('cropper-dashed'))
                .forEach(e => e.style.display = 'none');
        }
    });
}

function doLevelOff() {
    const {width, height} = cropper.image;
    const nWidth = width * Math.abs(Math.cos(angle)) + height * Math.abs(Math.sin(angle));
    const nHeight = height * Math.abs(Math.cos(angle)) + width * Math.abs(Math.sin(angle));
    const scale = (nWidth * nHeight) / (width * height);

    new Stepper({
        duration: 300,
        easing: inOutQuad
    }).on({
        update: (n) => {
            cropper
                .rotateTo(n * degrees)
                .scale((n * (scale - 1)) + 1);

            circle.setAttributeNS('', 'opacity', 1 - (1 * n));
            controlLine.setAttributeNS('', 'opacity', 1 - (1 * n));
            otherLine.setAttributeNS('', 'opacity', 1 - (1 * n));
            horizonLine.setAttributeNS('', 'opacity', 1 - (1 * n));
        },
        ended: () => {
            cropper.getCroppedCanvas().toBlob((blob) => {
                download.href = window.URL.createObjectURL(blob);
                download.download = 'leveloff-image.png';
                download.classList.remove('loading');
                download.classList.remove('disabled');
                toggleLevelOffLoading(false);
            });

            download.classList.add('loading');
            toggleLevelOffLoading(true);

            cropBox.querySelector('svg').removeChild(circle);
            cropBox.querySelector('svg').removeChild(controlLine);
            cropBox.querySelector('svg').removeChild(otherLine);
            cropBox.querySelector('svg').removeChild(horizonLine);
        }
    }).start();
}

function toggleLevelOffLoading(state) {
    const preloader = levelOff.querySelector('.level-off__preloader');

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

    circle.setAttributeNS('', 'stroke', '#4fc1e9');
    circle.setAttributeNS('', 'fill', '#4fc1e9');
    circle.setAttributeNS('', 'r', '2');
    circle.setAttributeNS('', 'cx', x);
    circle.setAttributeNS('', 'cy', y);

    return circle;
}

function createLine(x, y) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", 'line');

    line.setAttributeNS('', 'stroke', '#4fc1e9');
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

