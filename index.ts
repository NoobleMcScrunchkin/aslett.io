import path from 'path';
import express from 'express';
import serveIndex from 'serve-index';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'colyseus';
import { monitor } from '@colyseus/monitor';
import { GameRoom } from "./rooms/GameRoom";

const port = Number(process.env.PORT || 80) + Number(process.env.NODE_APP_INSTANCE || 0);
const app = express();

app.use(cors());
app.use(express.json());

const gameServer = new Server({
  server: createServer(app),
  express: app,
});

gameServer.define("Game", GameRoom);

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/static/GameRoom.html'));
});
app.get('/res/grid.png', function(req, res) {
    res.sendFile(path.join(__dirname + '/res/grid.png'));
});
app.get('/res/gridDark.png', function(req, res) {
    res.sendFile(path.join(__dirname + '/res/gridDark.png'));
});
app.get('/res/jscolor.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/res/jscolor.js'));
});

app.use('/colyseus', monitor(gameServer));

gameServer.onShutdown(function(){
  console.log(`\x1b[31mStopping!\x1b[37m`);
});

gameServer.listen(port);

console.log(`\x1b[34mListening on \x1b[32mhttp://localhost:${ port }\x1b[37m`);
