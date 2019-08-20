import {polarToCartesian} from './utils.js';

const size = 320;

const realStrokeWidth = 75;
const fakeStrokeWidth = 50;

const overlapClip = 'overlapClip';
const partA = 'partA';
const partB = 'partB';
const angleX = 'angleX';

const MULTIPLIER_MAX = 0.65;
const MULTIPLIER_MIN = -0.15;
let multiplier = 0.65;

const ARC_ID = 'arc';

const _2PI = Math.PI * 2;

const INITIAL_ANGLE_FOR_GRADIENT = 83;
const INITIAL_ANGLE_ARC = _2PI * (-0.85/4);

const INITIAL_ANGLE_FAKE_ARC = _2PI * (-1/4);

let draw, arc;

function init() {
	draw = SVG('drawing').viewbox(0, 0, size, size);
	arc = drawArc(_2PI * multiplier);
	addDefs();
	applyConicGradient();
}

function calculateArc(startAngle, endAngle, strokeWidth) {
	const radius = size / 2 - strokeWidth / 2;
	const clockwise = true;

	const startPoint = polarToCartesian(startAngle, radius, strokeWidth);

	return [
		['M', ...startPoint],
		arcPath(startAngle, endAngle, radius, clockwise, strokeWidth)
	];
}

let fakeArc;

let arcsGroup;

function drawArc(endAngle) {
	const arcParameters = new SVG.PathArray(calculateArc(INITIAL_ANGLE_ARC, endAngle, realStrokeWidth));
	const fakeArcParameters = new SVG.PathArray(calculateArc(INITIAL_ANGLE_FAKE_ARC, endAngle, fakeStrokeWidth));

	draw.fill('none');

	// fake arc to fix cutting real one off
	fakeArc = draw.path(fakeArcParameters).fill('none').stroke({
		color: 'none',
		width: fakeStrokeWidth,
		linecap: 'round'
	});

	const realArc = draw.path(arcParameters).id(ARC_ID).fill('none').stroke({
		color: 'white',
		width: realStrokeWidth,
		linecap: 'round'
	});

	arcsGroup = draw.group().add(fakeArc).add(realArc);

	return realArc;
}

function arcPath(startAngle, endAngle, radius, clockwise, strokeWidth) {
	var angle = Math.abs(startAngle - endAngle);
	var fullCircle = angle == Math.PI * 2;
	var largeArc;

	if (fullCircle) {
		largeArc = true;
		clockwise = true;
	} else {
		var overHalf = angle > Math.PI;
		var reverse = startAngle > endAngle;
		largeArc = overHalf === clockwise !== reverse;
	}

	var endPoint = polarToCartesian(endAngle, radius, strokeWidth);
	return [
		'A',
		radius,
		radius,
		0,
		largeArc ? 1 : 0,
		clockwise ? 1 : 0,
		endPoint[0],
		endPoint[1]
	];
}

function applyConicGradient() {
	arcsGroup.attr('mask', `url(#${angleX})`);

	const maskA = SVG.get(partA);
	const maskB = SVG.get(partB);

	for (let i = INITIAL_ANGLE_FOR_GRADIENT; i < INITIAL_ANGLE_FOR_GRADIENT + 360; i++) {
		const rect = draw.rect(size / 2, size / 2);

		rect.fill(degreeToRGBA(i));

		rect.node.setAttribute('transform', `rotate(${i} ${size / 2} ${size / 2})`);

		if (i > 270) {
			maskB.add(rect);
		} else {
			maskA.add(rect);
		}
	}
}

function addDefs() {
	const clipRect = draw.rect(size, size / 2).move(0, size / 2);
	const clip = draw.clip().id('overlapClip').add(clipRect);
	const maskRect = draw.rect(size, size).move(0, 0).fill('white');
	const group = draw.group();
	group.add(maskRect);
	const mask = draw.mask();
	mask.add(group);
	mask.id(angleX);
	const groupA = draw.group().id(partA);
	const groupB = draw.group().id(partB);
	groupB.attr('clip-path', `url(#${overlapClip})`);
	group.add(groupA);
	group.add(groupB);
}

function a_delimiter(x1,y1,x2,y2) {
	return (y2 - y1) / (x2 - x1);
}

function b_delimiter(x1,y1,a) {
	return x1 * a - y1;
}

function make_delimiter_func(x1,y1,x2,y2) {
	const a = a_delimiter(x1,y1,x2,y2);
	const b = b_delimiter(x1,y1,a);
	return deg => deg * (a) - b
}

const delimiter_func = make_delimiter_func(360, 360, 90, 2000);

function degreeToRGBA(degree) {
	const delimiter = delimiter_func(degree);
	const  ratio = degree / delimiter; // 360 is real delimimter
	const colorVal = Math.floor(255 * ratio);
	const colorArray = [colorVal, colorVal, colorVal]
	const result = 'rgba(' + colorArray.join(',') + ',1)';
	return result;
}

init();

function updateArc() {
	const endAngle = _2PI * multiplier;
	const arc = calculateArc(INITIAL_ANGLE_ARC, endAngle, realStrokeWidth);
	const arcString = arc.reduce((accumulator, current) => {
		if (Array.isArray(current)) {
			return accumulator + current.reduce((acc, curr) => {
				if (Number.isFinite(curr)) {
					return acc + ' ' + curr;
				}
				return acc + curr;
			}, '');
		}

		if (Number.isFinite(curr)) {
			return acc + ' ' + curr;
		}

		return acc + curr;
	}, '');
	document.querySelector(`#${ARC_ID}`).setAttribute('d', arcString);
}

let animationDirection = -1;

function animate() {
	requestAnimationFrame(() => {
		if (multiplier > MULTIPLIER_MAX || multiplier < MULTIPLIER_MIN) {
			animationDirection *= -1;
		}
		multiplier += 0.01 * animationDirection;
		updateArc();
		animate();
	});
}

animate();
