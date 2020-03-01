import { GenerateID } from "../utils";
import EventEmitter from "events";
import Player from "./player";
import Card from "./card";
export enum RoomState { WaitingForPlayers, Started, Done };
export default class Room extends EventEmitter {



	private _ID: string;
	private _socketID: string;

	public get ID(): string {
		return this._ID;
	}
	public get SocketID(): string {
		return this._socketID;
	}


	public Name: string = "";
	public Password: string = "";
	public Secret: boolean = false;
	public MaxPlayers: number = 6;
	public State: RoomState;
	public CreatorID: string;
	private Players: { [key: string]: Player } = {};
	private CardsInPlay: Card[] = [];


	get ConnectedPlayers() {
		return Object.keys(this.Players).length ?? 0;
	}

	constructor(name: string, password: string, secret: boolean, creatorID: string, maxPlayers?: number) {
		super();
		this._ID = GenerateID();
		this._socketID = GenerateID();
		this.CreatorID = creatorID;
		this.State = RoomState.WaitingForPlayers;

		this.Name = name;
		this.Password = password;
		this.Secret = secret;
		this.MaxPlayers = maxPlayers ?? 4;
	}

	public startupSocket(io: SocketIO.Namespace) {
		console.log(`starting up socket for ${this.Name}`);
		io.in(this.SocketID).on("connection", socket => {
			console.log(`Got connection from ${socket.id} to room ${this.Name}`)
			socket.emit("Authenticate", (res: { Name: string; }) => this.AuthenticatePlayer(res, socket));

			socket.on("info", callback => {
				console.log("info for " + this.Name);
				callback(this.toPublicObject())
			});
			socket.on("listPlayers", callback => {
				console.log("sending player info")
				callback(Object.values(this.Players).map(x => ({ Name: x.Name, Cards: x.Cards.length })))
			});

			socket.on("disconnect", () => {
				delete this.Players[socket.id];
				this.emit("update");
			})
		});
	}

	/**
	 * Authenticate an player and store its name.
	 * @param socket the socket that needs to be authenticated.
	 */
	AuthenticatePlayer({ Name }: { Name: string }, socket: SocketIO.Socket) {
		if (Name?.length >= 3 && this.ConnectedPlayers < this.MaxPlayers) {
			this.Players[socket.id] = new Player(socket, Name);
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
	 * Generates an object without the password.
	 */
	toPublicObject() {
		return {
			ID: this._ID,
			Name: this.Name,
			HasPassword: this.Password != undefined && this.Password != "",
			State: this.State,
			Players: this.ConnectedPlayers,
			MaxPlayers: this.MaxPlayers
		}
	}
}