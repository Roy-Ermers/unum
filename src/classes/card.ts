let stock: Card[] = [];
export default class Card {
	public Color: string;
	public Sign: string;
	public Penalty: number;
	public ChosenColor?: string;

	constructor(color: string | { Color: string, Sign: string, Penalty: number, ChosenColor: string } | Card, sign?: string, penalty?: number, chosenColor?: string) {
		if (typeof color == "object") {
			this.Color = color.Color;
			this.Sign = color.Sign;
			this.Penalty = color.Penalty;
			this.ChosenColor = color.ChosenColor;
		}
		else if (sign) {
			this.Color = color;
			this.Sign = sign;
			this.Penalty = penalty ?? 0;
			this.ChosenColor = chosenColor;
		}
		else throw new TypeError("Missing sign.");
	}

	public CanMatch(card: Card) {
		if (this.Color == "wild") return true;
		if (card.ChosenColor != undefined && this.Color == card.ChosenColor) return true;
		if (card.Color == this.Color) return true;
		if (card.Sign == this.Sign) return true;

		return false;
	}

	static PlayCards() {
		if (stock.length == 0) {
			let colors = ["blue", "green", "red", "yellow"];
			for (let color = 0; color < colors.length; color++) {

				stock.push(new Card("wild", "color"));
				stock.push(new Card("wild", "draw4", 4));

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

	public Equals(card: Card) {
		return this.Color == card.Color && this.Sign == card.Sign && this.Penalty == card.Penalty;
	}
}