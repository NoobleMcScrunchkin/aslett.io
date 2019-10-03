import path from 'path';
import express from 'express';
import serveIndex from 'serve-index';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'colyseus';
import socialRoutes from "@colyseus/social/express"
import { GameRoom } from "./rooms/GameRoom";

const port = Number(process.env.PORT || 80) + Number(process.env.NODE_APP_INSTANCE || 0);
const app = express();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

app.use("/", socialRoutes);
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
app.get('/res/styles.css', function(req, res) {
    res.sendFile(path.join(__dirname + '/res/styles.css'));
});
app.get('/res/flagR.png', function(req, res) {
    res.sendFile(path.join(__dirname + '/res/flagR.png'));
});
app.get('/res/flagB.png', function(req, res) {
    res.sendFile(path.join(__dirname + '/res/flagB.png'));
});
app.get('/res/grid.png', function(req, res) {
    res.sendFile(path.join(__dirname + '/res/grid.png'));
});
app.get('/res/gridDark.png', function(req, res) {
    res.sendFile(path.join(__dirname + '/res/gridDark.png'));
});
app.get('/res/jquery.js', function(req, res) {
    res.sendFile(path.join(__dirname + '/res/jquery.js'));
});


gameServer.onShutdown(function(){
  console.log(`\x1b[31mStopping!\x1b[37m`);
});

gameServer.listen(port);

console.log(`\x1b[34mListening on \x1b[32mhttp://localhost:${ port }\x1b[37m`);
