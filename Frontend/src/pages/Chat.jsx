import React, { useContext, useEffect, useRef, useState } from "react";
import { Avatar, Logo, Input, Contacts } from "../components";
import { UserContext } from "../components/UserContext";
import { uniqBy } from "lodash"
import axios from "axios";

function Chat() {
  const [ws, setWs] = useState(null);
  const [onlineUser, setOnlineUser] = useState({});
  const [offlineUser, setOfflineUser] = useState({})
  const [selectedUserId, setSelectedUserId] = useState();
  const divUnderMessages = useRef();
  // const [onlineUsersExclLoggedInUsers, setOnlineUsersExclLoggedInUsers] = useState({});

  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);

  const { username, id } = useContext(UserContext);
  // console.log(username);

  //? for connection
  function connectToWs () {
    const newWs = new WebSocket("ws://localhost:5000");
    setWs(newWs);
    newWs.addEventListener("message", handleMessage);
    newWs.addEventListener("close", () => {
      setTimeout(() => {
        console.log("Disconnected..... Please wait while we reconnect.")
        connectToWs();
      }, 1000)
    })
  }

  useEffect(() => {
    connectToWs();
  }, []);
  

  function showOnlineUsers(usersArray) {
    const onlineUsers = {};
    usersArray.forEach(({ userId, username }) => {
      onlineUsers[userId] = username;
    });
    // console.log("Online User : ",onlineUsers)
    setOnlineUser(onlineUsers);
  }

  //* to handle the message received from the server
  function handleMessage(ev) {
    const messageData = JSON.parse(ev.data);
    console.log(ev, messageData)
    if ("onlineUsers" in messageData) {
      showOnlineUsers(messageData.onlineUsers);
    } else if ('text' in messageData){
      console.log("Received message :: ",messageData);
      setMessages(prev => [...prev, {
        ...messageData
      }]);
    }
  }
  
  const token = localStorage.getItem("token") || null;
  const config = {
    headers: { "Authorization": token },
  }
  //? ---- Messaging part------

  function sendMessage(e, file = null) {
    try {
      if (e) e.preventDefault();
      ws.send(JSON.stringify({
        messageData: {
          author: username,
          receiver: selectedUserId,
          text: newMessageText,
          file
        }
      }))
      setNewMessageText('')
      setMessages(prev => [...prev, {
        text: newMessageText,
        sender: id,
        receiver: selectedUserId
      }])
      if(file) {
        axios.get('http://localhost:5000/api/v2/messages/' + selectedUserId, config).then(res => {
          setMessages(res.data)
        })
      }
      console.log("sending message....");
      // console.log("sent message :: ", {messages})
    } catch (error) {
      console.log("sendMessage ERROR :: ", error)
    }
  }

  function sendFile(e) {
    // console.log(e.target.files[0])
    const reader = new FileReader();
    reader.readAsDataURL(e.target.files[0]);
    reader.onload = () => {
      sendMessage(null, {
        name: e.target.files[0].name,
        data: reader.result,
      })
    }
  }


  useEffect(() => {
    axios.get('http://localhost:5000/api/v1/users')
    .then(response => {
      // console.log(response.data)
      const allUsers = response.data;
      const offlineUsersArray = allUsers.filter(user => user._id !== id).filter(user => !Object.keys(onlineUser).includes(user._id));
      const offlineUsers = {};
      offlineUsersArray.forEach(user => {
        offlineUsers[user._id] = user
      })
      setOfflineUser(offlineUsers);
    });
  }, [onlineUser])

  useEffect(() => {
    if (selectedUserId) {
      axios.get('http://localhost:5000/api/v2/messages/' + selectedUserId, config)
      .then(response => {
        setMessages(response.data)
        console.log("this data is from the messages endpoint -> ",response.data)
      })
    }
  }, [selectedUserId])

  useEffect(() => {
    const div = divUnderMessages.current;
    if (div) {
      div.scrollIntoView({behavior: 'smooth', block: 'end'});
    }
  }, [messages])

  const onlineUsersExcludingLoggedInUser = { ...onlineUser };
  delete onlineUsersExcludingLoggedInUser[id];

  const messagesWithoutDupes = uniqBy(messages, '_id');
  // console.log("Message without dupes : ", messagesWithoutDupes)

  return (
    <>
    {/* overall div */}
      <div className="flex h-screen">

        {/* left panel */}
        <div className="p-4  bg-slate-400 w-1/3 flex flex-col">
          <div className=" flex-grow">
            <Logo />
            {/* contacts display */}
            <div className=" mt-6">
              {/* looping through all the online users */}
              {Object.keys(onlineUsersExcludingLoggedInUser).map((userId) => (
                // <Contacts 
                //   key={userId}
                //   id={userId}
                //   onClick={() => {setSelectedUserId[userId];console.log(userId)}}
                //   username={onlineUsersExcludingLoggedInUser[userId]}
                //   online={true}
                //   selected={userId === selectedUserId} />
                <div key={userId} onClick={() => setSelectedUserId(userId)} className={"border-b border-t flex flex-grow border-gray-500 cursor-pointer " + 
                (userId === selectedUserId ? " bg-gray-700 shadow-xl" : "") }>
                  {/* this is for the bar */}
                  {userId === selectedUserId && (
                    <div className=" w-1.5 h-15 bg-slate-200 rounded-r-xl opacity-30 "></div>
                  )}
                  {/* this is for the profile pic or Avatar */}
                  <div className="flex items-center gap-2 py-4 pl-4">
                    <Avatar
                      userName={onlineUsersExcludingLoggedInUser[userId]}
                      online={true}
                    />
                    {/* this is for displaying the name */}
                    <span className={"text-gray-900 font-semibold " + (userId === selectedUserId ? "text-white" : "")}>
                      {onlineUsersExcludingLoggedInUser[userId]}
                    </span>
                  </div>
                </div>
              ))}
              {/* looping through all the offline users */}
              {Object.keys(offlineUser).map((userId) => (
                // <Contacts 
                //   key={userId}
                //   id={userId}
                //   onClick={() => setSelectedUserId[userId]}
                //   username={offlineUser[userId]?.username}
                //   online={false}
                //   selected={userId === selectedUserId} />
                <div key={userId} onClick={() => setSelectedUserId(userId)} className={"border-b border-t flex flex-grow border-gray-500 cursor-pointer " + 
                (userId === selectedUserId ? " bg-gray-700 shadow-xl" : "") }>

                  {userId === selectedUserId && (
                    <div className=" w-1.5 h-15 bg-slate-200 rounded-r-xl opacity-30 "></div>
                  )}
                  <div className="flex items-center gap-2 py-4 pl-4">
                    <Avatar
                      userName={offlineUser[userId].username}
                      online={false}
                    />
                    <span
                      className={
                        "text-gray-900 font-semibold " +
                        (userId === selectedUserId ? "text-white" : "")
                      }
                      >
                      {offlineUser[userId]?.username}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* User information */}
          <div className="text-center flex items-center p-2 cursor-pointer">
            <span className="text-slate-900 flex font-bold items-center"> 
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                <path fill-rule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clip-rule="evenodd" />
              </svg>
              <span className="ml-2">{username}</span> {/* Adjust spacing with ml-2 */}
            </span>
          </div>

        </div>

        {/* right panel */}
        <div className="bg-slate-900 text-gray-200 flex flex-col w-2/3">
          <div className="flex-grow">
          {!selectedUserId && (
            <div className="flex h-full flex-grow items-center justify-center">
              <div className="text-gray-300">&larr; Select a user from the sidebar</div>
            </div>
          )}
            {!!selectedUserId && (
              <div className=" relative h-full">
                <div 
                className="overflow-y-scroll  absolute inset-0 mt-2" 
                style={{ WebkitOverflowScrolling: 'touch' }} >
                  {messagesWithoutDupes.map((message, index) =>  (
                    // console.log("sent message", message)
                    <div key={index} className={"p-1 mx-3 " + (message.sender === id ? 'text-right' : 'text-left')}>
                      <div className="text-left bg-slate-700 inline-block max-w-96 p-3 m-3 rounded-2xl" >
                        {message.text}
                        {message.file && (
                          <div className="">
                            <a target="_blank" className="flex items-center gap-1  border-b" href={"http://localhost:5000/uploads/" + message.file}>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                              </svg>
                              {message.file}
                            </a>
                          </div>
                        )} 
                      </div>
                    </div>
                  ))}
                  <div ref={divUnderMessages}></div>
                </div>
              </div>
            )}
          </div>
          
          {selectedUserId && (
            <form className=" flex p-2 mb-2" onSubmit={sendMessage}>
              <input
                value={newMessageText}
                type="text"
                placeholder="Type your message here"
                onChange={(e) => setNewMessageText(e.target.value)}
                className="flex-grow mr-2 rounded-xl shadow-md border-white text-slate-900 p-3 font-medium hover:border-gray-600"
              />
              {/* attachment section */}
              <label className=" shadow-md text-white  cursor-pointer font-semibold p-3 px-4 rounded-xl">
                <input type="file" className="hidden" onChange={sendFile}/>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
                    <path fill-rule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z" clip-rule="evenodd" />
                </svg>
              </label>
              {/* send button */}
              <button
                  type="Submit"
                  className="bg-sky-500 shadow-md hover:bg-sky-600 text-white font-semibold p-3 px-4 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

export default Chat;
