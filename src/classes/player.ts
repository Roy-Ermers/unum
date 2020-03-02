import SocketIO from "socket.io";
import Card from "./card";

export default class Player {
	private _socket: SocketIO.Socket;
	private _name: string;

	private _cards: Card[] = [];

	public get SocketID() {
		return this._socket?.id ?? "none";
	}
	public get CardCount() {
		return this._cards.length;
	}
	public get Name() {
		return this._name;
	}

	constructor(socket: SocketIO.Socket, name: string) {
		this._socket = socket;

		this._name = name;
	}

	public AddCard(...Card: Card[]) {
		this._cards.push(...Card);
		this._socket.emit("AddedCard", Card);
	}

	setupEvents() {
		this._socket.on("getCards", callback => callback(this._cards));
	}
}