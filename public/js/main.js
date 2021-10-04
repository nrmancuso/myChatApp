import {initializeApp} from 'https://www.gstatic.com/firebasejs/9.0.1/firebase-app.js';
import {
    getDatabase,
    onChildAdded,
    onChildChanged,
    push,
    ref,
    remove,
    set
} from 'https://www.gstatic.com/firebasejs/9.0.1/firebase-database.js';
// import version must be 9.0.1
import * as fbauth from "https://www.gstatic.com/firebasejs/9.0.1/firebase-auth.js";
/* Inspired by https://firebase.google.com/docs */
import * as htmlGenerator from "./htmlGenerator.js";
import * as chat from "./chat.js";

const firebaseConfig = {
    apiKey: "AIzaSyAdpaGbpdvZFS_J5BAPLVZxVW_vUlUVzbk",
    authDomain: "chat-app-233ed.firebaseapp.com",
    databaseURL: "https://chat-app-233ed-default-rtdb.firebaseio.com",
    projectId: "chat-app-233ed",
    storageBucket: "chat-app-233ed.appspot.com",
    messagingSenderId: "164333713364",
    appId: "1:164333713364:web:30280ad323df5e5c6a4841",
    measurementId: "G-HSB29G8SYD"
};

const app = initializeApp(firebaseConfig);
const allChannelsPrefix = "channels/";

const db = getDatabase();
const authorize = fbauth.getAuth(app);
console.log(authorize);
const allChannelsRef = ref(db, allChannelsPrefix);
let channelName = "general";
let channelRef = ref(db, allChannelsPrefix + channelName);

let user;

/** Initial setup */
// add event listener for channels list
onChildAdded(allChannelsRef, channel => addChannel(channel));

// add event listener for messages in current channel
onChildAdded(channelRef, data => addMessage(data));

onChildChanged(channelRef, data => {
    const { history, msg, ownerID, reactions,
        time, userDisplay, userPhotoURL, edited } = data.val();

    $("#" + data.key + "_posttime").replaceWith(time);
    $("#" + data.key + "_message_text").replaceWith(msg);
})


// let message = {
//     "msgIDHERE" : {
//         "history" : {
//             "uuid" : "adfsdff"
//         },
//         "msg" : "This is a message",
//         "ownerID" : "longID",
//         "reactions" : "later",
//         "time" : "mytime",
//         "userDisplay" : "nick"
//     }
// };

function getTime() {
    const date = new Date();
    return (date.getMonth() + 1) + "/"
        + date.getDate() + "/"
        + date.getFullYear() + " @ "
        + date.getHours() + ":"
        + date.getMinutes() + ":"
        + date.getSeconds();
}


function sendMessage() {
    const text = getInputText();

    console.log("in sendmsg");
    console.log(user);

    let message = {
        "history" : { },
        "msg" : text,
        "ownerID" : user.uid,
        "reactions" : "",
        "time" : getTime(),
        "userDisplay" : user.displayName,
        "userPhotoURL": user.photoURL,
        "edited": "no"
    };
    const newMessageRef = push(channelRef);
    set(newMessageRef, message);
    clearInputBox();
}

function getInputText() {
    const inputBox = document.getElementById("inputBox");
    return inputBox.value;
}

function clearInputBox() {
    const inputBox = document.getElementById("inputBox");
    inputBox.value = "";
    // TODO: clear input box
}

function addMessage(data) {
    const messageList = document.getElementById("messageList");
    const { history, msg, ownerID, reactions, time, userDisplay, userPhotoURL, edited } = data.val();
    const msgID = data.key;
    console.log(data.key);

    if (ownerID === user.uid) {
        // add pencil and x
        console.log("here");
        messageList.insertAdjacentHTML('beforeend',
            htmlGenerator.createMessageHTMLMyMessage(
                userPhotoURL, msg, userDisplay, time, msgID
            ));

        const messageEditButtonRef = $("#" + msgID + "_edit");
        messageEditButtonRef.on("click", e => {
            e.preventDefault();
            alert("Are you sure you want to edit this message?");
            const existingMessageText =  $("#" + msgID + "_message_text");
            $("#" + msgID + "_messages")
                .append(htmlGenerator.createEditBoxHTML(msgID, existingMessageText[0].innerText));
            existingMessageText.hide();
            $(document).on('keyup', function (e) {
                e.preventDefault();
                editMessage(e, msgID);
            });
        });

        const deleteButtonRef = $("#" + msgID + "_delete");
        deleteButtonRef.on("click", e => {
            e.preventDefault();
            alert("Are you sure you want to delete this message?");
            console.log(msgID);
            console.log(allChannelsPrefix + channelName + "/" + msgID);
            remove(ref(db, allChannelsPrefix + channelName + "/" + msgID));
            $("#" + msgID + "_message").remove();
        });
    }
    // else if () {
    //     // is admin, add x
    // }
    else {
        // normal user and not my message
        messageList.insertAdjacentHTML('beforeend',
            htmlGenerator.createMessageHTML(userPhotoURL, msg, userDisplay, time));
    }

    messageList.scrollTop = messageList.scrollHeight;
}

function editMessage(e, msgID) {
    const currentChannelAndMessagePath = allChannelsPrefix + channelName + "/" + msgID;
    const editBoxRef = $("#" + msgID + "_editBox");
    if (e.key === "Enter") {
        set(ref(db, currentChannelAndMessagePath + "/msg"), editBoxRef.val());
        set(ref(db, currentChannelAndMessagePath + "/edited"), "true");
        set(ref(db, currentChannelAndMessagePath + "/time"), getTime() + " edited");
        editBoxRef.hide();
    }
    if (e.key === "Escape") {
        editBoxRef.remove();
        $("#"+ msgID + "_message_text").show();
    }
}


function addChannel(channel) {
    const channelList = document.getElementById("channelList");
    console.log("channel");
    console.log(channel);
    channelList.insertAdjacentHTML('beforeend',
        htmlGenerator.createChannelHTML(channel.key))
}

// setup listeners
document.getElementById("send-button")
    .addEventListener("click", e => {
    sendMessage();
})


document.getElementById("loginWithGoogle")
    .addEventListener("click", e => {
    loginWithGoogle();
    })

document.getElementById("login-form")
    .addEventListener("submit", e => {
        e.preventDefault();
        let input = $("#login-form").serializeArray();
        loginWithEmailAndPassword(input[0].value, input[1].value);
    })

document.getElementById("register-form")
    .addEventListener("submit", e => {
        e.preventDefault();
        let input = $("#register-form").serializeArray();
        register(input[0].value, input[1].value, input[2].value, input[3].value);
    })

function loginWithEmailAndPassword(email, password) {

    fbauth.signInWithEmailAndPassword(authorize, email, password)
        .then(data => {
            user = data.user;
        })
        .catch(function (error) {
            console.log(error.code);
            console.log(error.message);
        });
}

function loginWithGoogle() {
    let provider = new fbauth.GoogleAuthProvider();
    fbauth.signInWithPopup(authorize, provider)
        .then(data => {
            console.log(data.user);
            user = data.user;
        }).catch(error => {
        console.log(error.code);
        console.log(error.message);
    });
}

function register(register_email, register_password, retype_password, displayName) {
    if (register_password === retype_password) {
        fbauth.createUserWithEmailAndPassword(
            authorize, register_email, register_password
        )
            .then(data => {
                user = data.user;
            })
            .catch(error => {
                console.log(error.code);
                console.log(error.message);
            });
        if (authorize.currentUser !== null) {
            fbauth.updateProfile(authorize.currentUser, {
                displayName: displayName,
                photoURL: "//gravatar.com/avatar/56234674574535734573000000000001?d=retro"
            });
        }
    }
    else {
        alert("Passwords do not match!");
        // TODO: clear password inputs?
    }

}

fbauth.onAuthStateChanged(authorize, userInfo => {
    if (!!userInfo) {
        chat.init(userInfo, channelName);
        user = userInfo;
    } else {
        $("#auth-container").removeClass("d-none");
        $("#chat").addClass("d-none");
        $("#chat").empty();
    }
});