"use strict";
// #region Elements
const staple = document.getElementById("Staple");
const stack = document.getElementsByClassName("stack")[0];
const hand = document.getElementById("Hand");
const ColorWheel = document.getElementsByClassName("ColorWheel")[0];
const players = document.getElementById("Players");
const playerTemplate = document.getElementById("PlayerTemplate");
const Notification = document.getElementById("Notification");
// #endregion

// #region Info
var Player = {
    Id: -1,
    Name: "NONAME"
}
var Game = {
    currentPlayer: -1,
    Pile: []
}
// #endregion
// #region Networking
window.WebSocket = window.WebSocket || window.MozWebSocket;
var connection = new WebSocket('ws://' + location.hostname + ':8080/ws');;

connection.onmessage = HandleMessage;

connection.onopen = () => {
    //Ask for name
    Player.Name = localStorage.getItem("PlayerName");
    while (Player.Name == "" || Player.Name == undefined)
        Player.Name = prompt("Please enter your name.");
    localStorage.setItem("PlayerName", Player.Name);
    document.title += " - " + Player.Name;
    Server.Send("PlayerJoined", {
        Player: Player.Name
    });
}
class Server {
    static Send(type, data) {

        data = data || {};
        console.log("Sent message with type: %s", type);
        data["Type"] = type;
        connection.send(JSON.stringify(data));
    }
}
// #endregion

// #region Game logic
function HandleMessage(message) {
    try {
        let data = JSON.parse(message.data);
        console.log(data);

        console.log("Recieved message of type %s", data.Type);
        switch (data.Type) {
            //get a list of all players in the game
            case "Update":
                if (data.Players) {
                    while (players.lastChild) {
                        players.removeChild(players.lastChild);
                    }
                    data.Players.forEach(Player => {
                        let player = document.importNode(playerTemplate.content, true);
                        player.firstElementChild.setAttribute("data-PlayerId", Player.Id)
                        player.querySelector("h1").textContent = Player.Name;
                        player.querySelector("p").textContent = Player.CardCount;
                        players.appendChild(player);
                    });
                }
                if (data.Pile) {
                    if (Game.Pile !== data.Pile) {
                        Game.Pile = data.Pile;
                        while (staple.lastChild) {
                            staple.removeChild(staple.lastChild);
                        }
                        data.Pile.forEach(Card => {
                            ThrowCard(Card, true);
                        });
                    }
                }
                break;
            //Gets returned when the player joins, this contains all cards the player has.
            case "PlayerInfo":
                console.log(data);
                Player = data.Info;
                data.Info.Cards.forEach(card => {
                    let img = document.createElement("img");
                    img.src = card.Image;
                    hand.appendChild(img);
                });
                if (!Player.Admin)
                    document.getElementById("Admin").remove();
                break;

            case "PlayerTurn":
                Game.currentPlayer = data.Id;
                players.querySelectorAll(`[data-playerid]`).forEach((elem) => {
                    elem.classList.toggle("turn", elem.getAttribute("data-playerid") == Game.currentPlayer);
                });
                if (Player.Id == data.Id) {
                    stack.onclick = PullRandomCard;
                    hand.classList.remove("deactivated");
                    let PossibleCards = Intersect(data.PossibleCards, Player.Cards);
                    if (!PossibleCards || PossibleCards.length == 0) {
                        stack.classList.add("possible");
                    }
                    else {
                        PossibleCards.forEach(card => {
                            let cards = hand.querySelectorAll(`img[src="${card.Image}"]`);
                            stack.classList.remove("possible");
                            cards.forEach((elem) => {
                                elem.classList.toggle("possible", true);
                                elem.onclick = (event) => ChooseCard(event, card.Color, card.Sign);
                            });
                        });
                    }
                }
                else {
                    stack.onclick = undefined;
                    let cards = Array.from(hand.children).forEach((elem) => {
                        elem.classList.toggle("possible", false);
                    });
                    stack.classList.remove("possible");
                    hand.classList.add("deactivated");
                }
                break;

            case "ThrowCard":
                console.log(data.Card);
                ThrowCard(data.Card, false);
                break;
            case "CardAdded":
                Player.Cards.push(data.Card);
                let img = document.createElement("img");
                img.src = data.Card.Image;
                hand.appendChild(img);
                break;
            case "ChangeDirection":
                players.parentElement.classList.toggle("inverted", !data.Clockwise);
                break;
        }
    } catch (e) {
        console.error("Not a valid message: %s", e);
    }

}
function PullRandomCard() {
    Server.Send("PickCard", { Id: Player.Id });
}
function ChooseCard(e, color, sign, choseColor) {
    console.log("%s %s", color, sign);
    let func = (e, color, sign) => {
        ColorWheel.classList.toggle("show", false);
        RemoveCard(Player.Cards, color, sign);
        e.target.classList.add("throw");
        setTimeout(() => {
            e.target.remove();
            Server.Send("ChooseCard", { Color: color, Sign: sign });
        }, 250);
    };
    let card;
    if (choseColor && (sign == "ColorPicker" || sign == "Plus4"))
        card = Player.Cards.find(x => x.Sign == sign);
    else
        card = Player.Cards.find(x => x.Color == color && x.Sign == sign);
    console.log(card);

    if (card.Special && !choseColor)
        if (card.Sign == "ColorPicker" || card.Sign == "Plus4") {
            ColorWheel.classList.toggle("show", true);
            ColorWheel.querySelector(".red").onclick = () => func(e, "red", sign);
            ColorWheel.querySelector(".blue").onclick = () => func(e, "blue", sign);
            ColorWheel.querySelector(".green").onclick = () => func(e, "green", sign);
            ColorWheel.querySelector(".yellow").onclick = () => func(e, "yellow", sign);
            return;
        }
    func(e, color, sign);
}

function ThrowCard(Card, removeAnimation) {
    let img = document.createElement("img");
    img.style.transform = "rotate(" + (Math.random() * 360) + "deg) translateY(" + (Math.random() * 75 - 37.5) + "%) translateX(" + (Math.random() * 75 - 37.5) + "%)";
    img.setAttribute("src", Card.Image);
    if (removeAnimation) img.style.animation = "none";
    else if ((Card.Sign == "ColorPicker" || Card.Sign == "Plus4") && Card.Color != undefined) {
        ShowNotification("The Color changed to " + Card.Color, Card.Color, 5000);
    }
    staple.appendChild(img);
}


window.onbeforeunload = (e) => {
    e.returnValue = "Are you sure you want to leave?";
    return "Are you sure you want to leave?";
};

window.onunload = () => {
    Server.Send("PlayerLeft", {
        Id: Player.Id
    });
}
//#endregion

//#region Helpers
function ConvertColor(color) {
    switch (color) {
        case "red":
            return "#954F50";
        case "blue":
            return "#00C3E5";
        case "green":
            return "#328E6C";
        case "yellow":
            return "#968E4B";

    }
}
function ShowNotification(text, color, time) {
    Notification.textContent = text;
    Notification.style.color = ConvertColor(color);
    Notification.classList.toggle("show", true);
    setTimeout(() => {
        Notification.classList.toggle("show", false);
    }, time);
}
function RemoveCard(arr, Color, Sign) {
    var i = arr.findIndex(x => x.Color == Color && x.Sign == Sign);
    if (i > -1) {
        return arr.splice(i, 1)[0];
    }
}

function Intersect(a, b) {
    var t;
    if (b.length > a.length) t = b, b = a, a = t; // indexOf to loop over shorter
    return a.filter(function (e) {
        return b.findIndex(x => x.Image == e.Image) > -1;
    });
}
function detach(node, async, fn) {
    var parent = node.parentNode;
    var next = node.nextSibling;
    // No parent node? Abort!
    if (!parent) {
        return;
    }
    // Detach node from DOM.
    parent.removeChild(node);
    // Handle case where optional `async` argument is omitted.
    if (typeof async !== "boolean") {
        fn = async;
        async = false;
    }
    // Note that if a function wasn't passed, the node won't be re-attached!
    if (fn && async) {
        // If async == true, reattach must be called manually.
        fn.call(node, reattach);
    } else if (fn) {
        // If async != true, reattach will happen automatically.
        fn.call(node);
        reattach();
    }
    // Re-attach node to DOM.
    function reattach() {
        parent.insertBefore(node, next);
    }
}
//#endregion