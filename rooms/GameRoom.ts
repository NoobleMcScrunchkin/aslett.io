import { Room, Client } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

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
        this.velocity.x = (this.velocity.x + (this.acceleration.x * 1)) * 0.9;
        this.x += this.velocity.x;

        this.velocity.y = (this.velocity.y + (this.acceleration.y * 1)) * 0.9;
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

    createPlayer (id: string, name: string, colour: string) {
        if(colour == "FF0000" || colour == "0000FF")
        this.players[ id ] = new Player(name, colour);
    }

    removePlayer (id: string) {
        delete this.players[ id ];
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
    maxClients = 10;
    gameInterval = undefined;

    onCreate (options) {
        console.log("\x1b[32mGameRoom \x1b[34mcreated!\x1b[37m");

        this.setState(new State());

        this.state.createObstacle("0", 0, 0, 1000, 1);
        this.state.createObstacle("1", 0, 0, 1, 1000);
        this.state.createObstacle("2", 1000, 0, 1, 1000);
        this.state.createObstacle("3", 0, 1000, 1000, 1);

        this.gameInterval = setInterval(this.gameLoop.bind(this), 1000 / 60);
    }

    onJoin (client: Client, options) {
        this.state.createPlayer(client.sessionId, options.name, options.colour);
        try {
            console.log("\x1b[31m" + client.sessionId + "\x1b[37m ('\x1b[32m" + this.state.players[client.sessionId].name + "\x1b[37m') \x1b[34mJoined.\x1b[37m");
            if (this.state.players[client.sessionId].name == "") {
                this.broadcast(("Player Joined."));
            } else {
                this.broadcast((this.state.players[client.sessionId].name + " Joined."));
            }
        } catch {
            client.close();
            this.state.removePlayer(client.sessionId);
            console.log("\x1b[31mPlayer joined with bad data.\x1b[37m");
        }
    }

    onLeave (client) {
        try {
            console.log("\x1b[31m" + client.sessionId + "\x1b[37m ('\x1b[32m" + this.state.players[client.sessionId].name + "\x1b[37m') \x1b[31mLeft.\x1b[37m");
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
                console.log("\x1b[34mMessage: \x1b[32m" + data + "\x1b[37m");
                this.broadcast(data);
                break;
            }
        }
    }

    onDispose () {
        console.log("\x1b[32mGameRoom \x1b[31mRemoved\x1b[37m");
        clearInterval(this.gameInterval);
    }

    gameLoop() {
        for(let id in this.state.players) {
            let player = this.state.players[id];
            player.movePlayer();
        }
    }
}
