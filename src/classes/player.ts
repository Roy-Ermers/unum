import SocketIO from "socket.io";
import Card from "./card";
import { GenerateID } from "../utils";
import eventEmitter from "events";
import Room from "./Room";
export default class Player {

	private _ID: string;

	private _socket: SocketIO.Socket;

	private _name: string;

	private _room: Room;

	private _cards: Card[] = [];

	public Host: boolean = false;

	public get ID() {
		return this._ID;
	}

	public get SocketID() {
		return this._socket?.id ?? "none";
	}
	public get CardCount() {
		return this._cards.length;
	}
	public get Name() {
		return this._name;
	}

	constructor(socket: SocketIO.Socket, name: string, room: Room) {
		this._ID = GenerateID();
		this._room = room;
		this._socket = socket;
		this._name = name;
		this.setupEvents();
	}

	public AddCard(...Card: Card[]) {
		this._cards.push(...Card);
		this._socket.emit("AddedCard", Card);
	}

	setupEvents() {
		console.log(this._socket.connected);
		this._socket.on("GetCard", callback => {
			console.log("Player " + this.Name + " requested their cards.");
			callback(this._cards);
		});

		this._socket.on("ThrowCard", (_card, callback) => {
			let card: Card = new Card(_card);
			console.log(card, this._room.RecentCard);
			if (card.CanMatch(this._room.RecentCard)) {
				this._room.AddToPile(card);
				callback(true);

				this._room.NextTurn();
				this._socket.emit("EndTurn");
			}
			else callback(false);
		})
	}

	TakeTurn() {
		this._socket.emit("Turn")
	}
	toPublicObject() {
		return { ID: this.ID, Name: this.Name, Cards: this.CardCount, Host: this.Host }
	}
}