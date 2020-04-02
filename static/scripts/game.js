
/**
 * @type {SocketIO.Socket}
 */
let socket;

//#region elements
const hand = document.querySelector(".hand");
/** @type {HTMLDivElement} */
const pile = document.querySelector(".pile");
const playerList = document.querySelector(".players");
const stack = document.querySelector(".stack");
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

	/**
	 * @param {{ ID: string; Name: string; Host: any; }} player
	 */
	addPlayer(player) {
		if (!this.show) return;

		let playerElem = document.createElement("p");
		playerElem.dataset.id = player.ID;
		playerElem.textContent = player.Name;

		if (player.Host)
			playerElem.classList.add("host");

		this.playerList.appendChild(playerElem);
	},
	/**
	 * @param {{ ID: string; }} player
	 */
	removePlayer(player) {
		console.log(player.ID + " left");
		playerList.querySelector(`[data-id='${player.ID}']`).remove();
	},
	/**
	 * @param {string} val
	 */
	/**
	 * @param {string} val
	 */
	set roomName(val) {
		this.settings.querySelector("h1").textContent = val;
	},

	/**
	 * @param {string} val
	 */
	/**
	 * @param {string} val
	 */
	set creator(val) {
		if (val)
			this.settings.querySelector("p").textContent = "Created by " + val;
	},
	/**
	 * @param {any} val
	 */
	/**
	 * @param {any} val
	 */
	set host(val) {

		if (val) {
			let startButton = document.createElement('button');
			startButton.classList.add('start');
			startButton.textContent = "start";
			startButton.addEventListener("click", () => {
				/**
				 * @param {{ error: any; message: any; }} res
				 */
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
const colorSelect = document.querySelector(".color-select");

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
	Host: false,
	turn: false
};

function JoinGame() {
	let socketID = localStorage.getItem("SocketID");
	let Name = localStorage.getItem("name");

	if (!socketID || !Name) {
		//secret url
		let hash = location.hash.substr(1);
		if (hash.match(/([A-z0-9]){32}/)) {
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
		let timings = [];
		cards.Card.forEach((card, i) => {
			setTimeout(() => {
				timings.push(AddCard(new Card(card), cards.source));
			}, i * 30)
		});
	});

	socket.on("Pile", cards => {
		if (Player.turn) return;
		cards.forEach(card => {
			ThrowCard(new Card(card));
		});
	});

	socket.on("Turn", () => {
		hand.classList.remove("disabled");
		Player.turn = true;
		FilterCards();
	});

	socket.on("EndTurn", () => {
		hand.classList.add("disabled");
		[...hand.children].forEach(x => x.classList.remove("impossible"));
		Player.turn = false;
	});
}



window.addEventListener("beforeunload", () => {
	socket.disconnect();
});
//#endregion

//#region data

let recentCard;
class Card {

	get URL() {
		if (this.Color == "wild") {
			let url = "";
			if (this.Sign == "draw4")
				url += `/images/wild_pick_four`;
			else if (this.Sign == "color")
				url += `images/wild_color_changer`;
			else {
				console.error(`wild ${this.Sign} hasn't been implemented yet.`);
				return `images/card_back.png`;
			}

			if (this.ChosenColor) {
				url += "_" + this.ChosenColor;
			}

			return url + ".png";
		}
		return `images/${this.Color}_${this.Sign}.png`;
	}
	get name() {
		return `${this.Color} ${this.Sign}`;
	}
	/**
	 * @param {{ Color: string; Sign: string; Penalty: number, ChosenColor: string }|string} color
	 * @param {string} [sign]
	 * @param {number} [penalty]
	 * @param {string} [chosenColor]
	 */
	constructor(color, sign, penalty, chosenColor) {
		if (typeof color == "object") {
			this.Color = color.Color;
			this.Sign = color.Sign;
			this.Penalty = color.Penalty;
			this.ChosenColor = color.ChosenColor;
		}
		else {
			this.Color = color;
			this.Sign = sign;
			this.Penalty = penalty || 0;
			this.ChosenColor = chosenColor;

		}
	}

	/**
	 * @param {Card} card
	 */
	CanMatch(card) {
		if (this.Color == "wild") return true;
		if (card.ChosenColor != undefined && this.Color == card.ChosenColor) return true;
		if (card.Color == this.Color) return true;
		if (card.Sign == this.Sign) return true;

		return false;
	}
}

//#endregion

//#region HTML

/**
 * @param {string} message
 */
function ShowErrorMessage(message) {
	let alert = document.createElement("div");
	alert.classList.add("alert");
	alert.textContent = message;
	alert.addEventListener("animationend", () => alert.remove());
	document.body.appendChild(alert);
}

function selectColor() {
	return new Promise((resolve) => {
		colorSelect.classList.add("show");
		let blue = colorSelect.querySelector(".blue");
		let red = colorSelect.querySelector(".red");
		let yellow = colorSelect.querySelector(".yellow");
		let green = colorSelect.querySelector(".green");

		function chooseColor(color) {
			blue.removeEventListener("click", chooseColor);
			red.removeEventListener("click", chooseColor);
			yellow.removeEventListener("click", chooseColor);
			green.removeEventListener("click", chooseColor);
			colorSelect.classList.remove("show");
			resolve(color);
		}
		blue.addEventListener("click", () => chooseColor("blue"));
		red.addEventListener("click", () => chooseColor("red"));
		yellow.addEventListener("click", () => chooseColor("yellow"));
		green.addEventListener("click", () => chooseColor("green"));
	})
}

/**
 * @param {Card} card
 * @param {string} [source]
 */
function AddCard(card, source) {
	const img = document.createElement("img");
	img.classList.add("card");
	if (source)
		img.classList.add("from-" + source);
	img.src = card.URL;
	img.draggable = true;
	img.dataset.card = card.name;
	img.card = card;
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
	});

	img.addEventListener('drag', (ev) => {
		ev.dataTransfer.setData("uno-card", JSON.stringify(card));
	});
	img.addEventListener("dragend", ev => {
		if (ev.dataTransfer.dropEffect == "move") {
			RemoveCard();
		}
	});

	if (Player.turn) {
		let match = card.CanMatch(recentCard);
		img.classList.toggle("impossible", !match);

		if (match)
			hand.insertAdjacentElement("beforeend", img);
		else hand.insertAdjacentElement("afterbegin", img);
	}
	else
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

function FilterCards() {
	if (!recentCard) return;

	[...hand.children].forEach(card => {
		let match = card.card.CanMatch(recentCard);
		if (match) {
			card.parentElement.insertAdjacentElement("beforeend", card);
		}
		card.classList.remove("from-stock", "from-pile");

		if (Player.turn)
			card.classList.toggle("impossible", !match);
	});
}
/**
 * 
 * @param {Card} card 
 * @param {number} [offsetX]
 * @param {number} [offsetY]
 */
function ThrowCard(card, offsetX, offsetY) {
	const img = document.createElement("img");
	img.classList.add("card");
	img.src = card.URL;
	pile.appendChild(img);
	let randomRotation = Math.random() * 360;
	recentCard = card;
	offsetX |= window.innerWidth / 2;
	offsetY |= window.innerHeight / 2;
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

pile.addEventListener("drop", async ev => {
	ev.preventDefault();
	if (ev.dataTransfer.types.includes("uno-card")) {
		let card = new Card(JSON.parse(ev.dataTransfer.getData("uno-card")));
		if (card.Color == "wild") {
			let choice = await selectColor();
			card.ChosenColor = choice;
		}
		/**
		 * @param {any} allow
		 */
		socket.emit("ThrowCard", card, allow => {
			if (allow) {
				ThrowCard(card, ev.clientX, ev.clientY);
			}
			else {
				card.ChosenColor = undefined;
				AddCard(card, "pile");
				ShowErrorMessage("This card can't be thrown on this card.");
			}
		});
	}
});

stack.addEventListener("click", () => {
	if (!Player.turn) return;
	socket.emit("TakeCard");
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
	playerList.innerHTML = `<h1>${RoomInfo.Name} (${RoomInfo.Players}/${RoomInfo.MaxPlayers})</h1>`;
	/**
	 * @param {any[]} playerlist
	 */
	socket.emit("ListPlayers", playerlist => {
		/**
		 * @param {{ Name: string; Cards: string | number; }} player
		 */
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