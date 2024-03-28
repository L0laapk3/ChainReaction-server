import { v4 as uuidv4 } from 'uuid';
import { split } from './util';



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
	hasMadeFirstMove: boolean = false;
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
		try {
			this.options = JSON.parse(optionsStr ?? "{}");
			this.options.width ??= 6;
			this.options.height ??= 5;
			this.options.players ??= 2;
		} catch (e) {
			ws.send("error Invalid options");
		}

		this.id = uuidv4();

		this.board = new Array(this.options.height).fill(0).map(() => new Array(this.options.width).fill(0).map(() => new Cell()));
		this.nextPlayer = 1 + Math.floor(Math.random() * this.options.players);

		ws.send(this.id);
	}

	join(ws: CustomWebSocket, name: string) {
		if (this.players.length >= this.options.players) {
			ws.send("error Game full");
			return;
		}
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

		let bombCounts = "", playerCells = "";
		for (let y = 0; y < this.options.height; y++)
			for (let x = 0; x < this.options.width; x++) {
				bombCounts  = this.board[y][x].bombs     .toString() + bombCounts;
				playerCells = this.board[y][x].lastPlayer.toString() + playerCells;
			}
		let state = `${this.ply} ${this.nextPlayer} ${bombCounts} ${playerCells}`;
		if (this.winner != -1)
			state += ` ${this.winner}`;

		wsa.forEach((ws) => {
			ws.send(state);
		});
	}

	handleMessage(ws: CustomWebSocket, command: string, data: string): boolean {
		switch(command) {
			case "move":
				if (this.players.length != this.options.players) {
					ws.send("error Not all players have joined");
					return true;
				}
				if (this.winner != -1) {
					ws.send("error Game has ended");
					return true;
				}
				const [key, data1] = split(data, " ", 2); {
					const activePlayer = this.players[this.nextPlayer - 1];
					if (activePlayer.key != key) {
						ws.send("error Invalid key or not your turn");
						return true;
					}
					const cellI = parseInt(data1);
					if (cellI < 0 || cellI >= this.options.width * this.options.height) {
						ws.send("error Invalid cell index");
						return true;
					}
					const x = cellI % this.options.width, y = Math.floor(cellI / this.options.width);
					const cell = this.board[y][x];
					if (cell.lastPlayer != 0 && cell.lastPlayer != this.nextPlayer) {
						ws.send("error Cell owned by another player");
						return true;
					}
					// actually execute move
					cell.bombs++;
					cell.lastPlayer = this.nextPlayer;
					let modified, chainCount = 0;
					do {
						modified = false;
						for (let y = 0; y < this.options.height; y++)
							for (let x = 0; x < this.options.width; x++) {
								const cell = this.board[y][x];
								let neighbors: Cell[] = [];
								for (let [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]])
									if (x + dx >= 0 && x + dx < this.options.width && y + dy >= 0 && y + dy < this.options.height)
										neighbors.push(this.board[y + dy][x + dx]);
								if (cell.bombs >= neighbors.length) {
									cell.bombs -= neighbors.length;
									cell.lastPlayer = cell.bombs ? this.nextPlayer : 0;
									for (let neighbor of neighbors) {
										neighbor.bombs++;
										neighbor.lastPlayer = this.nextPlayer;
									}
									modified = true;
								}
							}
					} while (modified && chainCount++ < 10000);
					this.ply++;
					this.players[this.nextPlayer - 1].hasMadeFirstMove = true;

					// advance player and check for winner
					const thisPlayer = this.nextPlayer;
					playerLoop:
					while (true) {
						this.nextPlayer = (this.nextPlayer % this.options.players) + 1;
						if (this.nextPlayer == thisPlayer) {
							this.winner = thisPlayer;
							break;
						}
						// check if player has yet to make first move
						if (!this.players[this.nextPlayer - 1].hasMadeFirstMove)
							break;
						// check if player has any cells left
						for (let y = 0; y < this.options.height; y++)
							for (let x = 0; x < this.options.width; x++) {
								const cell = this.board[y][x];
								if (cell.lastPlayer == this.nextPlayer)
									break playerLoop;
							}
					}

					this.sendState();
					return true;
				}

				break;
		}
		return false;
	}

}