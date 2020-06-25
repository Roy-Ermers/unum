import Player from "./player";
import { Socket } from "socket.io";
import Logger from "../logger";
import { EventEmitter } from "events";

export default class PlayerManager {

	private static readonly leaveTimeout = 5000;
	private static players: Player[];
	private static leaveTimers: Map<Player, NodeJS.Timeout>;

	private static eventEmitter: EventEmitter;
	public static initialize() {
		this.players = [];
		this.leaveTimers = new Map<Player, NodeJS.Timeout>();
		this.eventEmitter = new EventEmitter();
	}

	public static on(event: "playerLeft", callback: (...args: any[]) => void) {
		this.eventEmitter.on(event, callback);
	}

	private static emit(event: "playerLeft", ...data: any[]) {
		this.eventEmitter.emit(event, ...data);
	}

	public static joinPlayer(name: string, leave?: boolean, ID?: string) {
		const oldPlayer = [...this.leaveTimers.keys()].find(x => x.Name == name);
		if (leave && oldPlayer != undefined) {
			this.emit("playerLeft", oldPlayer);
		}

		if (oldPlayer !== undefined) {
			Logger.Log(`${name} rejoined.`);
			const timerID = this.leaveTimers.get(oldPlayer);
			clearTimeout(timerID as NodeJS.Timeout);

			return oldPlayer;
		}

		Logger.Log(`New player playing ${name}.`);
		const player = new Player(name);
		if (ID)
			player.ID = ID;

		this.players.push(player);
		return player;
	}

	public static getPlayer(ID: string) {
		return this.players.find(x => x.ID == ID);
	}
	/**
	 * Call this method on players whose status is unknown to the backend.
	 * It cleans up left players.
	 * @param ID Socket or id of the player
	 */
	public static leavePlayer(ID: string | Socket) {
		let player: Player | undefined;
		if (typeof ID == "string")
			player = this.players.find(x => x.ID == ID);
		else player = this.players.find(x => x.SocketID == (ID as Socket).id)

		if (player == undefined)
			throw new Error("Player does not exist.");


		const timer = setTimeout(() => {
			this.deletePlayer(player as Player);
			this.emit("playerLeft", player);
		}, this.leaveTimeout);

		this.leaveTimers.set(player, timer);
	}
	static stopTimer(player: Player) {
		//fail silently
		if (!this.leaveTimers.has(player))
			return;
		const timerID = this.leaveTimers.get(player);
		clearTimeout(timerID as NodeJS.Timeout);
	}

	static deletePlayer(player: Player) {
		Logger.Log(`Player ${player.Name} left.`);
		this.players = this.players.filter(x => x != player);
	}
}