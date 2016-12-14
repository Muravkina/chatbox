var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    path = require('path'),
    webpack = require('webpack'),
    webpackDevMiddleware = require('webpack-dev-middleware');
    config = require('./webpack.config'),
    compiler = webpack(config),
    users = {}

//I'm using express/webpack/babel combo. Babel transpiles ES6 code into standard ES5 that can run in older JavaScript environments; Webpack and the Webpack development server for serving bundled application; Express, oh well, because it's easier to set it all up with express
app.use(webpackDevMiddleware(compiler, { noInfo: true, publicPath: config.output.publicPath }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});


//person connects right after the page has loaded, he is then asked to join the chat, he doesn't see the message untill he joins, but all conversation that's been happening ater the page has loaded will be shown in his chat
io.on('connection', function(socket){
  //when the user joins the chatroom:
  socket.on('join', function(name) {
    //save user to users array
    users[socket.id] = name
    //send info about the user and all users currently present in a chatroom
    socket.emit('join', {newUser: name, users: users});
    //send to everyone else but the sender the name of the new user to display a message that new user has joined the chat
    socket.broadcast.emit("meetNewUser", {newUser: name});
    //send to everyone else but the sender the name of the new user and his id to update the current list of users
    socket.broadcast.emit('updateUserList', {name: name, id: socket.id});
  })
  //when the user sends the message
	socket.on('chatMessage', function(data) {
    //send that message and the name of the sender to everyone
		io.emit('chatMessage', {message: data.message, user: users[socket.id]})
  })
  //when someone is typing
  socket.on('typing', function(data){
    //send to everyone else but the sender his/her name and boolean if he/her is typing or not
    socket.broadcast.emit("isTyping", {isTyping: data, user: users[socket.id]});
  })
  //when the user is leaving the chatroom, delete him form the user object and send his id to the client
  socket.on('disconnect', function() {
      delete users[socket.id]
      socket.broadcast.emit('delete', {id: socket.id})
  })
});


http.listen(3000, '192.168.0.8', function(error){
  if (error) {
    console.error(error);
  } else {
    console.info("Listening on port 3000");
  }
});
