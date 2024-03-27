import { WebSocketServer, WebSocket } from 'ws';
import Game from './game';



const wss = new WebSocketServer({ port: 34503 });

const games = {};

wss.on('connection', function connection(ws: WebSocket) {
  ws.game = undefined;

  ws.on('message', function message(dataRaw) {
	dataRaw = dataRaw.toString();
    try {
      let data: string[] = dataRaw.split(" ", 2);
      switch(data[0]) {
        case "create":
        case "join":
        case "spectate":
          if (ws.game)
            ws.game.disconnect(ws);
          switch(data[0]) {
            case "create":
              ws.game = new Game(ws, data[1]);
              games[ws.game.id] = ws.game;
              break;
            case "join":
            case "spectate":
              data = dataRaw.split(" ", 3);
              if (!games[data[1]])
                return ws.send("error Game not found");
              games[data[1]][data[0]](ws, data[2]); // call .join or .spectate
          }
          break;
        default:
          if (!ws.game || !ws.game.handleMessage(ws, data))
            ws.send("error Invalid command");
      }
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
  });
});