"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let stock = [];
class Card {
    constructor(color, sign, penalty) {
        if (typeof color == "object") {
            this.Color = color.Color;
            this.Sign = color.Sign;
            this.Penalty = color.Penalty;
        }
        else if (sign) {
            this.Color = color;
            this.Sign = sign;
            this.Penalty = penalty !== null && penalty !== void 0 ? penalty : 0;
        }
        else
            throw new TypeError("Missing sign.");
    }
    CanMatch(card) {
        if (this.Color == "special")
            return true;
        if (card.Color == this.Color)
            return true;
        if (card.Sign == this.Sign)
            return true;
        return false;
    }
    static PlayCards() {
        if (stock.length == 0) {
            let colors = ["blue", "green", "red", "yellow"];
            for (let color = 0; color < colors.length; color++) {
                stock.push(new Card("special", "color"));
                stock.push(new Card("special", "4", 4));
                stock.push(new Card(colors[color], "0"));
                for (let two = 0; two < 2; two++) {
                    for (let numbers = 1; numbers < 10; numbers++) {
                        stock.push(new Card(colors[color], numbers.toString()));
                    }
                    stock.push(new Card(colors[color], "skip"));
                    stock.push(new Card(colors[color], "skip"));
                    stock.push(new Card(colors[color], "reverse"));
                    stock.push(new Card(colors[color], "reverse"));
                    stock.push(new Card(colors[color], "picker", 2));
                    stock.push(new Card(colors[color], "picker", 2));
                }
            }
        }
        return stock;
    }
}
exports.default = Card;
