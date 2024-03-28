import { WebSocketServer } from 'ws';
import { Game, CustomWebSocket } from './game';
import { split } from './util';



const wss = new WebSocketServer({ port: 34503 });

const games = {};

wss.on('connection', function connection(ws: CustomWebSocket) {
	ws.game = undefined;

	ws.on('message', function message(data) {
		try {
			const [command, data1] = split(data.toString(), " ", 2);

			if (command == "create") {
				const game = new Game(ws, data1);
				games[game.id] = game;
				return;
			}

			if ((command == "create" || command == "join") && ws.game)
				ws.game.disconnect(ws);

			const [gameId, data2] = split(data1, " ", 2);
			const game = games[gameId];
			if (!game)
				return ws.send("error Game not found");

			if (command == "join")
				game.join(ws, data2);
			else if (command == "spectate")
				game.spectate(ws);
			else if (!game.handleMessage(ws, command, data2))
				ws.send("error Invalid command");

		} catch (e) {
			console.error(e);
			ws.send("error (server error: pester server host for details)");
		}
	});

	// Heartbeat to keep socket connections alive
	const pingIntv = setInterval(() => {
		ws.ping();
	}, 55 * 1000);
	ws.on('close', () => {
		clearInterval(pingIntv);

		// disconnect from game
		if (ws.game)
			ws.game.disconnect(ws);
	});
});