/**
 * @type {SocketIO.Socket}
 */
let socket;
function JoinGame() {
	let socketID = localStorage.getItem("SocketID");
	const Name = localStorage.getItem("name");
	if (!socketID || !Name) {
		location.href = "../";
		return;
	}
	// @ts-ignore
	socket = io("/" + socketID);
	socket.on("connect", () => {
		console.log("Connection established.");
	});
	socket.on("connect_error", () => location.href = "../");
	socket.on("connect_timeout", () => location.href = "../");


	socket.on("Authenticate", (callback) => {
		console.log("Authenticating.");
		callback({ Name });
	});
	socket.on("Authenticated", () => console.log("Authenticated."));
	socket.on("Disconnect", (reason) => {
		alert(`Connection lost.\nreason: ${reason.reason || "none"}`);
		location.href = "../";
	});
}

function fetchGameInfo() {
	socket.emit("info", console.log);
}
JoinGame();