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
        if (this.x > 10000) {
            this.x = 10000;
        }
        if (this.y > 10000) {
            this.y = 10000;
        }
    }
}

export class State extends Schema {
    @type({ map: Player })
    players = new MapSchema<Player>();

    createPlayer (id: string, name: string, colour: string) {
        this.players[ id ] = new Player(name, colour);
    }

    removePlayer (id: string) {
        delete this.players[ id ];
    }
}

export class GameRoom extends Room<State> {
    maxClients = 10;
    gameInterval = undefined;

    onCreate (options) {
        console.log("\x1b[32mGameRoom \x1b[34mcreated!\x1b[37m");

        this.setState(new State());

        this.gameInterval = setInterval(this.gameLoop.bind(this), 1000 / 60);
    }

    onJoin (client: Client, options) {
        this.state.createPlayer(client.sessionId, options.name, options.colour);
        console.log("\x1b[31m" + client.sessionId + "\x1b[37m ('\x1b[32m" + this.state.players[client.sessionId].name + "\x1b[37m') \x1b[34mJoined.\x1b[37m");
        if (this.state.players[client.sessionId].name == "") {
            this.broadcast(("Player Joined."));
        } else {
            this.broadcast((this.state.players[client.sessionId].name + " Joined."));
        }
    }

    onLeave (client) {
        console.log("\x1b[31m" + client.sessionId + "\x1b[37m ('\x1b[32m" + this.state.players[client.sessionId].name + "\x1b[37m') \x1b[31mLeft.\x1b[37m");
        if (this.state.players[client.sessionId].name == "") {
            this.broadcast(("Player Left."));
        } else {
            this.broadcast((this.state.players[client.sessionId].name + " Left."));
        }
        this.state.removePlayer(client.sessionId);
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
