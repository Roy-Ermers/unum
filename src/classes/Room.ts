import { GenerateID } from "../utils";
import { EventEmitter } from "events";
import Player from "./player";
import Card from "./card";
import Logger from "../logger";
export enum RoomState { WaitingForPlayers, Started, Done };
export enum GameDirection { ClockWise, CounterClockWise };
export default class Room extends EventEmitter {

	public get ID(): string {
		return this._ID;
	}

	/**
	 * used to determine which socket is the host.
	 */
	public get HostKey(): string {
		return this._hostKey;
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

	private _ID: string;
	private _socketID: string;
	private socket?: SocketIO.Namespace;
	private _hostKey: string;


	public Name: string = "";
	public Password: string = "";
	public Secret: boolean = false;
	public MaxPlayers: number = 6;
	private _state: RoomState;
	public HostID?: string;

	private Players: Map<string, Player> = new Map<string, Player>();
	private currentTurn?: number;
	private direction: GameDirection = GameDirection.ClockWise;
	private Stack: Card[] = [];

	private Pile: Card[] = [];

	get CurrentPlayer() {
		if (this.currentTurn !== undefined)
			return [...this.Players.values()][this.currentTurn];
	}
	get ConnectedPlayers() {
		return this.Players.size;
	}

	get RecentCard() {
		return this.Pile[this.Pile.length - 1];
	}

	constructor(name: string, password: string, secret: boolean, maxPlayers?: number) {
		super();
		this._ID = GenerateID();
		this._socketID = GenerateID();
		this._hostKey = GenerateID();

		this._state = RoomState.WaitingForPlayers;

		this.Name = name;
		this.Password = password;
		this.Secret = secret;
		this.MaxPlayers = maxPlayers ?? 4;

		this.Stack = Card.PlayCards();
	}

	public startupSocket(io: SocketIO.Namespace) {
		this.Log(`starting up socket for ${this.Name}`);

		this.socket = io;

		this.socket.on("connection", socket => {
			socket.emit("Authenticate", (res: { Name: string; HostKey: string }) => this.AuthenticatePlayer(res, socket));

			socket.on("RoomInfo", callback => {
				callback(this.toPublicObject())
			});
			socket.on("ListPlayers", callback => {
				callback([...this.Players.values()].map(x => x.toPublicObject()))
			});

			socket.on("StartGame", callback => {
				if (socket.id == this.HostID) {
					this.StartGame();
					socket.broadcast.emit("StartGame");
					if (callback)
						callback({});
				}
				if (callback)
					callback({ error: 403, message: "You are not the host." })
			})
			socket.on("disconnect", () => {
				let player = this.Players.get(socket.id);
				this.Log(player?.Name + " left");
				socket.broadcast.emit("PlayerLeft", player?.toPublicObject())
				this.Players.delete(socket.id);
				if (this.Players.size == 0)
					this.emit("delete");
				else
					this.emit("update");
			})
		});
	}

	/**
	 * Authenticate an player and store its name.
	 * @param socket the socket that needs to be authenticated.
	 */
	AuthenticatePlayer({ Name, HostKey }: { Name: string, HostKey: string }, socket: SocketIO.Socket) {
		if (this.Players.has(socket.id)) {
			socket.emit("Authenticated", { Host: this.Players.get(socket.id)?.Host, Room: this.toPublicObject(), Players: [...this.Players.values()].map(x => x.toPublicObject()) });
			return;
		}
		if (this.ConnectedPlayers >= this.MaxPlayers) {
			socket.emit("Disconnect", { error: 429, reason: "Room is full." });
			return;
		}
		if (this.State != RoomState.WaitingForPlayers) {
			socket.emit("Disconnect", { error: 409, reason: "Game is already started." })
		}

		if (Name?.length >= 3) {
			let newPlayer: Player = new Player(socket, Name, this);
			if (HostKey == this.HostKey && !this.HostID) {
				this.Log(`${Name} is the host.`);

				delete this._hostKey;

				this.HostID = socket.id;
				newPlayer.Host = true;
				socket.emit("HostFound", newPlayer.toPublicObject());
			}

			this.Players.set(socket.id, newPlayer);
			this.Log(`Player ${newPlayer.Name} joined.`)
			socket.emit("Authenticated", { Host: this.HostID == socket.id, Room: this.toPublicObject(), Players: [...this.Players.values()].map(x => x.toPublicObject()) });

			socket.broadcast.emit("PlayerJoined", newPlayer.toPublicObject());
			this.emit("update");
			return;
		}


		socket.emit("Disconnect", { error: 417, reason: "Authenticating with invalid name." });

		setTimeout(() => socket.disconnect(false), 500);
	}

	public AddToPile(...card: Card[]) {
		this.Pile.push(...card);
		this.socket?.emit("Pile", card);
	}

	/**
	 * shuffles the game cards.
	 */
	private shuffleCards() {
		for (let i = this.Stack.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.Stack[i], this.Stack[j]] = [this.Stack[j], this.Stack[i]];
		}
	}

	public pickCard(): Card {
		if (this.Stack.length == 0) {
			this.Stack = this.Pile.slice(0, this.Pile.length - 1);
			this.Pile = this.Pile.slice(0, this.Pile.length - 1);
			this.shuffleCards();
		}
		//@ts-ignore
		return this.Stack.pop();
	}
	/**
	 * starts up the game
	 */
	public StartGame() {
		this.Log(`Game started`);
		this.State = RoomState.Started;
		this.emit("update");

		this.shuffleCards();

		this.Players.forEach(player => {
			let Cards = this.Stack.slice(0, 7);
			this.Stack = this.Stack.slice(7);
			player.AddCard("stock", ...Cards);
		});

		let startCard = this.Stack.pop();
		while (startCard?.Color == "wild") {
			this.Stack.push(startCard);
			startCard = this.Stack.pop();
		}
		if (startCard)
			this.AddToPile(startCard);

		this.currentTurn = 0;

		this.CurrentPlayer?.TakeTurn();
	}

	public ChangeDirection() {
		if (this.direction == GameDirection.ClockWise)
			this.direction = GameDirection.CounterClockWise;
		else this.direction = GameDirection.ClockWise;
		this.Log("Direction changed to " + GameDirection[this.direction]);
		this.socket?.emit("ChangeDirection", this.direction);
	}

	public SkipTurn() {
		if (this.currentTurn === undefined)
			throw new Error("Game isn't started yet.");

		if (this.direction == GameDirection.ClockWise) {
			if (this.currentTurn < this.Players.size - 1)
				this.currentTurn++;
			else
				this.currentTurn = 0;
		}
		else {
			if (this.currentTurn > 0)
				this.currentTurn--;
			else
				this.currentTurn = this.Players.size;
		}
	}

	public NextTurn(penalty?: number) {
		if (this.currentTurn === undefined)
			throw new Error("Game isn't started yet.");

		let players = [...this.Players.values()];

		if (this.direction == GameDirection.ClockWise) {
			if (this.currentTurn < this.Players.size - 1)
				this.currentTurn++;
			else
				this.currentTurn = 0;
		}
		else {
			if (this.currentTurn > 0)
				this.currentTurn--;
			else
				this.currentTurn = this.Players.size - 1;
		}

		this.Log(`It's player ${players[this.currentTurn]?.Name} turn.`);

		if (penalty)
			for (let i = penalty; i >= 0; i--)
				players[this.currentTurn].AddCard("stock", this.pickCard());

		players[this.currentTurn].TakeTurn();
		return players[this.currentTurn];
	}
	/**
	 * Generates an object without the password.
	 */
	toPublicObject() {
		return {
			ID: this._ID,
			Name: this.Name,
			Host: [...this.Players.values()].find(x => x.SocketID == this.HostID)?.Name,
			HasPassword: this.Password != undefined && this.Password != "",
			State: this.State,
			Secret: this.Secret,
			Players: this.ConnectedPlayers,
			MaxPlayers: this.MaxPlayers
		}
	}

	//#debug
	public Log(...message: any[]) {
		Logger.Log
		Logger.Log(`[${this.ID} - "${this.Name}"] ${message}`);
	}

	public Warn(...message: any[]) {
		Logger.Warn(`[${this.ID} - "${this.Name}"] ${message}`);
	}

	//#enddebug
}