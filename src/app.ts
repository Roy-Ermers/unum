import express from "express";
import SocketIO from "socket.io";
import { RoomManager } from "./classes/RoomManager";
import logger from "./logger";
const App = express();

App.use(express.static("static", { extensions: ["html", "htm"] }));
App.use("*", (req, res) => {
	res.status(404).send("Not found");
});
App.get("/logs", (req, res) => res.send(logger.log));

console.log(`Uno listening on ${process.env.PORT ?? 8080}`);
const IO = SocketIO(App.listen(process.env.PORT ?? 8080));

RoomManager.Initialize(IO);