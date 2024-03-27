import { v4 as uuidv4 } from 'uuid';



export interface CustomWebSocket extends WebSocket {
	game: Game | undefined;
}

export interface Options {
	width: number;
	height: number;
	players: number;
}

export class Cell {
	bombs: number = 0;
	lastPlayer: number = 0;
}

export class Player {
	name: string;
	key: string;
	alive: boolean = true;
	constructor(name: string) {
		this.name = name;
		this.key = uuidv4();
	}
	toString() {
		return this.name;
	}
}

export class Game {
	id: string;

	options: Options;

	players: Player[] = [];
	subscribers: CustomWebSocket[] = [];

	board: Cell[][];

	nextPlayer: number;
	ply: number = 0;
	winner: number = -1;

	constructor(ws: CustomWebSocket, optionsStr: string) {
		this.id = uuidv4();

		this.options = JSON.parse(optionsStr);
		this.options.width ??= 6;
		this.options.height ??= 5;
		this.options.players ??= 2;

		this.board = new Array(this.options.height).fill(0).map(() => new Array(this.options.width).fill(0).map(() => new Cell()));
		this.nextPlayer = Math.floor(Math.random() * this.options.players);

		ws.send(this.id);
	}

	join(ws: CustomWebSocket, name: string) {
		const player = new Player(name);
		this.players.push(player);
		this.spectate(ws, `${this.players.length} ${player.key} `);
	}

	spectate(ws: CustomWebSocket, message: string = "") {
		ws.game = this;
		this.subscribers.push(ws);
		ws.send(`${message}${this.options.players} ${this.options.width} ${this.options.height}`);
		this.sendState();
	}

	disconnect(ws: CustomWebSocket) {
		ws.game = undefined;
		this.subscribers.splice(this.subscribers.indexOf(ws), 1);
	}

	sendState(wsa: CustomWebSocket[] | undefined = undefined) {
		if (this.players.length != this.options.players)
			return;
		wsa ??= this.subscribers;

		let state: string;
		if (this.winner != -1)
			state = `${this.ply} ${this.winner}`;
		else {
			let bombCounts = "", playerCells = "";
			for (let y = 0; y < this.options.height; y++)
				for (let x = 0; x < this.options.width; x++) {
					bombCounts += this.board[y][x].bombs;
					playerCells += this.board[y][x].lastPlayer;
				}
			state = `${this.ply} ${this.nextPlayer} ${bombCounts} ${playerCells}`;
		}

		wsa.forEach((ws) => {
			ws.send(state);
		});
	}

	handleMessage(ws: CustomWebSocket, command: string, data: string[]) {
		// TODO
	}

}