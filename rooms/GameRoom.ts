import { Room, Client } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class Player extends Schema {
    colors = ['red', 'green', 'yellow', 'blue', 'cyan', 'magenta'];

    @type("number")
    x = Math.floor(Math.random() * 400);

    @type("number")
    y = Math.floor(Math.random() * 400);

    velocity = {
        x: 0,
        y: 0
    };

    acceleration = {
        x: 0,
        y: 0
    };

    @type("string")
    color = this.colors[Math.floor(Math.random() * this.colors.length)];

    @type("string")
    name = "Player";

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
        if (this.x > 1000) {
            this.x = 1000;
        }
        if (this.y > 1000) {
            this.y = 1000;
        }
    }
}

export class Bullet extends Schema {
    @type("number")
    x = 0;

    @type("number")
    y = 0;

    @type("number")
    damage = 0;

    @type("number")
    speed = 0;
}

export class State extends Schema {
    @type({ map: Player })
    players = new MapSchema<Player>();

    bullets = new ArraySchema<Bullet>();

    createPlayer (id: string) {
        this.players[ id ] = new Player();
    }

    removePlayer (id: string) {
        delete this.players[ id ];
    }
}

export class GameRoom extends Room<State> {
    maxClients = 10;
    gameInterval = undefined;

    onCreate (options) {
        console.log("StateHandlerRoom created!", options);

        this.setState(new State());

        this.gameInterval = setInterval(this.gameLoop.bind(this), 1000 / 60);
    }

    onJoin (client: Client) {
        this.state.createPlayer(client.sessionId);
        console.log(this.state.players[client.sessionId].name, "Joined.");
        this.broadcast((this.state.players[client.sessionId].name + " Joined."));
    }

    onLeave (client) {
        console.log(this.state.players[client.sessionId].name, "Left.");
        this.broadcast((this.state.players[client.sessionId].name + " Left."));
        this.state.removePlayer(client.sessionId);
    }

    onMessage (client, packet) {
        let id = packet.id;
        let data = packet.data;

        switch(id) {
            case "KeyDown": {
                switch(data.key) {
                    case 37: {
                        this.state.players[client.sessionId].acceleration.x = -1;
                        break;
                    }
                    case 38: {
                        this.state.players[client.sessionId].acceleration.y = -1;
                        break;
                    }
                    case 39: {
                        this.state.players[client.sessionId].acceleration.x = 1;
                        break;
                    }
                    case 40: {
                        this.state.players[client.sessionId].acceleration.y = 1;
                        break;
                    }
                }
                break;
            }
            case "KeyUp": {
                switch(data.key) {
                    case 37: {
                        if(this.state.players[client.sessionId].acceleration.x == -1)
                            this.state.players[client.sessionId].acceleration.x = 0;
                        break;
                    }
                    case 38: {
                        if(this.state.players[client.sessionId].acceleration.y == -1)
                            this.state.players[client.sessionId].acceleration.y = 0;
                        break;
                    }
                    case 39: {
                        if(this.state.players[client.sessionId].acceleration.x == 1)
                            this.state.players[client.sessionId].acceleration.x = 0;
                        break;
                    }
                    case 40: {
                        if(this.state.players[client.sessionId].acceleration.y == 1)
                            this.state.players[client.sessionId].acceleration.y = 0;
                        break;
                    }
                }
                break;
            }
            case "Message": {
                console.log("Message: " + data);
                this.broadcast(data);
                break;
            }
            case "Name": {
                this.broadcast(this.state.players[client.sessionId].name + " changed their name to " + data + ".");
                this.state.players[client.sessionId].name = data;
            }
        }
    }

    onDispose () {
        console.log("Dispose StateHandlerRoom");
        clearInterval(this.gameInterval);
    }

    gameLoop() {
        for(let id in this.state.players) {
            let player = this.state.players[id];
            player.movePlayer();
        }
    }
}
