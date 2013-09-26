


var controller = new Leap.Controller({ enableGestures: true });

controller.on('connect', function() {
	console.log("Successfully connected.");
});

controller.on('deviceConnected', function() {
	console.log("A Leap device has been connected.");
});

controller.on('deviceDisconnected', function() {
	console.log("A Leap device has been disconnected.");
});

controller.on('blur', function() {
	blurred = true;
});
controller.on('focus', function() {
	blurred = false;
});

var blurred = false;
var grabbing = false;
var startPos = null;
var handIn = false;
var fingerId = null;
var thumbId = null;
var spaceDown = false;
var shiftDown = false;
var xLock = false;
var yLock = false;
var zLock = false;

var target = null;
var targetGrabPoint = null;
var targetOrigZ, targetGrabZ;
var rotationTarget, mouseTarget;

var oldPositions = [];

window.addEventListener('keydown', function(ev) {
	if (ev.which === 32) {
		spaceDown = true;
		ev.preventDefault();
	}
	if (ev.which === 16) {
		shiftDown = true;
	}
	if (E.Key.match(ev, 'z')) {
		zLock = !zLock;
	}
	if (E.Key.match(ev, 'x')) {
		xLock = !xLock;
	}
	if (E.Key.match(ev, ['c','y'])) {
		yLock = !yLock;
	}
}, false);

window.addEventListener('keyup', function(ev) {
	if (ev.which === 32) {
		spaceDown = false;
		ev.preventDefault();
	}
	if (ev.which === 16) {
		shiftDown = false;
	}
}, false);

var findTarget = function(x, y) {
	var tgt = document.elementFromPoint(x, y);
	// console.log(tgt,x,y);
	if (tgt && tgt.tagName === 'IMG') {
		return tgt.parentNode.parentNode.parentNode;
	} else {
		return null;
	}
};

var mouseDown = null;
window.addEventListener('mousedown', function(ev) {
	var tgt = findTarget(ev.pageX, ev.pageY);
	mouseDown = {x: ev.pageX, y: ev.pageY};
	if (tgt) {
		mouseTarget = rotationTarget = tgt;
	} else {
		mouseTarget = rotationTarget = null;
	}
	ev.preventDefault();
}, false);

window.addEventListener('mouseup', function(ev) {
	var dx = ev.pageX - mouseDown.x;
	var dy = ev.pageY - mouseDown.y;
	if (mouseTarget) {
		mouseTarget.position[0] += dx;
		mouseTarget.position[1] += dy;
		mouseTarget.update();
	}
	mouseDown = null;
	ev.preventDefault();
}, false);

window.addEventListener('mousewheel', function(ev) {
	var tgt = findTarget(ev.pageX, ev.pageY);
	tgt = (rotationTarget || target || tgt);
	rotationTarget = rotationTarget || tgt;
	if (tgt) {
		tgt.position[2] += ev.wheelDelta;
		tgt.update();
	}
}, false);

window.addEventListener('mousemove', function(ev) {
	if (mouseDown) {
		var dx = ev.pageX - mouseDown.x;
		var dy = ev.pageY - mouseDown.y;
		if (mouseTarget) {
			mouseTarget.position[0] += dx;
			mouseTarget.position[1] += dy;
			mouseTarget.update();
		}
		mouseDown.x = ev.pageX;
		mouseDown.y = ev.pageY;
	}
	ev.preventDefault();
}, false);

controller.on('frame', function(e) {
	if (target) {
		var sca = target.firstChild.firstChild;
		var rot = target.firstChild;
		var tra = target;
	}

	if (blurred) {
		return;
	}
	if (e.data.hands.length === 1) {
		var hand = e.data.hands[0];

		var handPos = hand.stabilizedPalmPosition;
		var handVel = hand.palmVelocity;
		var bbox = e.interactionBox;

		//logPre2.innerHTML = ''; //JSON.stringify(hand, null, 2) + '\n';

		var handId = null;
		e.fingers = e.fingers.filter(function(f) { if (f.handId >= -1 && handId === null) handId = f.handId; return handId === f.handId; });

		var finger;
		if (e.fingers.length === 1) {

			/* Forefinger cursor */
			finger = e.fingers[0];

			if (fingerId !== finger.id) {
				fingerId = finger.id;
				pointer.setBg('lime');
			}
			thumbId = null;

		}

		if (fingerId) {
			/* Thumb trigger and forefinger cursor */
			finger = e.pointable(fingerId);

			if (finger && finger.direction && finger.stabilizedTipPosition) {
				/*
				var thumb;
				if (thumbId) {
					thumb = e.pointable(thumbId);
				}
				if (!thumb && vec3.length(handVel) < 100 ) {
					thumbId = null;
					for (var i=0; i<e.fingers.length; i++) {
						if (vec3.dot(e.fingers[i].direction, finger.direction) < 0.7) {
							thumb = e.fingers[i];
						}
					}
				}
				 */
				//logPre2.innerHTML = JSON.stringify(finger, null, 2) + '\n';
				//console.log(finger);
				var fpos = finger.stabilizedTipPosition;
				var z = finger.tipPosition[2]*5;
				vec3.add(fpos, vec3.scale(finger.direction, 0));
				pointer.position[0] = window.innerWidth/2+fpos[0]*3.5;
				pointer.position[1] = window.innerHeight+500-fpos[1]*3.5;
				pointer.update();
				var op = {t: Date.now(), pos: [pointer.position[0], pointer.position[1], z]};
				oldPositions.push(op);
				if (oldPositions.length > 200) {
					oldPositions.splice(0, 100);
				}
				var tapped = false;
				var gesture = false;
				if (e.gestures.length > 0) {
					e.gestures.forEach(function(g) {
						if (g.type === 'keyTap') {
							tapped = true;
							gesture = true;
						}
					});
				}
				if (spaceDown) {
					tapped = true;
					spaceDown = false;
				}
				var discardTarget = false;
				if (tapped) {
					if (gesture) {
						var t = Date.now();
						for (var i=0; i<oldPositions.length; i++) {
							op = oldPositions[i];
							if (t-op.t < 500) {
								break;
							}
						}
					}
					if (target) {
						discardTarget = true;
						pointer.setBg('lime');
					} else {
						target = findTarget(op.pos[0], op.pos[1]);
						if (target) {
							rotationTarget = target;
							pointer.setBg('red');
							targetGrabZ = op.pos[2];
							targetOrigZ = target.position[2];
							targetGrabPoint = vec3.sub(target.position, op.pos, vec3.create());
						}
					}
				}
				if (target) {
					var tz = targetOrigZ + (op.pos[2]-targetGrabZ);
					var d = vec3.create();
					vec3.add(op.pos, targetGrabPoint, d);
					var sc = 1; //Math.pow(2, d[2]);
					var ox = target.position[0];
					var oy = target.position[1];
					var oz = target.position[2];
					vec3.scale(d, sc, target.position);
					if (xLock) target.position[0] = ox;
					if (yLock) target.position[1] = oy;
					target.position[2] = zLock ? oz : tz;
					target.update();
					if (discardTarget) {
						target = null;
					}
				}
			} else {
				fingerId = null;
				if (!target) {
					target = null;
					pointer.setBg('transparent');
				}
			}

		}

		/* Grab and drag */
		/*
		 if (e.fingers.length < 2) {
		 if (handIn && false && (grabbing || (
		 ( Math.abs(handPos[0]) < 200 && Math.abs(handPos[1]) < 300 && Math.abs(handPos[2]) < 200 )  &&
		 ( vec3.length(handVel) < 100 )))
		 ) {
		 grabbing = true;
		 if (startPos === null) {
		 startPos = handPos;
		 }
		 var delta = vec3.sub(handPos, startPos, []);
		 delta[1] *= -1;
		 vec3.add(tra.position, vec3.scale(delta, 2));
		 tra.className = 'grabbed';
		 tra.update();
		 startPos = handPos;
		 }
		 } else {
		 tra.className = '';
		 handIn = true;
		 grabbing = false;
		 startPos = null;
		 }
		 */
		//logPre2.innerHTML += [].join.call(tra.position, '\n')+'\n'+grabbing;
	} else {
		pointer.setBg('transparent');
		grabbing = false;
		handIn = false;
		startPos = null;
		//logPre2.innerHTML = '[]\n'+grabbing;
	}
});

controller.connect();

var socket = io.connect(document.location.origin);
var degToRad = Math.PI/180;
var oX,oY,oZ;
var rotX,rotY,rotZ;
oX=oY=oZ=rotX=rotY=rotZ=0;

var selected = false;

socket.on('input', function (data) {
	if (!rotationTarget) {
		return;
	}
	var sca = rotationTarget.firstChild.firstChild;
	var rot = rotationTarget.firstChild;
	var tra = rotationTarget;

	if (data.type === 'select') {
		selected = !selected;
		//rot.className = selected ? 'selected' : '';
		if (!selected) {
			//oX = rotX;
			//oY = rotY;
			//oZ = rotZ;
		}
	}

	if (selected) {

		if (data.type === 'orientation') {
			//logPre.innerHTML = (data.alpha +'\n'+ data.gamma +'\n'+ data.beta);
			rotZ = oZ + -(data.alpha);
			rotY = oY + (data.gamma);
			rotX = oX + -(data.beta);
			E.css(rot, 'transform',
				  'rotateX(90deg) '+
				  'rotateZ('+rotZ+'deg) '+
				  'rotateX('+rotX+'deg) '+
				  'rotateY('+rotY+'deg) '+
				  ''
				 );
		} else if (data.type === 'motion') {
			//my.position[0] = data.position.x*500;
			//my.position[1] = -data.position.y*500;
			//my.position[2] = -data.position.z*500;
			//my.update();
			//logPre2.innerHTML = JSON.stringify(data, null, 2);
		} else {
			if (data.scale) {
				sca.scale[0] = sca.scale[1] = sca.scale[2] = data.scale;
			}
			if (data.rotation != null) {
				// Pinch rotation is too much, device rotation nicer.
				// However, this could be useful for precise adjustments.
				//sca.rotation[2] = data.rotation*degToRad;
			}
			sca.update();
			//logPre2.innerHTML = JSON.stringify(data, null, 2);
		}
	}
});

var key = Math.floor(Math.random()*10000000+Date.now()).toString(26).slice(-4).replace(/[0-9]/g, function(m) { return String.fromCharCode('z'.charCodeAt(0)-(9-m)); });
socket.emit('listener', {key: key});

document.body.append(
	E(
		'#help', 
		E.H3('Mouse'),
		E.P('Drag to move'),
		E.P('Scroll to move on the z-axis'),
		E.H3('Leap Motion'),
		E.P('Point with one finger to get a green dot cursor.'),
		E.P('Hit SPACE or do a key tap gesture with the finger to pick an object. Repeat to release.'),
		E.P('Press Z to lock movement on the z-axis.'),
		E.P('Press X to lock movement on the x-axis.'),
		E.P('Press C to lock movement on the y-axis.'),
		E.H3('Virtual Object'),
		E.P('Go to '+document.location.origin+'/c on your iPhone.'),
		E.P('Enter this controller key: ', E.STRONG(key)),
		E.P('Click or pick an object.'),
		E.P('Now tap the phone.'),
		E.P('The object rotates with the phone.'),
		E.P('Pinching the phone scales the object.'),
		E.P('Tap the phone again to lock the scale and rotation.')
	)
);

var world = E.D3();
world.setSz(window.innerWidth, window.innerHeight);
world.setPerspective(1600);
document.body.append(world);

var root = E.D3();
world.append(root);
root.position[0] = window.innerWidth/2;
root.position[1] = window.innerHeight/2;
root.update();

var pointer = E.D3();
pointer.setSz(10, 10);
pointer.style.borderRadius = '50%';
pointer.position[2] = 0;
pointer.style.zIndex = 100000;
pointer.style.pointerEvents = 'none';
pointer.setBg('transparent');
pointer.update();
document.body.append(pointer);

var createImg = function(src1, src2, x, y) {

	var sca = E.D3();

	var front = E.D3(E.loadImage(src1, function() {
		this.parentNode.position[0] = -this.width/2;
		this.parentNode.position[1] = -this.height/2;
		this.parentNode.update();
	}));
	front.scale[0] = front.scale[1] = front.scale[2] = 0.25;
	front.update();
	sca.append(front);

	if (src2) {
		var back = E.D3(E.loadImage(src2, function() {
			this.parentNode.position[0] = -this.width/2;
			this.parentNode.position[1] = -this.height/2;
			this.parentNode.update();
		}));
		back.position[2] = -1;
		back.rotation[1] = Math.PI;
		back.scale[0] = back.scale[1] = back.scale[2] = 0.25;
		back.update();
		sca.append(back);
	}

	var rot = E.D3();
	rot.append(sca);
	rot.update();

	var tra = E.D3();
	tra.append(rot);
	tra.position[0] = x;
	tra.position[1] = y;
	tra.update();

	return tra;
};

var images = [
	"http://farm3.staticflickr.com/2053/3672460801_e4a4d47ddb_b.jpg",
	"http://farm4.staticflickr.com/3318/3673272846_763557cb75_b.jpg",
	"http://farm4.staticflickr.com/3057/2674123085_bff578d97b_b.jpg",
	"http://farm4.staticflickr.com/3237/2674886402_0d65b413b9_b.jpg",
	"http://farm8.staticflickr.com/7243/7316443544_3e87c84d25_b.jpg"
];

for (var i=0; i<images.length; i++) {
	var src = images[i];
	root.append(createImg(src, null, -500+(i%3)*350, -200+Math.floor(i/3) * 250));
}

