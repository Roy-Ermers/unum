import { GenerateID } from "../utils";
import { EventEmitter } from "events";
import Player from "./player";
import Card from "./card";
import Logger from "../logger";
import PlayerManager from "./PlayerManager";

export enum RoomState { WaitingForPlayers, Started, Done };
export enum GameDirection { ClockWise, CounterClockWise };

export default class Room extends EventEmitter {
	public get ID(): string {
		return this._ID;
	}

	public get SocketID(): string {
		return this._socketID;
	}

	public set State(val) {
		this._state = val;
	}

	public get State(): RoomState {
		return this._state;
	}

	get currentPlayer() {
		if (this.currentTurn !== undefined)
			return this.players[this.currentTurn];
	}
	get playerCount() {
		return this.players.length;
	}

	get recentCard() {
		return this.pile[this.pile.length - 1];
	}

	private _ID: string;
	private _socketID: string;
	private socket?: SocketIO.Namespace;

	public name: string = "";
	public password: string = "";
	public secret: boolean = false;
	public maxPlayers: number = 6;
	private _state: RoomState;
	public host: Player;

	private players: Player[] = [];
	private currentTurn?: number;
	private direction: GameDirection = GameDirection.ClockWise;
	private stack: Card[] = [];

	private pile: Card[] = [];


	constructor(name: string, password: string, secret: boolean, host: Player, maxPlayers?: number) {
		super();
		this._ID = GenerateID();
		this._socketID = GenerateID();

		this._state = RoomState.WaitingForPlayers;

		this.name = name;
		this.password = password;
		this.secret = secret;
		this.maxPlayers = maxPlayers ?? 4;

		this.host = host;

		PlayerManager.on("playerLeft", player => this.onPlayerLeft(player));
	}

	public startupSocket(io: SocketIO.Namespace) {
		this.log(`starting up socket for ${this.name}`);

		this.socket = io;

		this.socket.on("connection", socket => {
			socket.emit("Authenticate", (res: { Name: string; ID: string }) => this.authenticatePlayer(res, socket));

			socket.on("RoomInfo", callback => {
				callback(this.toPublicObject())
			});
			socket.on("ListPlayers", callback => {
				callback(this.players.map(x => x.toPublicObject()))
			});

			socket.on("StartGame", callback => {
				const player = this.players.find(x => x.SocketID == socket.id);
				if (player?.ID == this.host.ID) {
					this.startGame();
					socket.broadcast.emit("StartGame");
					if (callback)
						callback({});
				}
				else if (callback)
					callback({ error: 403, message: "You are not the host." })
			})
			socket.on("disconnect", () => {
				const player = this.players.find(x => x.SocketID == socket.id);
				if (player) {
					try {
						PlayerManager.leavePlayer(player.ID);
					}
					catch { }
				}
			})
		});
	}

	public onPlayerLeft(player: Player) {
		if (this.players.includes(player)) {
			this.socket?.emit("PlayerLeft", player?.toPublicObject());
			player.leaveRoom(this);
			this.players = this.players.filter(x => x != player);

			if (this.players.length == 0)
				this.emit("delete");
			else
				this.emit("update");
		}
	}


	/**
	 * Authenticate an player and store its name.
	 * @param socket the socket that needs to be authenticated.
	 */
	public authenticatePlayer({ Name, ID }: { Name: string, ID: string }, socket: SocketIO.Socket) {

		//if we receive an ID check if the id was in the room already.
		if (ID != undefined) {
			const joiningPlayer = PlayerManager.getPlayer(ID);
			if (joiningPlayer?.RoomID == this.ID) {
				PlayerManager.stopTimer(joiningPlayer);
				joiningPlayer.Socket = socket;
				socket.emit("Authenticated", { Host: joiningPlayer.Host, Room: this.toPublicObject(), Players: this.players.map(x => x.toPublicObject()) });

				joiningPlayer.sendData();

				return;
			}
		}

		if (this.playerCount >= this.maxPlayers) {
			socket.emit("Disconnect", { error: 429, reason: "Room is full." });
			return;
		}
		if (this.State != RoomState.WaitingForPlayers) {
			socket.emit("Disconnect", { error: 409, reason: "Game is already started." });
			return;
		}

		if (Name?.length >= 2) {
			let newPlayer: Player = PlayerManager.joinPlayer(Name);

			newPlayer.joinRoom(this, socket);

			this.players.push(newPlayer);

			this.log(`Player ${newPlayer.Name} joined.`)
			socket.emit("Authenticated", { Host: this.host.ID == newPlayer.ID, Room: this.toPublicObject(), Players: this.players.map(x => x.toPublicObject()) });

			socket.broadcast.emit("PlayerJoined", newPlayer.toPublicObject());
			this.emit("update");
			return;
		}


		socket.emit("Disconnect", { error: 417, reason: "Authenticating with invalid name." });

		setTimeout(() => socket.disconnect(false), 500);
	}

	public addToPile(...card: Card[]) {
		this.pile.push(...card);
		this.socket?.emit("Pile", card);
	}

	/**
	 * shuffles the game cards.
	 */
	private shuffleCards() {
		for (let i = this.stack.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.stack[i], this.stack[j]] = [this.stack[j], this.stack[i]];
		}
	}

	public pickCard(): Card {
		if (this.stack.length == 0) {
			this.stack = Card.PlayCards();
			this.pile = [this.recentCard];
			this.socket?.emit("ClearStock");
			this.shuffleCards();
		}
		//@ts-ignore
		return this.stack.pop();
	}
	/**
	 * starts up the game
	 */
	public startGame() {
		this.log(`Game started`);
		this.State = RoomState.Started;
		this.emit("update");

		this.stack = Card.PlayCards();
		this.pile = [];

		this.shuffleCards();

		this.players.forEach(player => {
			player.clearCards();
			let Cards = this.stack.slice(0, 7);
			this.stack = this.stack.slice(7);
			player.addCard("stock", ...Cards);
		});

		let startCard = this.stack.pop();
		while (startCard?.Color == "wild") {
			this.stack.push(startCard);
			startCard = this.stack.pop();
		}
		if (startCard)
			this.addToPile(startCard);

		this.currentTurn = 0;

		this.currentPlayer?.takeTurn();
	}

	/**
	 * This ends the game and reports the winner to the clients.
	 * @param winner The winner of the game
	 */
	public endGame(winner: Player) {
		this.socket?.emit('EndGame', winner.toPublicObject());
		this.log(`Game ended, player ${winner.Name} has won!`);

		this._state = RoomState.Done;

		this.emit("update");
	}

	/**
	 * Changes game direction
	 */
	public changeDirection() {
		if (this.direction == GameDirection.ClockWise)
			this.direction = GameDirection.CounterClockWise;
		else this.direction = GameDirection.ClockWise;

		this.log("Direction changed to " + GameDirection[this.direction]);
		this.socket?.emit("ChangeDirection", this.direction);
	}

	/**
	 * This method changes to the next turn.
	 */
	public nextTurn() {
		if (this.currentTurn === undefined)
			throw new Error("Game isn't started yet.");

		if (this.direction == GameDirection.ClockWise) {
			if (this.currentTurn < this.players.length - 1)
				this.currentTurn++;
			else
				this.currentTurn = 0;
		}
		else {
			if (this.currentTurn > 0)
				this.currentTurn--;
			else
				this.currentTurn = this.players.length - 1;
		}
	}

	/**
	 * End current turn and go to the next player.
	 * @param penalty How many cards needs the player to take.
	 */
	public endTurn(penalty?: number) {
		if (this.currentTurn === undefined)
			throw new Error("Game isn't started yet.");

		this.nextTurn();

		const player = this.players[this.currentTurn];
		this.log(`It's player ${player?.Name} turn.`);

		if (penalty) {
			let cards = [];
			for (let i = penalty; i > 0; i--)
				cards.push(this.pickCard());

			player.addCard("stock", ...cards);
		}

		player.takeTurn();
		return player;
	}
	/**
	 * Generates an object without the password.
	 */
	public toPublicObject() {
		return {
			ID: this._ID,
			Name: this.name,
			Host: this.host?.Name ?? "",
			HasPassword: this.password != undefined && this.password != "",
			State: this.State,
			Secret: this.secret,
			Players: this.playerCount,
			MaxPlayers: this.maxPlayers
		}
	}

	//#debug
	public log(...message: any[]) {
		Logger.Log
		Logger.Log(`[${this.ID} - "${this.name}"] ${message}`);
	}

	public warn(...message: any[]) {
		Logger.Warn(`[${this.ID} - "${this.name}"] ${message}`);
	}

	//#enddebug
}