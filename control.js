var socket = io.connect(document.location.origin);

var connected = false;

var query = {};
String(document.location.search).slice(1).split("&").map(function(kvs) {
	if (kvs.length > 0) {
		var kv = kvs.split("=").map(decodeURIComponent);
		query[kv[0]] = kv[1];
	}
});
var key = query.key || prompt("Please enter the controller key");

socket.on('connect', function() {
	connected = true;
	socket.emit('controller', {key: key});
	document.body.style.border = '4px solid green';
	document.getElementById('status').innerHTML = 'Connected';
});

socket.on('disconnect', function() {
	connected = false;
	document.body.style.border = '0';
	document.getElementById('status').innerHTML = 'Disconnected';
	socket.socket.connect();
});

var vx,vy,vz,px,py,pz;
vx=vy=vz=px=py=pz=0;

window.addEventListener('devicemotion', function(ev) {
	var t = ev.interval;
	var ax = ev.acceleration.x;
	var ay = ev.acceleration.y;
	var az = ev.acceleration.z;
	vx = 0.95*(vx+ax*t);
	vy = 0.95*(vy+ay*t);
	vz = 0.95*(vz+az*t);
	px = 0.95*(px+vx*t);
	py = 0.95*(py+vy*t);
	pz = 0.95*(pz+vz*t);
	socket.emit('input', {
		type: 'motion',
		velocity: {x: vx, y: vy, z: vz},
		position: {x: px, y: py, z: pz},
		acceleration: ev.acceleration,
		accelerationIncludingGravity: ev.accelerationIncludingGravity,
		rotationRate: ev.rotationRate,
		interval: ev.interval
	});
}, false);

window.addEventListener('deviceorientation', function(ev) {
	socket.emit('input', {
		type: 'orientation',
		alpha: ev.alpha,
		beta: ev.beta,
		gamma: ev.gamma
	});
}, false);

var scale = 1;
var rotation = 0;


window.addEventListener('scroll', function(e) {
	e.preventDefault();
}, false);

var inGesture = false;

window.addEventListener('touchend', function(e) {
	e.preventDefault();
	if (e.touches.length === 0) {
		if (inGesture) {
			inGesture = false;
		} else {
			if (connected) {
				socket.emit('input', {type: 'select'});
			} else {
				socket.socket.connect();
			}
		}
	}
}, false);

window.addEventListener('gesturestart', function(e) {
	inGesture = true;
}, false);

window.addEventListener('gestureend', function(e) {
	e.preventDefault();
	scale *= e.scale;
	rotation += e.rotation;
	socket.emit('input', {type: 'gesture', scale: scale, rotation: rotation});
}, false);

window.addEventListener('gesturechange', function(e) {
	e.preventDefault();
	socket.emit('input', {type: 'gesture', scale: scale*e.scale, rotation: rotation+e.rotation});
}, false);

