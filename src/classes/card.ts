let stock: Card[] = [];
export default class Card {
	public Color: string;
	public Sign: string;

	constructor(color: string, sign: string) {
		this.Color = color;
		this.Sign = sign;
	}

	static PlayCards() {
		if (stock.length == 0) {

			let colors = ["blue", "green", "red", "yellow"];
			for (let color = 0; color < colors.length; color++) {

				stock.push(new Card("special", "color"));
				stock.push(new Card("special", "4"));

				stock.push(new Card(colors[color], "0"));

				for (let two = 0; two < 2; two++) {
					for (let numbers = 1; numbers < 10; numbers++) {
						stock.push(new Card(colors[color], numbers.toString()));
					}
					stock.push(new Card(colors[color], "skip"));
					stock.push(new Card(colors[color], "skip"));

					stock.push(new Card(colors[color], "reverse"));
					stock.push(new Card(colors[color], "reverse"));

					stock.push(new Card(colors[color], "picker"));
					stock.push(new Card(colors[color], "picker"));
				}
			}
		}

		return stock;
	}
}