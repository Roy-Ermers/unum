import express from "express";
import SocketIO from "socket.io";
import { RoomManager } from "./classes/RoomManager";

const App = express();

App.use(express.static("static", { extensions: ["html", "htm"] }));
App.use(SocketIO);


console.log(`Uno listening on ${process.env.PORT ?? 8080}`);
const IO = SocketIO(App.listen(process.env.PORT ?? 8080));

RoomManager.Initialize(IO);