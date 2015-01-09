// Setup basic express server
var express = require('express');
var dateUtils = require('date-utils');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var dl = require('delivery');
var fs = require('fs');
var port = process.env.PORT || 8282;

server.listen(port, function() {
	console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom

// usernames which are currently connected to the chat
var usernames = {};
var numUsers = 0;

io.on('connection', function(socket) {
	var addedUser = false;

	// when the client emits 'new message', this listens and executes
	socket.on('new message', function(data) {
		// we tell the client to execute 'new message'
		var date = new Date();
		io.emit('new message', {
			timestamp : date.toFormat('HH24:MI:SS'),
			username : socket.username,
			message : data
		});
	});

	// when the client emits 'add user', this listens and executes
	socket.on('add user', function(username) {
		// we store the username in the socket session for this client
		socket.username = username;
		// add the client's username to the global list
		usernames[username] = username;
		++numUsers;
		addedUser = true;
		socket.emit('login', {
			usernames : usernames,
			numUsers : numUsers
		});

		// echo globally (all clients) that a person has connected
		socket.broadcast.emit('user joined', {
			username : socket.username,
			numUsers : numUsers
		});
	});

	// when the client emits 'typing', we broadcast it to others
	socket.on('typing', function() {
		socket.broadcast.emit('typing', {
			username : socket.username
		});
	});

	// when the client emits 'stop typing', we broadcast it to others
	socket.on('stop typing', function() {
		socket.broadcast.emit('stop typing', {
			username : socket.username
		});
	});

	// when the user disconnects.. perform this
	socket.on('disconnect', function() {
		// remove the username from global usernames list
		if (addedUser) {
			delete usernames[socket.username];
			--numUsers;

			// echo globally that this client has left
			socket.broadcast.emit('user left', {
				username : socket.username,
				numUsers : numUsers
			});
		}
	});
	
	var delivery = dl.listen(socket);
	var fileList = {};
	var fileDir = "./public/fileRepository/";
    delivery.on('receive.success',function(file){
	  
      fs.writeFile(fileDir+file.name,file.buffer, function(err){
        if(err){
          console.log('File could not be saved.');
        }else{
		  fileList[file.name] = fileDir+file.name;
          console.log('File saved.');
		  var date = new Date();
		  
		  io.emit('new file uploaded', {
			timestamp : date.toFormat('HH24:MI:SS'),
			username : socket.username,
			message : file.name + ' was uploaded.',
			filename : file.name,
			filepath : 'fileRepository/'+file.name
		  });
		}
      });
    });

 });
