import { GenerateID } from "../utils";
import EventEmitter from "events";
import Player from "./player";
import Card from "./card";
export enum RoomState { WaitingForPlayers, Started, Done };
export default class Room extends EventEmitter {



	private _ID: string;
	private _socketID: string;
	private _hostKey: string;
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
	public Name: string = "";

	public Password: string = "";

	public Secret: boolean = false;

	public MaxPlayers: number = 6;

	private _state: RoomState;

	public HostID?: string;

	private Players: Map<string, Player> = new Map<string, Player>();
	private Cards: Card[] = [];


	get ConnectedPlayers() {
		return Object.keys(this.Players).length ?? 0;
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

		this.Cards = Card.PlayCards();
	}

	public startupSocket(io: SocketIO.Namespace) {
		console.log(`starting up socket for ${this.Name}`);
		io.in(this.SocketID).on("connection", socket => {
			console.log(`Got connection from ${socket.id} to room ${this.Name}`)
			socket.emit("Authenticate", (res: { Name: string; HostKey: string }) => this.AuthenticatePlayer(res, socket));

			socket.on("info", callback => {
				console.log("info for " + this.Name);
				callback(this.toPublicObject())
			});
			socket.on("listPlayers", callback => {
				console.log("sending player info")
				callback([...this.Players.values()].map(x => ({ Name: x.Name, Cards: x.CardCount, Host: x.SocketID == this.HostID })))
			});

			socket.on("StartGame", callback => {
				if (socket.id == this.HostID) {
					this.StartGame();
					callback();
				}
				callback({ error: 403, message: "You are not the host." })
			})
			socket.on("disconnect", () => {
				this.Players.delete(socket.id);
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
			socket.emit("Authenticated", { Host: socket.id == this.HostID });
			return;
		}
		if (Name?.length >= 3 && this.ConnectedPlayers < this.MaxPlayers) {

			this.Players.set(socket.id, new Player(socket, Name));

			if (HostKey == this.HostKey && !this.HostID) {
				console.log(`Found host ${Name} of room ${this.ID}`);

				delete this._hostKey;

				this.HostID = socket.id;
			}

			socket.emit("Authenticated");
			this.emit("update");
			return;
		}
		else if (this.ConnectedPlayers >= this.MaxPlayers)
			socket.emit("Disconnect", { reason: "Room is full." })
		else
			socket.emit("Disconnect", { reason: "Authenticating with invalid name." })

		setTimeout(() => socket.disconnect(false), 500);
	}

	/**
	 * shuffles the game cards.
	 */
	private shuffleCards() {
		for (let i = this.Cards.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.Cards[i], this.Cards[j]] = [this.Cards[j], this.Cards[i]];
		}
	}

	/**
	 * starts up the game
	 */
	public StartGame() {
		this.shuffleCards();

		Object.values(this.Players).forEach(player => {
			player.AddCard(...this.Cards.slice(0, 7));
		});
	}
	/**
	 * Generates an object without the password.
	 */
	toPublicObject() {
		return {
			ID: this._ID,
			Name: this.Name,
			Host: Object.values(this.Players).find(x => x.SocketID == this.HostID)?.Name,
			HasPassword: this.Password != undefined && this.Password != "",
			State: this.State,
			Players: this.ConnectedPlayers,
			MaxPlayers: this.MaxPlayers
		}
	}
}