import React, { Component } from 'react';
import {render, findDOMNode} from 'react-dom';


class ChatContainer extends Component {
	constructor(){
    // this is uninitialized if super() is not called
    super();
    this.state = {
        messages: [],
        users: [],
        wantsToJoin: false,
        isTyping: false,
        userTyping: ''
    }

    this.timeout;
    this.welcomeNewUser = this.welcomeNewUser.bind(this);
    this.createUserList = this.createUserList.bind(this);
    this.meetNewUsers = this.meetNewUsers.bind(this);
    this.updateUsers = this.updateUsers.bind(this);
    this.deleteUser = this.deleteUser.bind(this);
    this.receiveMessage = this.receiveMessage.bind(this);
    this.userIsTyping = this.userIsTyping.bind(this);
    this.timeoutFunction = this.timeoutFunction.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  componentDidMount() {
    // listen to messages from the server and responce appropriately
    socket.on('join', this.welcomeNewUser);
    socket.on('meetNewUser', this.meetNewUsers);
    socket.on('chatMessage', this.receiveMessage);
    socket.on('isTyping', this.userIsTyping);
    socket.on('updateUserList', this.updateUsers);
    socket.on('delete', this.deleteUser);
  }

  //display a welcome message specifically to the person who just joined the chat
  welcomeNewUser(data) {
    //assign state to a variable so that we don't mutate the state directly (guarantees synchronous operation of calls )
    var messages = this.state.messages;

    messages.push({
      user: null,
      message: `Welcome to the chat, ${data.newUser}!`});

    // also setting 'wantsToJoin' to true in order to  hide the introduction and show the chatroom
    this.setState({
      messages: messages,
      wantsToJoin: true
    })

    this.createUserList(data);
  }

  //create a user list currently present in the chatroom
  createUserList(data) {
    var users = [];
    // iterate over received user object from the server and push the names to a new array
    for(let id in data.users) {
      users.push({
        id: id,
        name: data.users[id]
      })
    }
    // change the state in order to display all users currently present in a chatroom
    this.setState({
      users: users
    })
  }

  //display a message to the rest of the chatroom that new user has joined discussion
  meetNewUsers(data){
    var messages = this.state.messages;
    messages.push({
      user: null,
      message: `${data.newUser} has joined the chat`});
    this.setState({
      messages: messages
    });
  }

  //add new user to the users array in order to display all users currently present in a chatroom
  updateUsers(data){
    var users = this.state.users;
    users.push({
      id: data.id,
      name: data.name
    });
    this.setState({
      users: users
    })
  }

  //delete a person who got disconnected from the user list
  deleteUser(data){
    var users = this.state.users;
    //find the postition of the user in the user array
    var userIndex = users.indexOf(data.id)
    //delete that index
    users.splice(userIndex, 1)
    //update state
    this.setState({
      users: users
    })
  }

  //receive messages from the server and change the state to display the messages in the chatroom
  receiveMessage(data) {
    var messages = this.state.messages;
    messages.push({
      user: data.user,
      message:data.message
    });

    this.setState({
      messages: messages
    })

    //since we just received the message, the user is no longer typing - so we clear timeout
    clearTimeout(this.timeout);
    this.timeout = setTimeout(this.timeoutFunction, 0);
  }

  //display when any user (but the sender) is typing
  userIsTyping(data) {
    //receive info from the server if user is typing at the moment
    if(data.isTyping) {
      //if he/she is typing setTimeout to send another request to the server in 2 sec to check if he/she is still typing
      clearTimeout(this.timeout);
      this.timeout = setTimeout(this.timeoutFunction, 2000);

      //change the state to show who and if he/she is typing at the moment
      this.setState({
        isTyping: true,
        userTyping: data.user
      })
    } else if (data.isTyping === false) {
      //if he/she is not typing set the state to false 
      this.setState({
        isTyping: false
      })
    }
  }

  //send  message to the server that the person is no longer typing
  timeoutFunction() {
    socket.emit("typing", {isTyping: false})
  }

  // if a user hits a key, a message is sent to the backend and a timeout starts
  handleKeyUp(event) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(this.timeoutFunction, 2000);
    socket.emit("typing", {isTyping: true});
  
  }

	render() {
		return(
			<div>
        {
        //If the user wants to join the chatroom, hide the introduction and display the chatroom. Could be done in another way, for instance with routes. I chose this method for simplicity
          this.state.wantsToJoin

          ?

          <div className="container">
  				  <ChatDisplay messages={this.state.messages} isTyping={this.state.isTyping} userTyping={this.state.userTyping} />
            <UserList users={this.state.users} />
            <MessageForm handleKeyUp={this.handleKeyUp} timeoutFunction={this.timeoutFunction} timeout={this.timeout}/>
          </div>

          :

          <JoinChat saveName={this.saveName} joinChat={this.joinChat}/>
        }
			</div>
		)
	}
}

class MessageForm extends Component {
  constructor(){
    super();

    this.state = {
      input: ''
    }

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);    
  }

  //change the state when the input has changed 
  handleChange(event){
    this.setState({
      input: event.target.value
    })
  }

  //send created message to the backend
  handleSubmit(event){
    socket.emit('chatMessage', {message: this.state.input});
    //clear the input
    this.setState({
      input: ''
    })
  }

  render(){
    return(
      <div className='messageForm'>
            <input type='text' value={this.state.input} onChange={this.handleChange} onKeyUp={this.props.handleKeyUp}/>
            <button disabled={!this.state.input} onClick={this.handleSubmit}>Send</button>
      </div>
    )
  }

}

//Introduction/inviatation to join the chatroom, and ask a user for his/her name
class JoinChat extends Component {

  constructor(){
    super();

    this.state = {
      input: ''
    }

    this.handleChange = this.handleChange.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  //change the state when the input has changed 
  handleChange(event) {
    this.setState({
      input: event.target.value
    })
  }

  //send info(the name of the user) to the backend
  handleClick() {
    socket.emit('join', this.state.input);
    //clear the input
    this.setState({
      input: ''
    })
  }

  render(){
    return (
      <div className='joinChat'>
        <p>Hello there, stranger! <br/> Join us in a chat room, and together we will rule the galaxy!</p>
        <input type='text' value={this.state.input} placeholder="Name" onChange={this.handleChange}/>
        <button onClick={this.handleClick} disabled={!this.state.input}>Join</button>
      </div>
    )
  }
}

//display everyone in chatroom
const UserList = function(props) {

  //iterate all users and display every single person in the chatroom
  return(
    <div className='userList'>
      <h1>Users:</h1>
      <ul>
        {
          props.users.map(function(user, i){
            //passing i in as a key is not considereted to be a good practice, because key property is for making sure that even if item is moved in an array to a different spot, React knows it’s the same element, but it's suffiecient enough for our purpose.
            return <li key={i}>{user.name}</li>
          })
        }
      </ul>
    </div>
  )
}

const ChatDisplay = function(props) {
  return(
    <div className="chatDisplay">
      {
        //Iterate over an array of messages and display the user and his message on a separate line
        props.messages.map(function(data, i) {
          return (
            <p className="chatMessage" key={i}>
              <span>{data.user}</span> {data.message}
            </p>
          )
        })
      // Display the message to other users if anyone is typing at the moment
      }
      <span className="isTyping">{ props.isTyping ? `${props.userTyping} is typing ` : null} </span>
    </div>
	)
}


render(<ChatContainer />, document.getElementById('root'));

