import SocketIO, { Socket } from "socket.io";
import Card from "./card";
import { GenerateID } from "../utils";
import Room from "./Room";
import { throws } from "assert";

export default class Player {
	private _ID: string;

	private _socket?: SocketIO.Socket;

	private _name: string;

	private _room?: Room;

	private _cards: Card[] = [];

	public get Host() {
		return this._room?.host == this;
	}
	public set ID(val) {
		this._ID = val;
	}

	public get ID() {
		return this._ID;
	}

	public get SocketID() {
		return this._socket?.id;
	}

	public get CardCount() {
		return this._cards.length;
	}

	public get Name() {
		return this._name;
	}
	public get RoomID() {
		return this._room?.ID;
	}

	public set Socket(socket: Socket) {
		this._socket = socket;
		if (this._room)
			this.setupEvents();
	}


	constructor(name: string, socket?: Socket, room?: Room) {
		this._ID = GenerateID();
		this._name = name;
		this._room = room;
		this._socket = socket;
		if (this._socket !== undefined)
			this.setupEvents();
	}

	public clearCards() {
		this._cards = [];
	}

	public joinRoom(room: Room, socket: Socket) {
		this._room = room;
		this._socket = socket;
		this.setupEvents();
	}
	leaveRoom(room: Room) {
		if (this._room != room)
			throw new Error("Player wasn't in this room.");
		this._room = undefined;
		this._socket = undefined;

	}
	public addCard(source: string, ...Card: Card[]) {
		if (!this._room || !this._socket)
			throw new Error("Player hasn't joined a room.");

		this._cards.push(...Card);
		this._socket.emit("AddedCard", { Card, source });
	}

	public removeCard(card: Card) {
		let index = this._cards.findIndex(x => card.Equals(x));
		if (index < 0)
			throw new Error("Card was not found.");

		this._cards.splice(index, 1);
	}

	public hasCard(match: Card) {
		return this._cards.some(card => card.Equals(match));
	}

	private setupEvents() {
		if (!this._room || !this._socket)
			throw new Error("Player hasn't joined a room.");

		this._socket.on("GetCard", (callback: Function) => {
			callback(this._cards);
		});
		this._socket.on("TakeCard", () => {
			this.takeCard();
		});
		this._socket.on("ThrowCard", (_card: Card, callback: Function) => {
			this.throwCard(_card, callback);
		});
		this._socket.on("CalledUno", () => {
			if (!this._room || !this._socket)
				throw new Error("Player hasn't joined a room.");

			this._room.log(`${this.Name} called unum.`);
			this._socket.broadcast.emit("CalledUno", this.toPublicObject());
		})
		this._socket.on("MissedUno", () => {
			if (!this._room || !this._socket)
				throw new Error("Player hasn't joined a room.");

			this._room.log(`${this.Name} missed unum.`);
			this.addCard("stock", this._room.pickCard());
		});
	}

	/**
	 * This method updates its client with all data such as cards and the pile.
	 */
	sendData() {
		this._socket?.emit("data", { cards: this._cards, pile: this._room?.recentCard, roomState: this._room?.State, turn: this._room?.currentPlayer == this });
	}

	private throwCard(_card: Card, callback: Function) {
		if (!this._room || !this._socket)
			throw new Error("Player hasn't joined a room.");
		let card: Card = new Card(_card);
		if (!this.hasCard(_card) || this._room.currentPlayer != this) {
			callback(false);
			this._socket.emit("Disconnect", { error: 423, reason: "Cheating is not allowed." });
			this._socket.disconnect(true);
			this._room.warn(this.Name + " is cheating.");
		}

		if (card.CanMatch(this._room.recentCard)) {

			this._room.addToPile(card);
			this.removeCard(card);
			callback(true);
			if (this.CardCount == 1) {
				this._room.log(`${this.Name} has unum.`);
				this._socket.emit("CallUno");
			}

			this._socket.emit("EndTurn");

			if (this.CardCount == 0) {
				this._room.endGame(this);
				return;
			}

			if (card.Sign == "skip")
				this._room.nextTurn();

			else if (card.Sign == "reverse")
				this._room.changeDirection();

			this._room.endTurn(card.Penalty);
		}
		else
			callback(false);
	}

	public takeCard() {
		if (!this._room || !this._socket)
			throw new Error("Player hasn't joined a room.");

		if (this._cards.some(card => card.CanMatch(this._room?.recentCard))) {
			this._room.warn("Player " + this.Name + " has matching cards, but tried to draw anyway.");
			this._socket.emit("InvalidDraw");
			return;
		}
		let card = this._room.pickCard();
		let cards = [card];
		while (!card.CanMatch(this._room.recentCard)) {
			card = this._room.pickCard();
			cards.push(card);
		}

		this.addCard("stock", ...cards);
	}

	public takeTurn() {
		if (!this._room || !this._socket)
			throw new Error("Player hasn't joined a room.");

		this._socket.emit("Turn");
	}

	public toPublicObject() {
		return { ID: this.ID, Name: this.Name, Cards: this.CardCount, Host: this.Host }
	}
}