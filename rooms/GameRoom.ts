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
        this.velocity.x = (this.velocity.x + this.acceleration.x) * 0.9;
        this.x += this.velocity.x;

        this.velocity.y = (this.velocity.y + this.acceleration.y) * 0.9;
        this.y += this.velocity.y;
    }
}

export class State extends Schema {
    @type({ map: Player })
    players = new MapSchema<Player>();

    createPlayer (id: string) {
        this.players[ id ] = new Player();
        console.log(this.players[ id ].color);
    }

    removePlayer (id: string) {
        delete this.players[ id ];
    }
}

export class GameRoom extends Room<State> {
    maxClients = 420;
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
                        this.state.players[client.sessionId].acceleration.x = -2;
                        break;
                    }
                    case 38: {
                        this.state.players[client.sessionId].acceleration.y = -2;
                        break;
                    }
                    case 39: {
                        this.state.players[client.sessionId].acceleration.x = 2;
                        break;
                    }
                    case 40: {
                        this.state.players[client.sessionId].acceleration.y = 2;
                        break;
                    }
                }
                break;
            }
            case "KeyUp": {
                switch(data.key) {
                    case 37: {
                        if(this.state.players[client.sessionId].acceleration.x == -2)
                            this.state.players[client.sessionId].acceleration.x = 0;
                        break;
                    }
                    case 38: {
                        if(this.state.players[client.sessionId].acceleration.y == -2)
                            this.state.players[client.sessionId].acceleration.y = 0;
                        break;
                    }
                    case 39: {
                        if(this.state.players[client.sessionId].acceleration.x == 2)
                            this.state.players[client.sessionId].acceleration.x = 0;
                        break;
                    }
                    case 40: {
                        if(this.state.players[client.sessionId].acceleration.y == 2)
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
