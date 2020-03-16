
/**
 * @type {SocketIO.Socket}
 */
let socket;

//#region elements
const hand = document.querySelector(".hand");
/** @type {HTMLDivElement} */
const pile = document.querySelector(".pile");
const playerList = document.querySelector(".players");

const startScreen = {
	element: document.querySelector(".start-page"),
	playerList: document.querySelector(".start-page>.players"),
	_show: true,
	settings: document.querySelector(".start-page>.settings"),
	/**
	 * @type {boolean}
	 */
	set show(val) {
		this._show = val;
		this.element.classList.toggle("show", val);
	},
	get show() {
		return this._show;
	},

	addPlayer(player) {
		if (!this.show) return;

		let playerElem = document.createElement("p");
		playerElem.dataset.id = player.ID;
		playerElem.textContent = player.Name;

		if (player.Host)
			playerElem.classList.add("host");

		this.playerList.appendChild(playerElem);
	},
	removePlayer(player) {
		console.log(player.ID + " left");
		playerList.querySelector(`[data-id='${player.ID}']`).remove();
	},
	set roomName(val) {
		this.settings.querySelector("h1").textContent = val;
	},

	set creator(val) {
		if (val)
			this.settings.querySelector("p").textContent = "Created by " + val;
	},
	set host(val) {

		if (val) {
			let startButton = document.createElement('button');
			startButton.classList.add('start');
			startButton.textContent = "start";
			startButton.addEventListener("click", () => {
				socket.emit("StartGame", res => {
					if (res.error) ShowErrorMessage(res.message);
					else {
						startScreen.show = false;
					}

				});
			});
			this.settings.appendChild(startButton);

			if (RoomInfo.Secret) {
				console.log("Creating share link.");
				let link = document.createElement('input');
				let url = location + "#" + socket.id;
				link.classList.add("link");
				link.readOnly = true;
				link.value = url;
				link.addEventListener("click", (e) => {
					e.preventDefault();
					link.setSelectionRange(0, url.length);
					document.execCommand("copy");

					ShowErrorMessage("Copied to clipboard.");
				});
				this.settings.appendChild(link);
			}
		}
	}
};
//#endregion

//#region constants
const isTouch = window.matchMedia("(pointer: coarse)").matches;
//#endregion

//#region Networking

let RoomInfo = {
	ID: undefined,
	Name: "",
	HasPassword: false,
	State: 0,
	Secret: false,
	Players: 0,
	MaxPlayers: 0
};

let Player = {
	Name: "",
	Host: false
};

function JoinGame() {
	let socketID = localStorage.getItem("SocketID");
	let Name = localStorage.getItem("name");

	if (!socketID || !Name) {
		//secret url
		let hash = location.hash.substr(1);
		console.log(hash);
		if (hash.match(/([A-z0-9]){32}/)) {
			console.log("hash is an room id.");
			socketID = hash;
			if (!Name) {
				let message = "";
				while (!Name || Name == "" || Name.length < 3) {
					Name = prompt(message + "What is your name?");
					message = "Your name must be 3 characters long.\n";
				}
			}
		}
		else {
			location.href = "../?reason=empty-request";
			return;
		}
	}

	Player.Name = Name;

	let timeout = setTimeout(() => {
		console.log("connection timeout");
		location.href = "../?reason=no-response";
	}, 2000);
	// @ts-ignore
	socket = io("/" + socketID, {
		timeout: 2000
	});

	socket.on("connect", () => {
		console.log("Connection established.");
		clearTimeout(timeout);
	});

	socket.once("connect_error", () => location.href = "../");


	socket.once("Authenticate", (callback) => {
		let HostKey = localStorage.getItem("HostKey");
		localStorage.removeItem("HostKey");
		console.log("Authenticating.");
		callback({ Name, HostKey });
	});

	socket.once("Authenticated", info => {
		console.log(info);
		RoomInfo = info.Room;
		Player.Host = info.Host;

		startScreen.host = info.Host;
		startScreen.roomName = RoomInfo.Name;
		startScreen.creator = RoomInfo.Host;

		info.Players.forEach(player => startScreen.addPlayer(player));
		console.log("Authenticated.");

	});

	socket.on("StartGame", () => {
		console.log("Game started.");
		startScreen.show = false;
	});

	socket.once("Disconnect", (reason) => {
		alert(`Connection lost.\nreason: ${reason.reason || "none"}`);
		location.href = "../";
	});

	socket.on("PlayerJoined", player => startScreen.addPlayer(player));
	socket.on("PlayerLeft", player => startScreen.removePlayer(player));

	socket.on("HostFound", player => {
		startScreen.creator = player.Name;
	});

	socket.on("AddedCard", (cards) => {
		cards.forEach(card => {
			AddCard(new Card(card));
		});
	});

	socket.on("Pile", cards => {
		console.log("pile");
		if (Player.turn) return;
		cards.forEach(card => {
			ThrowCard(new Card(card), 0, 0);
		});
	});

	socket.on("Turn", () => {
		hand.classList.remove("disabled");
		Player.turn = true;
	});

	socket.on("EndTurn", () => {
		hand.classList.add("disabled");
		Player.turn = false;
	})
}



window.addEventListener("beforeunload", () => {
	socket.disconnect();
});
//#endregion

//#region data
class Card {

	get URL() {
		if (this.Color == "special") {
			if (this.Sign == "4")
				return `/images/wild_pick_four.png`;
			else if (this.Sign == "color")
				return `images/wild_color_changer.png`;
			else {
				console.error(`wild ${this.Sign} hasn't been implemented yet.`);
				return `images/card_back.png`;
			}
		}
		return `images/${this.Color}_${this.Sign}.png`;
	}
	/**
	 * @param {{ Color: string; Sign: string; }|string} color
	 * @param {string} [sign]
	 */
	constructor(color, sign) {
		if (typeof color == "object") {
			this.Color = color.Color;
			this.Sign = color.Sign;
		}
		else {
			this.Color = color;
			this.Sign = sign;
		}
	}
}

//#endregion

//#region HTML

function ShowErrorMessage(message) {
	let alert = document.createElement("div");
	alert.classList.add("alert");
	alert.textContent = message;
	alert.addEventListener("animationend", () => alert.remove());
	document.body.appendChild(alert);
}


/**
 * @param {Card} card
 * @param {string} [source]
 */
function AddCard(card, source) {
	const img = document.createElement("img");
	img.classList.add("card");
	if (source == "stock")
		img.classList.add("from-stock");
	img.src = card.URL;
	img.draggable = true;

	if (isTouch)
		img.addEventListener("click", () => {
			ThrowCard(card, window.innerWidth / 2, window.innerHeight / 2);
			RemoveCard();
		});

	img.addEventListener("dragstart", ev => {
		img.classList.remove("from-stock");
		ev.dataTransfer.effectAllowed = "move";
		ev.dataTransfer.dropEffect = "move";
		ev.dataTransfer.setDragImage(img, 100, 100);
		ev.dataTransfer.clearData();
		ev.dataTransfer.setData("uno-card", JSON.stringify(card));
		console.log(ev.dataTransfer.types);
	});

	img.addEventListener('drag', (ev) => {
		ev.dataTransfer.setData("uno-card", JSON.stringify(card));
	});
	img.addEventListener("dragend", ev => {
		if (ev.dataTransfer.dropEffect == "move") {
			console.log("drop succeeded");
			RemoveCard();
		}
	});
	hand.appendChild(img);

	function RemoveCard() {
		img.animate([
			{
				transform: "rotate(3deg)"
			}, {
				transform: "translateY(100%) rotate(3deg)"
			}
		],
			{
				duration: 200
			}).addEventListener("finish", () => img.remove());
	}
}
/**
 * 
 * @param {Card} card 
 * @param {number} offsetX 
 * @param {number} offsetY 
 */
function ThrowCard(card, offsetX, offsetY) {
	const img = document.createElement("img");
	img.classList.add("card");
	img.src = card.URL;
	pile.appendChild(img);
	let randomRotation = Math.random() * 360;
	img.animate([
		{
			top: offsetY + "px",
			left: offsetX + "px",
			transform: `translate(-50%, -50%) rotate(${randomRotation + Math.random() * 20}deg)`
		},
		{
			top: "50%",
			left: "50%",
			transform: `translate(-${50 + Math.random() * 10}%, -${50 + Math.random() * 10}%) rotate(${randomRotation + "deg"})`

		}
	],
		{
			duration: 500,
			fill: "forwards",
			easing: "ease"
		});
}
pile.addEventListener("dragover", ev => {
	ev.preventDefault();
	if (ev.dataTransfer.types.includes("uno-card"))
		ev.dataTransfer.dropEffect = "move";
	else ev.dataTransfer.dropEffect = "none";
});

pile.addEventListener("drop", ev => {
	console.log(ev);
	ev.preventDefault();
	if (ev.dataTransfer.types.includes("uno-card")) {
		let card = new Card(JSON.parse(ev.dataTransfer.getData("uno-card")));
		console.log(card);
		socket.emit("ThrowCard", card, allow => {
			console.log(allow);
			if (allow) {
				ThrowCard(card, ev.clientX, ev.clientY);
				Player.turn = false;
			}
			else {
				AddCard(card, "pile");
				ShowErrorMessage("This card can't be thrown on this card.");
			}
		});
	}
});

window.addEventListener('wheel', function (e) {
	if (e.deltaY > 0)
		hand.scrollBy({ behavior: "auto", left: 100 });
	else hand.scrollBy({ behavior: "auto", left: -100 });
});

let PlayerListShown = false;
/**
 * Shows the playerlist
 */
function ShowPlayerList() {
	console.log("showing players");
	playerList.innerHTML = `<h1>${RoomInfo.Name} (${RoomInfo.Players}/${RoomInfo.MaxPlayers})</h1>`;
	socket.emit("ListPlayers", playerlist => {
		console.log(playerlist);
		playerlist.forEach(player => {
			let elem = document.createElement("p");
			elem.textContent = player.Name;
			if (player.Cards < 20)
				for (let i = 0; i < player.Cards; i++) {
					let img = document.createElement("img");
					img.src = "images/card_back.png";
					elem.appendChild(img);
				}
			else {
				let img = document.createElement("img");
				img.src = "images/card_back.png";
				elem.appendChild(img);

				let remaining = document.createElement("p");
				remaining.textContent = " x " + player.Cards;
				elem.appendChild(remaining);
			}
			playerList.appendChild(elem);
		});

	});
	playerList.classList.add("show");
}
function HidePlayerList() {
	console.log("hiding players");

	playerList.classList.remove("show");
}

document.addEventListener("keydown", ev => {
	ev.preventDefault();
	if (ev.key == "Tab" && !PlayerListShown) {
		PlayerListShown = true;
		ShowPlayerList();
	}
});
document.addEventListener("keyup", ev => {
	ev.preventDefault();
	if (ev.key == "Tab") {
		PlayerListShown = false;
		HidePlayerList();
	}
});
//#endregion

JoinGame();