
/**
 * @type {SocketIO.Socket}
 */
let socket;

//#region elements
const hand = document.querySelector(".hand");
/** @type {HTMLDivElement} */
const pile = document.querySelector(".pile");
const playerList = document.querySelector("body>.players");
const stack = document.querySelector(".stack");
const direction = document.querySelector(".direction");

const startScreen = {
	element: document.querySelector(".start-page"),
	playerList: document.querySelector(".start-page>.players"),
	_show: true,
	settings: document.querySelector(".start-page>.settings"),
	winner: document.querySelector(".start-page>h1"),
	startButton: undefined,
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
		this.playerList.querySelector(`[data-id='${player.ID}']`).remove();
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
			this.startButton = document.createElement('button');
			this.startButton.classList.add('start');
			this.startButton.textContent = "start";
			this.startButton.addEventListener("click", () => {
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
			this.settings.appendChild(this.startButton);

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
const callButton = document.querySelector(".call-uno");
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
	let socketID = localStorage.getItem("SocketID")
	let Name = localStorage.getItem("name");

	if (!Name || !socketID) {
		//secret url
		let hash = location.hash.substr(1);
		if (hash.match(/([A-z0-9]){32}/)) {

			socketID = hash;
			let message = "";
			while (!Name || Name == "" || Name.length < 3) {
				Name = prompt(message + "What is your name?");
				message = "Your name must be 3 characters long.\n";
			}
		}
		else {
			location.href = "../?reason=empty-request";
			return;
		}
	}

	Player.Name = Name;

	let timeout = setTimeout(() => {
		if (socket.connected) return;
		console.log("connection timeout");
		location.href = "../?reason=no-response";
	}, 20000);
	// @ts-ignore
	socket = io("/" + socketID, {
		timeout: 20000
	});

	socket.once("connect", () => {
		console.log("Connection established.");
		clearTimeout(timeout);
	});

	socket.once("connect_error", () => location.href = "../");


	socket.once("Authenticate", (callback) => {
		let ID = localStorage.getItem("ID");
		console.log("Authenticating.");
		callback({ Name, ID });
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

	socket.on("AddedCard", (cards) => {
		let timings = [];
		cards.Card.forEach((card, i) => {
			setTimeout(() => {
				timings.push(AddCard(new Card(card), cards.source));
			}, i * 60)
		});
	});

	// Called once when this client rejoins
	socket.on("data", data => {
		data.cards.forEach(card => {
			AddCard(new Card(card));
		});
		if (data.roomState == 1) {
			if (data.pile)
				ThrowCard(new Card(data.pile));

			startScreen.show = false;

			if (data.turn) takeTurn();
		}
	});

	// the stock 
	socket.on("ClearStock", () => {
		pile.querySelectorAll(".card:not(:last-of-type)").forEach(x => {
			x.remove();
		});
	});
	socket.on("Pile", cards => {
		if (Player.turn) return;
		cards.forEach(card => {
			ThrowCard(new Card(card));
		});
	});

	socket.on("Turn", () => {
		takeTurn();
	});

	socket.on("EndTurn", () => {
		hand.classList.add("disabled");
		stack.classList.remove("attention");
		[...hand.children].forEach(x => x.classList.remove("impossible"));
		Player.turn = false;
	});

	socket.on("InvalidDraw", () => {
		if (stack.classList.contains("invalid")) return;
		stack.classList.add("invalid");

		setTimeout(() => stack.classList.remove("invalid"), 500);
	});

	socket.on("CallUno", () => {
		callButton.classList.add("show");
		callButton.addEventListener("click", callUno);
		console.log("Player needs to call unum");
		callUnoTimer = setTimeout(() => {
			callButton.classList.remove("show");
			callButton.removeEventListener("click", callUno);
			socket.emit("MissedUno");
		}, 5000);
	});
	socket.on("ChangeDirection", direction => changeDirection(direction));
	socket.on("CalledUno", player => {
		ShowErrorMessage(`Watch out, ${player.Name} has called unum!`);
	});

	socket.on("EndGame", winner => {
		startScreen.winner.textContent = `${winner.Name} is the winner!`;
		startScreen.show = true;

		Player.turn = false;
		if (Player.Host) {
			startScreen.startButton.textContent = "Restart";
		}

		[...hand.children].forEach(x => {
			//@ts-ignore
			if (x.RemoveCard) x.RemoveCard();
		});
		pile.animate([
			{ opacity: 1 },
			{
				opacity: 0
			}
		],
			{
				duration: 500,
			}).addEventListener("finish", () => {
				pile.innerHTML = "";
				pile.style.opacity = "1";
			})
	});

}
let callUnoTimer;
function takeTurn() {
	if (hand.childElementCount > 0) {
		const hasMatching = [...hand.children].some(x => x.card.CanMatch(recentCard));

		if (!hasMatching)
			stack.classList.add("attention");
	}
	hand.classList.remove("disabled");
	Player.turn = true;
	FilterCards();
}

function callUno() {
	if (callUnoTimer)
		clearTimeout(callUnoTimer);

	callButton.classList.remove("show");
	socket.emit("CalledUno");
}

function changeDirection(GameDirection) {
	direction.classList.toggle("counterclockwise", GameDirection == 1);
	direction.classList.toggle("clockwise", GameDirection == 0);
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
	return new Promise((resolve, reject) => {
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
			colorSelect.removeEventListener("click", ev => {
				if (ev.target == colorSelect)
					reject();
			});
			colorSelect.classList.remove("show");
			resolve(color);
		}
		colorSelect.addEventListener("click", ev => {
			if (ev.target == colorSelect)
				reject();
			colorSelect.classList.remove("show");
		});
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
		img.addEventListener("click", async () => {
			if (!Player.turn) return;
			if (card.Color == "wild") {
				let choice = await selectColor();
				card.ChosenColor = choice;
			}
			socket.emit("ThrowCard", card, allow => {
				if (allow) {
					ThrowCard(card);
					RemoveCard();
				}
				else {
					card.ChosenColor = undefined;
					ShowErrorMessage("That doesn't work!");
				}
			});

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
	img.RemoveCard = RemoveCard;
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
	let randomRotation = Math.random() * 180 - 90;
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
			try {
				let choice = await selectColor();
				card.ChosenColor = choice;
			}
			catch {
				AddCard(card);
				return;
			}
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
				ShowErrorMessage("That doesn't work!");
			}
		});
	}
});

stack.addEventListener("click", () => {
	if (!Player.turn) return;
	stack.classList.remove("attention");
	socket.emit("TakeCard");
});
window.addEventListener('wheel', function (e) {
	if (e.deltaY > 0)
		hand.scrollBy({ behavior: "auto", left: 100 });
	else hand.scrollBy({ behavior: "auto", left: -100 });
});

/**
 * Shows the playerlist
 */
function loadPlayerList() {
	playerList.innerHTML = `<h1>${RoomInfo.Name} (${RoomInfo.Players}/${RoomInfo.MaxPlayers})</h1>`;
	/**
	 * @param {any[]} playerlist
	 */
	socket.emit("ListPlayers", playerlist => {
		console.log(playerlist)
		/**
		 * @param {{ Name: string; Cards: string | number; }} player
		 */
		playerlist.forEach(player => {
			let elem = document.createElement("p");
			elem.textContent = player.Name;
			if (player.Cards < 7 && !isTouch)
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
}

playerList.addEventListener("mouseenter", () => {
	loadPlayerList();
})
//#endregion

JoinGame();