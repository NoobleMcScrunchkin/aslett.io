import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

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

    movePlayer() {
        this.velocity.x = (this.velocity.x + (this.acceleration.x * 1)) * 0.9;
        this.x += this.velocity.x;

        this.velocity.y = (this.velocity.y + (this.acceleration.y * 1)) * 0.9;
        this.y += this.velocity.y;

        if (this.x < 0) {
            this.x = 0;
        }
        if (this.y < 0) {
            this.y = 0;
        }
    }
}

export class State extends Schema {
    @type({ map: Player })
    players = new MapSchema<Player>();

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
    }

    onLeave (client) {
        this.state.removePlayer(client.sessionId);
    }

    onMessage (client, packet) {
        console.log("StateHandlerRoom received message from", client.sessionId, ":", packet);
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
