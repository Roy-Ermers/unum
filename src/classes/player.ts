import SocketIO from "socket.io";
import Card from "./card";

export default class Player {
	private _socket: SocketIO.Socket;
	private _name: string;
	public Cards: Card[] = [new Card("special", "4")];

	public get Name() {
		return this._name;
	}

	constructor(socket: SocketIO.Socket, name: string) {
		this._socket = socket;
		this._name = name;
	}
}