import express from "express";
import SocketIO from "socket.io";
import RoomManager from "./classes/RoomManager";

import logger from "./logger";
import PlayerManager from "./classes/PlayerManager";
const App = express();

App.get("/logs", (req, res) => res.contentType("html").send(logger.Html));

App.use(express.static("static", { extensions: ["html", "htm"] }));

App.use("*", (req, res) => {
	res.status(404).send("Not found");
});

console.log(`Unum listening on ${process.env.PORT ?? 8080}`);

const IO = SocketIO(App.listen(process.env.PORT ?? 8080));

PlayerManager.initialize();
RoomManager.initialize(IO);