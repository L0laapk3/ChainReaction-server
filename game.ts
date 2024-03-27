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
	lastPlayer: number = -1;
}

export class Player {
	name: string;
	key: string;
	constructor(name: string) {
		this.name = name;
		this.key = uuidv4();
	}
}

export class Game {
	subscribers: CustomWebSocket[];
	id: string;

	options: Options;

	players: Player[] = [];

	board: Cell[][];

	constructor(ws: CustomWebSocket, optionsStr: string) {
		this.id = uuidv4();
		ws.game = this;
		this.subscribers = [ws];

		this.options = JSON.parse(optionsStr);
		this.options.width ??= 6;
		this.options.height ??= 5;
		this.options.players ??= 2;

		this.board = new Array(this.options.height).fill(0).map(() => new Array(this.options.width).fill(0).map(() => new Cell()));

		ws.send(this.id);
	}

	join(ws: CustomWebSocket, name: string) {
		this.spectate(ws, name);
		const player = new Player(name);
		this.players.push(player);
	}

	spectate(ws: CustomWebSocket, name: string) {
		ws.game = this;
		this.subscribers.push(ws);
	}

	disconnect(ws: CustomWebSocket) {
		ws.game = undefined;
		this.subscribers.splice(this.subscribers.indexOf(ws), 1);
	}

	handleMessage(ws: CustomWebSocket, data: string[]) {
		// TODO
	}
}