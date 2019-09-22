import { Room, Client } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
var rooms = new Array;

var getTs = function () {
    let tsObj = new Date();

    let hours = tsObj.getHours();
    let minutes = tsObj.getMinutes();
    let seconds = tsObj.getSeconds();
    let hoursS = "";
    let minutesS = "";
    let secondsS = "";

    if (hours < 10) {
        hoursS = "0" + hours.toString();
    } else {
        hoursS = hours.toString();
    }
    if (minutes < 10) {
        minutesS = "0" + minutes.toString();
    } else {
        minutesS = minutes.toString();
    }
    if (seconds < 10) {
        secondsS = "0" + seconds.toString();
    } else {
        secondsS = seconds.toString();
    }

    return "\x1b[37m[" + hoursS + ":" + minutesS + ":" + secondsS + "]";
}

export class Player extends Schema {
    @type("number")
    x = Math.floor(Math.random() * 100);

    @type("number")
    y = Math.floor(Math.random() * 100);

    velocity = {
        x: 0,
        y: 0
    };

    acceleration = {
        x: 0,
        y: 0
    };

    @type("string")
    colour = "#FFFFFF"

    @type("string")
    name = "Player";

    constructor(name, colour) {
        super(name, colour);
        this.name = name.substring(0, 16);
        this.colour = "#" + colour;
    }

    movePlayer() {
        this.velocity.x = (this.velocity.x + (this.acceleration.x * 1.5)) * 0.8;
        this.x += this.velocity.x;

        this.velocity.y = (this.velocity.y + (this.acceleration.y * 1.5)) * 0.8;
        this.y += this.velocity.y;

        if (this.velocity.x < 0.001 && this.velocity.x > -0.001) {
            this.velocity.x = 0;
        } else if (this.velocity.y < 0.001 && this.velocity.y > -0.001) {
            this.velocity.y = 0;
        }

        if (this.x < 0) {
            this.x = 0;
        }
        if (this.y < 0) {
            this.y = 0;
        }
        if (this.x > 1000-100) {
            this.x = 1000-100;
        }
        if (this.y > 1000-100) {
            this.y = 1000-100;
        }
    }
}

export class Obstacle extends Schema {
    @type("number")
    x = 0;
    @type("number")
    y = 0;
    @type("number")
    w = 0;
    @type("number")
    h = 0;

    constructor(x, y, w, h) {
        super(x, y, w, h);
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
}

export class State extends Schema {
    @type({ map: Player })
    players = new MapSchema<Player>();
    clients = new Array();

    createPlayer (client: Client, name: string, colour: string) {
        if(colour == "FF0000" || colour == "0000FF") {
            this.players[client.sessionId] = new Player(name, colour);
            this.clients[client.sessionId] = client;
        }
    }

    removePlayer (id: string) {
        delete this.players[id];
        delete this.clients[id];
    }

    @type({ map: Obstacle })
    obstacles = new MapSchema<Obstacle>();

    createObstacle (id: string, x: number, y: number, w: number, h: number) {
        this.obstacles[ id ] = new Obstacle(x, y, w, h);
    }

    removeObstacle (id: string) {
        delete this.obstacles[ id ];
    }
}

export class GameRoom extends Room<State> {
    maxClients = 4;
    gameInterval = undefined;

    onCreate (options) {
        rooms[this.roomId] = this;
        console.log(getTs(), "\x1b[32mGameRoom \x1b[34mcreated!\x1b[37m");

        this.setState(new State());

        this.state.createObstacle("0", 0, 0, 1000, 1);
        this.state.createObstacle("1", 0, 0, 1, 1000);
        this.state.createObstacle("2", 1000, 0, 1, 1000);
        this.state.createObstacle("3", 0, 1000, 1000, 1);

        this.gameInterval = setInterval(this.gameLoop.bind(this), 1000 / 60);
    }

    onJoin (client: Client, options) {
        this.state.createPlayer(client, options.name, options.colour);
        try {
            console.log(getTs(), "\x1b[31m" + client.sessionId + "\x1b[37m ('\x1b[32m" + this.state.players[client.sessionId].name + "\x1b[37m') \x1b[34mJoined.\x1b[37m");
            if (this.state.players[client.sessionId].name == "") {
                this.broadcast(("Player Joined."));
            } else {
                this.broadcast((this.state.players[client.sessionId].name + " Joined."));
            }
        } catch {
            client.close();
            this.state.removePlayer(client.sessionId);
            console.log(getTs(), "\x1b[31mPlayer joined with bad data.\x1b[37m");
        }
    }

    onLeave (client) {
        try {
            console.log(getTs(), "\x1b[31m" + client.sessionId + "\x1b[37m ('\x1b[32m" + this.state.players[client.sessionId].name + "\x1b[37m') \x1b[31mLeft.\x1b[37m");
            if (this.state.players[client.sessionId].name == "") {
                this.broadcast(("Player Left."));
            } else {
                this.broadcast((this.state.players[client.sessionId].name + " Left."));
            }
            this.state.removePlayer(client.sessionId);
        } catch {}
    }

    onMessage (client, packet) {
        let id = packet.id;
        let data = packet.data;

        switch(id) {
            case "KeyDown": {
                switch(data.key) {
                    case 37:
                    case 65: {
                        this.state.players[client.sessionId].acceleration.x = -1;
                        break;
                    }
                    case 38:
                    case 87: {
                        this.state.players[client.sessionId].acceleration.y = -1;
                        break;
                    }
                    case 39:
                    case 68: {
                        this.state.players[client.sessionId].acceleration.x = 1;
                        break;
                    }
                    case 40:
                    case 83: {
                        this.state.players[client.sessionId].acceleration.y = 1;
                        break;
                    }
                }
                break;
            }
            case "KeyUp": {
                switch(data.key) {
                    case 37:
                    case 65: {
                        if(this.state.players[client.sessionId].acceleration.x == -1)
                            this.state.players[client.sessionId].acceleration.x = 0;
                        break;
                    }
                    case 38:
                    case 87: {
                        if(this.state.players[client.sessionId].acceleration.y == -1)
                            this.state.players[client.sessionId].acceleration.y = 0;
                        break;
                    }
                    case 39:
                    case 68: {
                        if(this.state.players[client.sessionId].acceleration.x == 1)
                            this.state.players[client.sessionId].acceleration.x = 0;
                        break;
                    }
                    case 40:
                    case 83: {
                        if(this.state.players[client.sessionId].acceleration.y == 1)
                            this.state.players[client.sessionId].acceleration.y = 0;
                        break;
                    }
                }
                break;
            }
            case "Message": {
                console.log(getTs(), "\x1b[34mMessage: \x1b[32m" + data + "\x1b[37m");
                this.broadcast(data);
                break;
            }
        }
    }

    onDispose () {
        console.log(getTs(), "\x1b[32mGameRoom \x1b[31mRemoved\x1b[37m");
        rooms = rooms.splice(rooms[this.roomId]);
        clearInterval(this.gameInterval);
    }

    gameLoop() {
        for(let id in this.state.players) {
            let player = this.state.players[id];
            player.movePlayer();
        }
    }
}

const stdin = process.stdin;
const commands = {
        "bc / broadcast": "Sends message to all rooms",
        "bcroom / broadcastroom": "Sends message to a specific room",
        "listclients": "Shows a list of each clients per room (Room Id can be specified to show clients in a particular room)",
        "listrooms": "Shows a list of game rooms",
        "kickclient": "Kicks a client from a room (kickclient [Room Id] [Client Id])",
        "delroom": "Removes a room from the server (delroom [Room Id])",
        "stop / exit": "Kills the server"
};

process.on("SIGINT", function () {
    for (let room in rooms) {
        rooms[room].broadcast("Server Stopped.");
    }
    console.log(getTs(), `\x1b[31mStopping!\x1b[37m`);
    process.exit();
});

stdin.on('data', function(data) {
    if (process.platform == "win32") {
        data = data.toString().substring(0, data.toString().length - 2).split(" ");
    } else{
        data = data.toString().substring(0, data.toString().length - 1).split(" ");
    }
    let command = data[0].toLowerCase();
    if (command == 'exit' || command == 'stop') {
        for (let room in rooms) {
            rooms[room].broadcast("Server Stopped.");
        }
        console.log(getTs(), `\x1b[31mStopping!\x1b[37m`);
        process.exit();
    } else if (command == 'bcroom' || command == "broadcastroom") {
        if (data.length != 2) {
            let message = "";
            for (let i = 2; i < data.length; i++) {
                message += data[i] + " ";
            }
            if (rooms[data[1]] != undefined) {
                rooms[data[1]].broadcast("Server> " + message);
                console.log(getTs(), "\x1b[34mBroadcast (" + rooms[data[1]].roomId + "): \x1b[32mServer> " + message + "\x1b[37m");
            } else {
                console.log(getTs(), "\x1b[31mRoom does not exist.\x1b[37m")
            }
        } else {
            console.log(getTs(), "\x1b[31mMissing Argument(s)\x1b[37m");
        }
    } else if (command == 'bc' || command == "broadcast") {
        if (data.length != 1) {
            let message = "";
            for (let i = 1; i < data.length; i++) {
                message += data[i] + " ";
            }
            for (let room in rooms) {
                rooms[room].broadcast("Server> " + message);
            }
            console.log(getTs(), "\x1b[34mBroadcast: \x1b[32mServer> " + message + "\x1b[37m")
        } else {
            console.log(getTs(), "\x1b[31mMissing Argument(s)\x1b[37m");
        }
    } else if (command == 'delroom') {
        if (data.length != 1) {
            if (rooms[data[1]] != undefined) {
                rooms[data[1]].broadcast("Server Stopped.");
                rooms[data[1]].disconnect();
                console.log(getTs(), "\x1b[32mRoom deleted.\x1b[37m")
                rooms = rooms.splice(rooms[data[1]]);
            } else {
                console.log(getTs(), "\x1b[31mRoom does not exist.\x1b[37m")
            }
        } else {
            console.log(getTs(), "\x1b[31mMissing Argument(s)\x1b[37m");
        }
    } else if (command == 'kickclient') {
        if (data.length != 2) {
            if (rooms[data[1]] != undefined) {
                if (rooms[data[1]].state.clients[data[2]] != undefined) {
                    rooms[data[1]].broadcast(rooms[data[1]].state.players[data[2]].name + " was kicked.");
                    rooms[data[1]].state.clients[data[2]].close();
                } else {
                    console.log(getTs(), "\x1b[31mClient does not exist.\x1b[37m")
                }
            } else {
                console.log(getTs(), "\x1b[31mRoom does not exist.\x1b[37m")
            }
        } else {
            console.log(getTs(), "\x1b[31mMissing Argument(s)\x1b[37m");
        }
    } else if (command == 'listrooms') {
        let message = "";
        for (let room in rooms) {
            message += "\x1b[32m" + rooms[room].roomId + "\x1b[37m, ";
        }
        message = message.substring(0, message.length - 2);
        if (message != "") {
            console.log(getTs(), message);
        } else {
            console.log(getTs(), "\x1b[31mNo rooms.\x1b[37m")
        }
    } else if (command == 'listclients') {
        let message = "";
        if (data[1] != undefined) {
            if (rooms[data[1]] != undefined) {
                for (let player in rooms[data[1]].state.players) {
                    message += getTs() + " \x1b[32m" + player + " \x1b[37m: \x1b[34m'" + rooms[data[1]].state.players[player].name + "'\n";
                }
                message += "\x1b[37m";
            } else {
                console.log(getTs(), "\x1b[31mRoom does not exist.\x1b[37m")
            }
        } else {
            for (let room in rooms) {
                message += getTs() + " \x1b[35mRoom\x1b[37m: \x1b[31m" + rooms[room].roomId + "\n";
                for (let player in rooms[room].state.players) {
                    message += getTs() + " \x1b[35mClient\x1b[37m: \x1b[32m" + player + " \x1b[37m: \x1b[34m'" + rooms[room].state.players[player].name + "'\n";
                }
                message += "\x1b[37m";
            }
        }
        if (message != "") {
            console.log(message);
        } else {
            console.log(getTs(), "\x1b[31mNo clients.\x1b[37m")
        }
    } else if (command == 'help' || command == "?") {
        for (let command in commands) {
            console.log(getTs(), "\x1b[31m" + command + "\x1b[37m: \x1b[32m" + commands[command] + "\x1b[37m");
        }
    } else {
        console.log(getTs(), "\x1b[31mCommand not found '" + command + "'\x1b[37m");
    }
});
