import { WebSocketServer } from 'ws';
import { Game, CustomWebSocket } from './game';



const wss = new WebSocketServer({ port: 34503 });

const games = {};

wss.on('connection', function connection(ws: CustomWebSocket) {
	ws.game = undefined;

	ws.on('message', function message(dataBuffer) {
		const data: String = dataBuffer.toString();
		try {
			let [command, data1] = data.split(" ", 2);

			if (command == "create") {
				games[ws.game!.id] = new Game(ws, data1);
				return;
			}

			if ((command == "create" || command == "join") && ws.game)
				ws.game.disconnect(ws);

			let [gameId, data2] = data1.split(" ", 2);
			const game = games[gameId];
			if (!game)
				return ws.send("error Game not found");

			if (command == "join")
				games[data[1]].join(ws, data2);
			else if (command == "spectate")
				games[data[1]].spectate(ws);
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