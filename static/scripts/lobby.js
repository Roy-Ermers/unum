/**
 * @typedef Room
 * @property {boolean} HasPassword
 * @property {string} ID
 * @property {string} Name
 * @property {string} [Host]
 * @property {number} Players
 * @property {number} MaxPlayers
 * @property {number} State
 */
/**
 * @type {SocketIO.Socket}
 */
//@ts-ignore
const RoomSocket = io("/rooms");
let PlayerID = localStorage.getItem("ID");
// #region Service worker 

navigator.serviceWorker.register('service-worker.js', {
	scope: '/'
});

//#endregion

//#region HTML
const State = ["Waiting for players...", "Playing", "Done"];
const RoomBrowser = document.querySelector(".room-browser");
const loginForm = document.querySelector(".login-form");
const usernameForm = document.querySelector(".username-form");
const changeNameLink = document.querySelector(".change-name");
const searchField = document.querySelector("#search");
const addRoomPanel = document.querySelector(".add-room");
const createRoomButton = document.querySelector(".create-room");
const closeButton = addRoomPanel.querySelector(".close");
const createRoomForm = addRoomPanel.querySelector("#room-form");
const passwordScreen = document.querySelector(".password-screen");
/** @type {HTMLInputElement} */
const NameTextBox = document.querySelector("#Name");

NameTextBox.value = localStorage.getItem("name") || "";
if (ValidateName(NameTextBox.value)) {
	SaveName(NameTextBox.value);
	usernameForm.setAttribute("hidden", "");
}

//@ts-ignore
NameTextBox.addEventListener("input", (ev) => ValidateName(ev.target.value));
createRoomButton.addEventListener("click", () => addRoomPanel.classList.add("show"));
closeButton.addEventListener("click", () => addRoomPanel.classList.remove("show"));
loginForm.addEventListener("submit", CloseNameForm);

changeNameLink.addEventListener("click", () => {
	localStorage.setItem("name", "");
	localStorage.setItem("ID", "");
	location.reload();
});

searchField.addEventListener("input", () => {
	if (searchField.value == "") {
		RoomBrowser.classList.remove("search");
	}
	RoomBrowser.classList.add("search");

	RoomBrowser.querySelectorAll(`.room`).forEach(el => {
		el.classList.toggle("match", el.dataset.name.toLowerCase().includes(searchField.value.toLowerCase()));
	});
});

passwordScreen.querySelector(".close-window").addEventListener("click", () => passwordScreen.classList.remove("show"));
passwordScreen.addEventListener("submit", (ev) => {
	ev.preventDefault();
	let RoomID = localStorage.getItem("Room");
	let password = passwordScreen.querySelector("input").value;
	ConnectToRoom(RoomID, password);
});

createRoomForm.addEventListener("submit", CreateRoom);

let search = new URLSearchParams(location.search);
if (search.has("reason")) {
	switch (search.get("reason")) {
		case "no-response":
			ShowErrorMessage("Room didn't exist or timed out.");
			break;
		case "empty-request":
			ShowErrorMessage("You tried to join a room that didn't exist.");
			break;
		default:
			ShowErrorMessage("Something went wrong, reason: " + search.get("reason"));
			break;
	}

	window.history.replaceState({}, document.title, location.pathname);
}
function SaveName(name) {
	if (ValidateName(name)) {
		localStorage.setItem("name", name);

		RoomSocket.emit("NewPlayer", { name, ID: PlayerID }, id => {
			console.log(`We've got a player id ${id}`);
			localStorage.setItem("ID", id);
			PlayerID = id;
		});
		return true;
	}
	return false;
}
/**
 * @param {InputEvent} ev
 */
function CloseNameForm(ev) {
	ev.preventDefault();
	if (SaveName(NameTextBox.value)) {
		usernameForm.animate([
			{ opacity: 1 },
			{ opacity: 0 }
		], { fill: "forwards", duration: 500 }).addEventListener("finish", () => usernameForm.setAttribute("hidden", ""));
	}
}
/**
 * 
 * @param {Event} ev 
 */
function CreateRoom(ev) {
	if (PlayerID == "") {
		ShowErrorMessage("You don't have an ID, please refresh page!");
		return;
	}
	ev.preventDefault();
	const form = ev.target;
	console.log(form);

	const formData = new FormData(form);

	let room = {
		Name: formData.get("room-name").toString(),
		MaxPlayers: parseInt(formData.get("max-players").toString()),
		Password: formData.get("password").toString(),
		Secret: formData.has("secret"),
		Host: PlayerID
	};
	RoomSocket.emit("CreateRoom", room, (response) => {
		if (response.error) {
			alert(response.message);
		}
		else {
			ConnectToRoom(response.Room.ID, room.Password);
		}
	});
}
function ValidateName(value) {
	let valid = true;
	if (!value)
		valid = false;
	if (value.length < 3)
		valid = false;

	document.querySelector('.nextButton').toggleAttribute("disabled", !valid);
	return valid;
}

/**
 * Generates html fro this room and add it to the list
 * @param {Room} room 
 */
function AddRoom(room) {
	//update existing room
	let el = document.getElementById(room.ID);
	if (el) {
		el.classList.toggle("password", room.HasPassword);
		el.classList.toggle("full", room.Players == room.MaxPlayers || room.State != 0);
		el.querySelector("h1").textContent =
			el.dataset.name = room.Name;

		el.querySelector("div>p").textContent = room.Players + "/" + room.MaxPlayers;
		el.querySelector(".state").textContent = State[room.State];
		return;
	}
	//create parent element
	let roomElement = document.createElement("div");
	roomElement.classList.add("room");
	roomElement.classList.toggle("password", room.HasPassword);
	roomElement.dataset.name = room.Name;
	roomElement.id = room.ID;
	roomElement.classList.toggle("full", room.Players == room.MaxPlayers);

	//create split
	let dataElement = document.createElement("div");
	let nameElement = document.createElement('h1');
	nameElement.textContent = room.Name;

	//amount of players in the room
	let playerElement = document.createElement("p");
	playerElement.textContent = room.Players + "/" + room.MaxPlayers;

	let creatorElem = document.createElement("span");
	creatorElem.classList.add("creator");
	creatorElem.textContent += " created by " + room.Host;

	nameElement.appendChild(creatorElem);

	dataElement.appendChild(nameElement);
	dataElement.appendChild(playerElement);

	//in which state is the room?
	let stateElement = document.createElement("p");
	stateElement.classList.add("state");
	stateElement.textContent = State[room.State];

	roomElement.appendChild(dataElement);
	roomElement.appendChild(stateElement);

	//allow to join the room when clicking
	roomElement.addEventListener("click", () => {
		ConnectToRoom(room.ID);
	});
	RoomBrowser.insertAdjacentElement("afterbegin", roomElement);
}

function ShowErrorMessage(message) {
	let alert = document.createElement("div");
	alert.classList.add("alert");
	alert.textContent = message;
	alert.addEventListener("animationend", () => alert.remove());
	document.body.appendChild(alert);
}
//#endregion
//#region Networking


RoomSocket.on("connect", () => {
	console.log("Connection established.");
});
RoomSocket.on("connect_error", console.error);
RoomSocket.on("connect_timeout", console.error);


RoomSocket.emit("GetRooms",
	/**
	 * @param {Room[]} rooms
	 */
	rooms => {
		document.body.classList.remove("loading");
		rooms.forEach(AddRoom);
	});

RoomSocket.on("RemovedRoom", ID => document.querySelector('#' + ID).remove());
RoomSocket.on("update", rooms => rooms.forEach(AddRoom));

/**
 * @param {string} RoomID
 * @param {string} [password]
 */
function ConnectToRoom(RoomID, password) {

	localStorage.setItem("Room", RoomID);
	if (NameTextBox.value == "") {
		alert("You need to fill in a name.");
		return;
	}
	RoomSocket.emit("Authenticate", RoomID, password, (res) => {
		if (res.error) {
			if (res.error == 401 && (password == undefined || password == "")) {
				passwordScreen.classList.add("show");
				passwordScreen.querySelector("input").focus();
				passwordScreen.querySelector("input").value = "";
			}
			else
				alert(res.message);
		}
		else {
			localStorage.removeItem("Room");
			localStorage.setItem("SocketID", res.SocketID);
			location.href = "room";
		}
	});
}
//#endregion
