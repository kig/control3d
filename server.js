var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs');

io.debug = false;
io.set('log level', 1);
io.set("transports", ["xhr-polling"]);
io.set("polling duration", 10); 

app.listen(8800);

function handler (req, res) {
	var path = '/index.html';
	if (req.url === '/script.js' || req.url === '/control.js') {
		path = req.url;
	}
	if (req.url === '/c') {
		path = '/control.html';
	}
	fs.readFile(__dirname + path,
				function (err, data) {
					if (err) {
						res.writeHead(500);
						return res.end('Error loading index.html');
					}
					res.writeHead(200, {'Content-Type': /\.js$/i.test(path) ? 'application/javascript' : 'text/html'});
					return res.end(data);
				});
}

var controllers = [];
var listeners = {};

io.sockets.on('connection', function (socket) {
	socket.on('controller', function (data) {
		console.log('got new controller', socket.id);
		data.key = data.key.toLowerCase();
		controllers.push(socket);
		socket.key = data.key;
		socket.isController = true;
	});
	socket.on('listener', function (data) {
		console.log('got new listener', socket.id);
		data.key = data.key.toLowerCase();
		listeners[data.key] = listeners[data.key] || [];
		listeners[data.key].push(socket);
		socket.key = data.key;
		socket.isListener = true;
	});
	socket.on('input', function(data) {
		if (socket.isController) {
			// console.log('input', data);
			(listeners[socket.key] || []).forEach(function(l) {
				l.emit('input', data);
			});
		}
	});
	socket.on('disconnect', function() {
		console.log('disconnected', socket.id);
		var cidx = controllers.indexOf(socket);
		if (cidx > -1) {
			controllers.splice(cidx, 1);
		}
		if (socket.isListener) {
			var l = listeners[socket.key];
			var lidx = l ? l.indexOf(socket) : -1;
			if (lidx > -1) {
				l.splice(lidx, 1);
			}
		}
	});
});