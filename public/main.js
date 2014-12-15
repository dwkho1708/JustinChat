$(function() {
	var FADE_TIME = 150; // ms
	var TYPING_TIMER_LENGTH = 400; // ms
	var COLORS = [ '#e21400', '#91580f', '#f8a700', '#f78b00', '#58dc00',
			'#287b00', '#a8f07a', '#4ae8c4', '#3b88eb', '#3824aa', '#a700ff',
			'#d300e7' ];

	// Initialize varibles
	var $window = $(window);
	var $document = $(document);
	var $usernameInput = $('.usernameInput'); // Input for username
	var $messages = $('.messages'); // Messages area
	var $inputMessage = $('.inputMessage'); // Input message input box

	var $loginPage = $('.login.page'); // The login page
	var $chatPage = $('.chat.page'); // The chatroom page

	// Prompt for setting a username
	var username;
	var connected = false;
	var typing = false;
	var lastTypingTime;
	var $currentInput = $usernameInput.focus();
	var isMe = false;

	var isFocus = true;
	$(document)
			.ready(
					function() {
						(function() {
							var hidden = "hidden";
							// Standards:

							if (hidden in document) {
								document.addEventListener("visibilitychange",
										onchange);

								window.onfocus = function() {
									isFocus = true;
								};
								window.onblur = function() {
									isFocus = false
								};

							} else if ((hidden = "mozHidden") in document)
								document.addEventListener(
										"mozvisibilitychange", onchange);
							else if ((hidden = "webkitHidden") in document)
								document.addEventListener(
										"webkitvisibilitychange", onchange);
							else if ((hidden = "msHidden") in document)
								document.addEventListener("msvisibilitychange",
										onchange);
							// IE 9 and lower:
							else if ("onfocusin" in document)
								document.onfocusin = document.onfocusout = onchange;
							// All others:
							else
								window.onpageshow = window.onpagehide = window.onfocus = window.onblur = onchange;

							function onchange(evt) {
								var v = "visible", h = "hidden", evtMap = {
									focus : v,
									focusin : v,
									pageshow : v,
									blur : h,
									focusout : h,
									pagehide : h
								};

								evt = evt || window.event;

								if (evt.type in evtMap) {
									document.body.className = evtMap[evt.type];
								} else {
									document.body.className = this[hidden] ? "hidden"
											: "visible";
								}
							}

							// set the initial state (but only if browser
							// supports the Page Visibility API)
							if (document[hidden] !== undefined)
								onchange({
									type : document[hidden] ? "blur" : "focus"
								});
						})();
					});

	var notification = null;
	function notifyMe(data) {
		var parameter_noti = {
			title : "[BIOK] Message arrived.",
			icon : "http://168.154.30.34/img/chat.jpg",
			body : data.username + " : " + data.message
		};
		if (Notification.permission === "granted") {
			if (notification != null) {
				notification.close();
			}

			notification = new Notification(parameter_noti.title, {
				icon : parameter_noti.icon,
				body : parameter_noti.body
			});
		} else if (Notification.permission !== 'denied') {
			Notification.requestPermission(function(permission) {
				if (!('permission' in Notification)) {
					Notification.permission = permission;
				}

				if (permission === "granted") {
					notification = new Notification(parameter_noti.title, {
						icon : parameter_noti.icon,
						body : parameter_noti.body
					});
				}
			});
		}
	}

	var socket = io();

	function addParticipantsMessage(data) {
		var message = '';

		if (data.numUsers === 1) {
			message += "there's 1 participant";
		} else {
			message += "there are " + data.numUsers + " participants";
		}

		log(message);
	}

	// Sets the client's username
	function setUsername() {
		username = cleanInput($usernameInput.val().trim());

		// If the username is valid
		if (username) {
			$loginPage.fadeOut();
			$chatPage.show();
			$loginPage.off('click');
			$currentInput = $inputMessage.focus();

			// Tell the server your username
			socket.emit('add user', username);
		}
	}

	// Sends a chat message
	function sendMessage() {
		var message = $inputMessage.val();
		// Prevent markup from being injected into the message
		message = cleanInput(message);
		// if there is a non-empty message and a socket connection
		if (message && connected) {
			$inputMessage.val('');

			// tell server to execute 'new message' and send along one parameter
			socket.emit('new message', message);
		}
	}

	// Log a message
	function log(message, options) {
		var $el = $('<li>').addClass('log').text(message);
		addMessageElement($el, options);
	}

	// Adds the visual chat message to the message list
	function addChatMessage(data, options) {
		// Don't fade the message in if there is an 'X was typing'
		var $typingMessages = getTypingMessages(data);
		options = options || {};
		if ($typingMessages.length !== 0) {
			options.fade = false;
			$typingMessages.remove();
		}

		var $timestampDiv = $('<span class="timestamp"/>').text(data.timestamp);
		var $usernameDiv = $('<span class="username"/>').text(data.username)
				.css('color', getUsernameColor(data.username));
		var $messageBodyDiv = $('<span class="messageBody">')
				.text(data.message);

		var typingClass = data.typing ? 'typing' : '';
		var $messageDiv = $('<li class="message"/>').data('username',
				data.username).addClass(typingClass).append($timestampDiv,
				$usernameDiv, $messageBodyDiv);

		addMessageElement($messageDiv, options);
	}

	// Adds the visual chat typing message
	function addChatTyping(data) {
		data.typing = true;
		data.message = 'is typing';
		addChatMessage(data);
	}

	// Removes the visual chat typing message
	function removeChatTyping(data) {
		getTypingMessages(data).fadeOut(function() {
			$(this).remove();
		});
	}

	// Adds a message element to the messages and scrolls to the bottom
	// el - The element to add as a message
	// options.fade - If the element should fade-in (default = true)
	// options.prepend - If the element should prepend
	// all other messages (default = false)
	function addMessageElement(el, options) {
		var $el = $(el);

		// Setup default options
		if (!options) {
			options = {};
		}
		if (typeof options.fade === 'undefined') {
			options.fade = true;
		}
		if (typeof options.prepend === 'undefined') {
			options.prepend = false;
		}

		// Apply options
		if (options.fade) {
			$el.hide().fadeIn(FADE_TIME);
		}
		if (options.prepend) {
			$messages.prepend($el);
		} else {
			$messages.append($el);
		}
		$messages[0].scrollTop = $messages[0].scrollHeight;
	}

	// Prevents input from having injected markup
	function cleanInput(input) {
		return $('<div/>').text(input).text();
	}

	// Updates the typing event
	function updateTyping() {
		if (connected) {
			if (!typing) {
				typing = true;
				socket.emit('typing');
			}
			lastTypingTime = (new Date()).getTime();

			setTimeout(function() {
				var typingTimer = (new Date()).getTime();
				var timeDiff = typingTimer - lastTypingTime;
				if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
					socket.emit('stop typing');
					typing = false;
				}
			}, TYPING_TIMER_LENGTH);
		}
	}

	// Gets the 'X is typing' messages of a user
	function getTypingMessages(data) {
		return $('.typing.message').filter(function(i) {
			return $(this).data('username') === data.username;
		});
	}

	// Gets the color of a username through our hash function
	function getUsernameColor(username) {
		// Compute hash code
		var hash = 7;
		for (var i = 0; i < username.length; i++) {
			hash = username.charCodeAt(i) + (hash << 5) - hash;
		}
		// Calculate color
		var index = Math.abs(hash % COLORS.length);
		return COLORS[index];
	}

	// Keyboard events

	$window.keydown(function(event) {
		// Auto-focus the current input when a key is typed
		if (!(event.ctrlKey || event.metaKey || event.altKey)) {
			$currentInput.focus();
		}
		// When the client hits ENTER on their keyboard
		if (event.which === 13) {
			if (username) {
				sendMessage();
				socket.emit('stop typing');
				typing = false;
			} else {
				setUsername();
			}
		}
	});

	$inputMessage.on('input', function() {
		updateTyping();
	});

	// Click events

	// Focus input when clicking anywhere on login page
	$loginPage.click(function() {
		$currentInput.focus();
	});

	// Focus input when clicking on the message input's border
	$inputMessage.click(function() {
		$inputMessage.focus();
	});

	// Socket events

	// Whenever the server emits 'login', log the login message
	socket.on('login', function(data) {
		connected = true;
		// Display the welcome message
		var message = "Wecome. Current Users : ";
		var userlist = data.usernames;

		for (val in userlist) {
			message += val + ", ";
		}
		message = message.substring(0, message.length - 2);
		log(message, {
			prepend : true
		});
		addParticipantsMessage(data);
	});

	// Whenever the server emits 'new message', update the chat body
	socket.on('new message', function(data) {
		if (isFocus !== true)
			notifyMe(data);
		addChatMessage(data);
	});

	// Whenever the server emits 'user joined', log it in the chat body
	socket.on('user joined', function(data) {
		log(data.username + ' joined');
		addParticipantsMessage(data);
	});

	// Whenever the server emits 'user left', log it in the chat body
	socket.on('user left', function(data) {
		log(data.username + ' left');
		addParticipantsMessage(data);
		removeChatTyping(data);
	});

	// Whenever the server emits 'typing', show the typing message
	socket.on('typing', function(data) {
		addChatTyping(data);
	});

	// Whenever the server emits 'stop typing', kill the typing message
	socket.on('stop typing', function(data) {
		removeChatTyping(data);
	});

	// File transfer
	var delivery = new Delivery(socket);

	delivery.on('delivery.connect', function(delivery) {
		$("input[type=submit]").click(function(evt) {
			var file = $("input[type=file]")[0].files[0];
			delivery.send(file);
			evt.preventDefault();
		});
	});

	delivery.on('send.success', function(fileUID) {
		console.log("file was successfully sent.");
	});

});
