import SocketIO from "socket.io";
import Card from "./card";
import { GenerateID } from "../utils";
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

	public ClearCards() {
		this._cards = [];
	}

	public AddCard(source: string, ...Card: Card[]) {
		this._cards.push(...Card);
		this._socket.emit("AddedCard", { Card, source });
	}

	public RemoveCard(card: Card) {
		let index = this._cards.findIndex(x => card.Equals(x));
		if (index < 0)
			throw new Error("Card was not found.");

		this._cards.splice(index, 1);
	}

	public HasCard(match: Card) {
		return this._cards.some(card => card.Equals(match));
	}

	private setupEvents() {
		this._socket.on("GetCard", (callback: Function) => {
			callback(this._cards);
		});
		this._socket.on("TakeCard", () => {
			this.TakeCard();
		});
		this._socket.on("ThrowCard", (_card: Card, callback: Function) => {
			this.ThrowCard(_card, callback);
		});
		this._socket.on("CalledUno", () => {
			this._room.Log(`${this.Name} called unum.`);
			this._socket.broadcast.emit("CalledUno", this.toPublicObject());
		})
		this._socket.on("MissedUno", () => {
			this._room.Log(`${this.Name} missed unum.`);
			this.AddCard("stock", this._room.pickCard());
		});
	}

	private ThrowCard(_card: Card, callback: Function) {
		let card: Card = new Card(_card);
		if (!this.HasCard(_card) || this._room.CurrentPlayer != this) {
			callback(false);
			this._socket.emit("Disconnect", { error: 423, reason: "Cheating is not allowed." });
			this._socket.disconnect(true);
			this._room.Warn(this.Name + " is cheating.");
		}

		if (card.CanMatch(this._room.RecentCard)) {

			this._room.AddToPile(card);
			this.RemoveCard(card);
			callback(true);
			if (this.CardCount == 1) {
				this._room.Log(`${this.Name} has unum.`);
				this._socket.emit("CallUno");
			}

			this._socket.emit("EndTurn");

			if (this.CardCount == 0) {
				this._room.EndGame(this);
				return;
			}

			if (card.Sign == "skip")
				this._room.SkipTurn();

			else if (card.Sign == "reverse")
				this._room.ChangeDirection();

			this._room.NextTurn(card.Penalty);
		}
		else
			callback(false);
	}

	public TakeCard() {
		if (this._cards.some(card => card.CanMatch(this._room.RecentCard))) {
			this._room.Warn("Player " + this.Name + " has matching cards, but tried to draw anyway.");
			this._socket.emit("InvalidDraw");
			return;
		}
		let card = this._room.pickCard();

		this.AddCard("stock", card);
	}

	public TakeTurn() {
		this._socket.emit("Turn");
	}

	public toPublicObject() {
		return { ID: this.ID, Name: this.Name, Cards: this.CardCount, Host: this.Host }
	}
}