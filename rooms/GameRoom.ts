import { Room, Client } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { User, verifyToken } from "@colyseus/social";
const request = require('request');
var rooms = new Array;
var tokens = new Array;

var map = [
{type: "obstacle", x: -10, y: -10, w: 4010, h: 10, colour: "#000000", solid: true},
{type: "obstacle", x: 4000, y: -10, w: 10, h: 4020, colour: "#000000", solid: true},
{type: "obstacle", x: -10, y: -10, w: 10, h: 4010, colour: "#000000", solid: true},
{type: "obstacle", x: -10, y: 4000, w: 4010, h: 10, colour: "#000000", solid: true},
{type: "obstacle", x: 200, y: 200, w: 100, h: 100, colour: "#FF0000", solid: true},
{type: "obstacle", x: 400, y: 400, w: 100, h: 100, colour: "#FF0000", solid: true},
{type: "obstacle", x: 600, y: 200, w: 400, h: 100, colour: "#0000FF", solid: true},
{type: "rSpawn", x: 5, y: 5},
{type: "bSpawn", x: 600, y: 5},
{type: "flag", x: 15, y: 15, team: "red"},
{type: "flag", x: 410, y: 15, team: "blue"},
{type: "obstacle", x: 5, y: 5, w: 100, h: 100, colour: "#e1e1e1", solid: false},
{type: "obstacle", x: 400, y: 5, w: 100, h: 100, colour: "#e1e1e1", solid: false},
];

function collides (rect, circle, collide_inside)
{
    var half = {
        x: rect.w / 2,
        y: rect.h / 2
    };
    var center = {
        x: circle.x - (rect.x + half.x),
        y: circle.y - (rect.y + half.y)
    };
    var side = {
        x: Math.abs (center.x) - half.x,
        y: Math.abs (center.y) - half.y
    };

    if (side.x >  circle.r || side.y >  circle.r)
        return false;
    if (side.x < -circle.r && side.y < -circle.r)
        return collide_inside;
    if (side.x < 0 || side.y < 0)
        return true;

    return side.x * side.x + side.y * side.y  < circle.r * circle.r;
}

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
    x = 0;
    @type("number")
    y = 0;
    originX = 0;
    originY = 0;
    @type("number")
    w = 100;
    @type("number")
    h = 100;
    @type("string")
    team = "red";
    dead = false;
    flag = undefined;
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
    state = undefined;
    radius = 50;
    id = "";
    userId = "";
    timer = 0;
    bTimer = 0;
    shot = false;

    constructor(name, colour, state, id, userId) {
        super(name, colour, state, id, userId);
        this.userId = userId;
        this.id = id;
        this.state = state;
        if (colour == "FF0000") {
            this.team = "red";
            this.x = this.state.spawn.r.x;
            this.y = this.state.spawn.r.y;
        } else {
            this.team = "blue";
            this.x = this.state.spawn.b.x;
            this.y = this.state.spawn.b.y;
        }
        this.originX = this.x;
        this.originY = this.y;
        this.name = name.substring(0, 16);
        this.colour = "#" + colour;
    }

    movePlayer() {
        if (!this.dead) {
            this.velocity.x = (this.velocity.x + (this.acceleration.x * 1.5)) * 0.8;
            this.x += this.velocity.x;

            for (let obstacleId in this.state.obstacles) {
                let obstacle = this.state.obstacles[obstacleId];
                let center = {
                    x: this.x + this.radius,
                    y: this.y + this.radius,
                    r: this.radius
                };
                if (obstacle.solid)
                if (collides(obstacle, center, true)) {
                    if (this.x < obstacle.x + obstacle.w && this.x + this.w > obstacle.x && this.y < obstacle.y + obstacle.h - center.r && this.y + this.h > obstacle.y + center.r) {
                        if (this.velocity.x < 0) {
                            this.x = obstacle.x + obstacle.w + 1;
                        } else if (this.velocity.x > 0) {
                            this.x = obstacle.x - this.w - 1;
                        }
                    } else {
                        if (this.velocity.x > 0) {
                            if (center.y < obstacle.y) {
                                this.x = obstacle.x - Math.abs( ( ( (center.r)**2) - ( (obstacle.y - center.y)**2) )**0.5) - center.r;
                            } else {
                                this.x = obstacle.x - Math.abs( ( ( (center.r)**2) - ( (obstacle.y + obstacle.h - center.y)**2) )**0.5) - center.r;
                            }
                            this.x -= 1;
                        } else if (this.velocity.x < 0) {
                            if (center.y < obstacle.y) {
                                this.x = obstacle.x + obstacle.w + Math.abs( ( ( (center.r)**2) - ( (obstacle.y - center.y)**2) )**0.5) - center.r;
                            } else {
                                this.x = obstacle.x + obstacle.w + Math.abs( ( ( (center.r)**2) - ( (obstacle.y + obstacle.h - center.y)**2) )**0.5) - center.r;
                            }
                            this.x += 1;
                        }
                    }
                    this.velocity.x = 0;
                }
            }

            this.velocity.y = (this.velocity.y + (this.acceleration.y * 1.5)) * 0.8;
            this.y += this.velocity.y;

            for (let obstacleId in this.state.obstacles) {
                let obstacle = this.state.obstacles[obstacleId];
                let center = {
                    x: this.x + this.radius,
                    y: this.y + this.radius,
                    r: this.radius
                };
                if (obstacle.solid)
                if (collides(obstacle, center, true)) {
                    if (this.x < obstacle.x + obstacle.w - center.r && this.x + this.w > obstacle.x + center.r && this.y < obstacle.y + obstacle.h && this.y + this.h > obstacle.y) {
                        if (this.velocity.y < 0) {
                            this.y = obstacle.y + obstacle.h + 1;
                        } else if (this.velocity.y > 0) {
                            this.y = obstacle.y - this.h - 1;
                        }
                    } else {
                        if (this.velocity.y > 0) {
                            if (center.x < obstacle.x) {
                                this.y = obstacle.y - Math.abs( ( ( (center.r)**2) - ( (obstacle.x - center.x)**2) )**0.5) - center.r;
                            } else {
                                this.y = obstacle.y - Math.abs( ( ( (center.r)**2) - ( (obstacle.x + obstacle.w - center.x)**2) )**0.5) - center.r;
                            }
                            this.y -= 1;
                        } else if (this.velocity.y < 0) {
                            if (center.x < obstacle.x) {
                                this.y = obstacle.y + obstacle.h + Math.abs( ( ( (center.r)**2) - ( (obstacle.x - center.x)**2) )**0.5) - center.r;
                            } else {
                                this.y = obstacle.y + obstacle.h + Math.abs( ( ( (center.r)**2) - ( (obstacle.x + obstacle.w - center.x)**2) )**0.5) - center.r;
                            }
                            this.y += 1;
                        }
                    }
                    this.velocity.y = 0;
                }
            }

            if (this.velocity.x < 0.001 && this.velocity.x > -0.001) {
                this.velocity.x = 0;
            } else if (this.velocity.y < 0.001 && this.velocity.y > -0.001) {
                this.velocity.y = 0;
            }

            if (this.flag != undefined) {
                this.flag.x = this.x + 10;
                this.flag.y = this.y - 70;
            }

            for (let bulletId in this.state.bullets) {
                let bullet = this.state.bullets[bulletId];
                let center = {
                    x: this.x + this.radius,
                    y: this.y + this.radius,
                    r: this.radius
                };
                if (collides(bullet, center, true)) {
                    if (bullet.team != this.team) {
                        this.dead = true;
                        this.x = this.originX;
                        this.y = this.originY;
                        try {
                            this.flag.taken = false;
                        } catch {}
                        this.flag = undefined;
                        delete this.state.bullets[bulletId];
                    }
                }
            }

            for (let flagId in this.state.flags) {
                let flag = this.state.flags[flagId];
                let center = {
                    x: this.x + this.radius,
                    y: this.y + this.radius,
                    r: this.radius
                };
                if (collides(flag, center, true)) {
                    if (flag.team != this.team) {
                        if (!flag.taken) {
                            flag.taken = true;
                            this.flag = flag;
                        }
                    }
                }
                if (collides({x: flag.originX, y: flag.originY, w: flag.w, h: flag.h}, center, true)) {
                    if (this.flag != undefined && flag.team == this.team) {
                        this.flag.x = this.flag.originX;
                        this.flag.y = this.flag.originY;
                        this.flag.taken = false;
                        this.flag = undefined;
                        if (this.team == "red") {
                            this.state.scoresR += 1;
                        } else {
                            this.state.scoresB += 1;
                        }
                    }
                }
            }

            if (this.shot) {
                this.bTimer += 1;
                if (this.bTimer > 15) {
                    this.shot = false;
                    this.bTimer = 0;
                }
            }
        } else {
            this.bTimer = 0;
            this.timer += 1;
            if (this.timer > 300) {
                this.dead = false;
                this.timer = 0;
                this.velocity.x = 0;
                this.velocity.y = 0;
                this.acceleration.x = 0;
                this.acceleration.y = 0;
            }
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
    @type("string")
    colour = "F000000";
    @type("boolean")
    solid = false;

    constructor(x, y, w, h, colour, solid) {
        super(x, y, w, h, colour, solid);
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.colour = colour;
        this.solid = solid;
    }
}

export class Flag extends Schema {
    @type("number")
    x = 0;
    @type("number")
    y = 0;
    @type("number")
    originX = 0;
    @type("number")
    originY = 0;
    @type("number")
    w = 80;
    @type("number")
    h = 80;
    @type("string")
    team = "red";
    @type("boolean")
    taken = false;
    timer = 0;

    constructor(x, y, team) {
        super(x, y, team);
        this.x = x;
        this.y = y;
        this.originX = x;
        this.originY = y;
        this.team = team;
    }

    move () {
        if (this.x != this.originX && this.y != this.originY && !this.taken) {
            if (this.timer == 0)
            this.y += 70;

            this.timer += 1;
            if (this.timer > 900) {
                this.timer = 0;
                this.x = this.originX;
                this.y = this.originY;
            }
        } else {
            this.timer = 0;
        }
    }
}

export class Bullet extends Schema {
    @type("number")
    x = 0;
    @type("number")
    y = 0;
    @type("number")
    w = 10;
    @type("number")
    h = 10;
    @type("number")
    xvel = 0;
    @type("number")
    yvel = 0;
    @type("number")
    timer = 0;
    @type("string")
    id = "";
    @type("string")
    team = "red";
    state = undefined;

    constructor(id, x, y, angle, right, up, team, state) {
        super(id, x, y, angle, right, up, team, state);
        this.state = state;
        this.team = team;
        this.id = id;
        this.x = x - 5;
        this.y = y - 5;
        if (right) {
            this.xvel = 10*Math.cos(angle)
        } else {
            this.xvel = -10*Math.cos(angle)
        }
        if (up) {
            this.yvel = -10*Math.sin(angle)
        } else {
            this.yvel = 10*Math.sin(angle)
        }
    }

    move() {
        this.x += this.xvel;
        this.y += this.yvel;
        this.timer += 1;
        if (this.timer > 1800) {
            delete this.state.bullets[this.id];
        }
        for (let obstacleId in this.state.obstacles) {
            let obstacle = this.state.obstacles[obstacleId];
            if (obstacle.solid)
            if (obstacle.x < this.x + this.w && obstacle.x + obstacle.w > this.x && obstacle.y < this.y + this.h && obstacle.y + obstacle.h > this.y) {
                delete this.state.bullets[this.id];
            }
        }
    }
}

export class State extends Schema {
    @type({ map: Player })
    players = new MapSchema<Player>();
    clients = new Array();
    spawn = {r: {}, b: {}};
    @type("number")
    scoresR = 0;
    @type("number")
    scoresB = 0;
    gameroom = undefined;

    constructor(game) {
        super(game);
        this.gameroom = game;
    }

    createPlayer (client: Client, name: string, colour: string, id: string, userId: string) {
        if(colour == "FF0000" || colour == "0000FF") {
            this.players[client.sessionId] = new Player(name, colour, this, client.sessionId, userId);
            this.clients[client.sessionId] = client;
        } else {
            this.players[client.sessionId] = new Player(name, "FF0000", this, client.sessionId, userId);
            this.clients[client.sessionId] = client;
        }
    }

    removePlayer (id: string) {
        delete this.players[id];
        delete this.clients[id];
    }

    @type({ map: Obstacle })
    obstacles = new MapSchema<Obstacle>();

    createObstacle (id: number, x: number, y: number, w: number, h: number, colour: string, solid: boolean) {
        this.obstacles[ id ] = new Obstacle(x, y, w, h, colour, solid);
    }

    removeObstacle (id: string) {
        delete this.obstacles[ id ];
    }

    @type({ map: Flag })
    flags = new MapSchema<Obstacle>();

    createFlag (id: number, x: number, y: number, team: string) {
        this.flags[ id ] = new Flag(x, y, team);
    }

    removeFlag (id: string) {
        delete this.flags[ id ];
    }

    @type({ map: Bullet })
    bullets = new MapSchema<Bullet>();

    createBullet (id: string, x: number, y: number, angle: number, right: boolean, up: boolean, team: string) {
        this.bullets[ id ] = new Bullet(id, x, y, angle, right, up, team, this);
    }

    removeBullet (id: string) {
        delete this.bullets[ id ];
    }
}

export class GameRoom extends Room<State> {
    maxClients = 4;
    gameInterval = undefined;

    onCreate (options) {
        rooms[this.roomId] = this;
        console.log(getTs(), "\x1b[32mGameRoom \x1b[34mcreated!\x1b[37m");

        this.setState(new State(this));

        for (let i = 0; i < map.length; i++) {
            if (map[i].type == "obstacle")
            this.state.createObstacle(i, map[i].x, map[i].y, map[i].w, map[i].h, map[i].colour, map[i].solid);

            if (map[i].type == "rSpawn")
            this.state.spawn.r = {x: map[i].x, y: map[i].y};

            if (map[i].type == "bSpawn")
            this.state.spawn.b = {x: map[i].x, y: map[i].y};

            if (map[i].type == "flag")
            this.state.createFlag(i, map[i].x, map[i].y, map[i].team);
        }

        this.gameInterval = setInterval(this.gameLoop.bind(this), 1000 / 60);
    }

    async onAuth(client, options) {
        const token = verifyToken(options.token);

        return await User.findById(token._id);
    }

    onJoin (client, options, user) {
        let exists = false;
        for (let i = 0; i < tokens.length; i++) {
            if (user._id.toString() == tokens[i]) {
                exists = true;
            }
        }
        if (exists) {
            client.close();
        } else {
            tokens.push(user._id.toString());
        }
    }

    onLeave (client) {
        try {
            console.log(getTs(), "\x1b[31m" + client.sessionId + "\x1b[37m ('\x1b[32m" + this.state.players[client.sessionId].name + "\x1b[37m') \x1b[31mLeft.\x1b[37m");
            if (this.state.players[client.sessionId].name == "") {
                this.broadcast({id: "message", message: ("Player Left.")});
            } else {
                this.broadcast({id: "message", message: (this.state.players[client.sessionId].name + " Left.")});
            }
            for (let i = 0; i < tokens.length; i++) {
                if (this.state.players[client.sessionId].userId == tokens[i]) {
                    tokens.splice(i, 1);
                }
            }
            if (this.state.players[client.sessionId].flag != undefined) {
                this.state.players[client.sessionId].flag.taken = false;
                this.state.players[client.sessionId].flag = undefined;
            }
            this.state.removePlayer(client.sessionId);
        } catch {}
    }

    onMessage (client, packet) {
        let id = packet.id;
        let data = packet.data;

        switch(id) {
            case "verify": {
                const request = require('request');
                let options = packet.options;
                let response = undefined;
                request.post('https://www.google.com/recaptcha/api/siteverify?secret=6LfoZ7sUAAAAAKShCpebSwhUSsiMQ0P0eFsdHLn2&response=' + data, {json: {}}, (error, res, body) => {
                    if (error) {
                        console.error(error);
                        return;
                    }
                    response = body;
                    if (response.success) {
                        this.state.createPlayer(client, options.name, options.colour, client.sessionId, client.auth._id);
                        try {
                            console.log(getTs(), "\x1b[31m" + client.sessionId + "\x1b[37m ('\x1b[32m" + this.state.players[client.sessionId].name + "\x1b[37m') \x1b[34mJoined.\x1b[37m");
                            if (this.state.players[client.sessionId].name == "") {
                                this.broadcast({id: "message", message: ("Player Joined.")});
                            } else {
                                this.broadcast({id: "message", message: (this.state.players[client.sessionId].name + " Joined.")});
                            }
                        } catch {
                            client.close();
                            this.state.removePlayer(client.sessionId);
                            console.log(getTs(), "\x1b[31mPlayer joined with bad data.\x1b[37m");
                        }
                    } else {
                        this.send(client, {id: "verify", message: false});
                        client.close();
                        for (let i = 0; i < tokens.length; i++) {
                            if (client.auth._id == tokens[i]) {
                                tokens.splice(i, 1);
                            }
                        }
                    }
                });
                break;
            }
            case "KeyDown": {
                switch(data.key) {
                    case 37:
                    case 65: {
                        if (this.state.players[client.sessionId] != undefined)
                        this.state.players[client.sessionId].acceleration.x = -1;
                        break;
                    }
                    case 38:
                    case 87: {
                        if (this.state.players[client.sessionId] != undefined)
                        this.state.players[client.sessionId].acceleration.y = -1;
                        break;
                    }
                    case 39:
                    case 68: {
                        if (this.state.players[client.sessionId] != undefined)
                        this.state.players[client.sessionId].acceleration.x = 1;
                        break;
                    }
                    case 40:
                    case 83: {
                        if (this.state.players[client.sessionId] != undefined)
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
                        if (this.state.players[client.sessionId] != undefined)
                        if(this.state.players[client.sessionId].acceleration.x == -1)
                            this.state.players[client.sessionId].acceleration.x = 0;
                        break;
                    }
                    case 38:
                    case 87: {
                        if (this.state.players[client.sessionId] != undefined)
                        if(this.state.players[client.sessionId].acceleration.y == -1)
                            this.state.players[client.sessionId].acceleration.y = 0;
                        break;
                    }
                    case 39:
                    case 68: {
                        if (this.state.players[client.sessionId] != undefined)
                        if(this.state.players[client.sessionId].acceleration.x == 1)
                            this.state.players[client.sessionId].acceleration.x = 0;
                        break;
                    }
                    case 40:
                    case 83: {
                        if (this.state.players[client.sessionId] != undefined)
                        if(this.state.players[client.sessionId].acceleration.y == 1)
                            this.state.players[client.sessionId].acceleration.y = 0;
                        break;
                    }
                }
                break;
            }
            case "MouseDown": {
                if (this.state.players[client.sessionId] != undefined) {
                    if (!this.state.players[client.sessionId].dead) {
                        if (!this.state.players[client.sessionId].shot) {
                            this.state.players[client.sessionId].shot = true;
                            let id = '_' + Math.random().toString(36).substr(2, 9);
                            let x = this.state.players[client.sessionId].x + this.state.players[client.sessionId].radius;
                            let y = this.state.players[client.sessionId].y + this.state.players[client.sessionId].radius;
                            let team = this.state.players[client.sessionId].team;
                            let xDiff = Math.abs(data.mouse.x - data.window.x);
                            let yDiff = Math.abs(data.mouse.y - data.window.y);
                            let angle = Math.abs(Math.atan(yDiff / xDiff));
                            let right = false;
                            let up = false;
                            if (data.mouse.x > data.window.x) {
                                right = true;
                            } else if (data.mouse.x < data.window.x) {
                                right = false;
                            }
                            if (data.mouse.y < data.window.y) {
                                up = true;
                            } else if (data.mouse.x > data.window.x) {
                                up = false;
                            }
                            this.state.createBullet(id, x, y, angle, right, up, team);
                        }
                    }
                }
                break;
            }
            case "Message": {
                console.log(getTs(), "\x1b[34mMessage (" + this.roomId + "): \x1b[32m" + data + "\x1b[37m");
                this.broadcast({id: "message", message: data});
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
        for (let id in this.state.bullets) {
            let bullet = this.state.bullets[id];
            bullet.move();
        }
        for (let id in this.state.flags) {
            this.state.flags[id].move();
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
        rooms[room].broadcast({id: "message", message: "Server Stopped."});
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
            rooms[room].broadcast({id: "message", message: "Server Stopped."});
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
                rooms[data[1]].broadcast({id: "message", message: "Server> " + message});
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
                rooms[room].broadcast({id: "message", message: "Server> " + message});
            }
            console.log(getTs(), "\x1b[34mBroadcast: \x1b[32mServer> " + message + "\x1b[37m")
        } else {
            console.log(getTs(), "\x1b[31mMissing Argument(s)\x1b[37m");
        }
    } else if (command == 'delroom') {
        if (data.length != 1) {
            if (rooms[data[1]] != undefined) {
                rooms[data[1]].broadcast({id: "message", message: "Server Stopped."});
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
                    if (rooms[data[1]].state.players[data[2]].name == "") {
                        rooms[data[1]].broadcast({id: "message", message: "Player was kicked."});
                    } else {
                        rooms[data[1]].broadcast({id: "message", message: rooms[data[1]].state.players[data[2]].name + " was kicked."});
                    }
                    delete rooms[data[1]].state.players[data[2]];
                    console.log(getTs(), "\x1b[32mClient kicked.\x1b[37m")
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
            } else {
                console.log(getTs(), "\x1b[31mRoom does not exist.\x1b[37m")
            }
        } else {
            for (let room in rooms) {
                message += getTs() + " \x1b[35mRoom\x1b[37m: \x1b[31m" + rooms[room].roomId + "\n";
                for (let player in rooms[room].state.players) {
                    message += getTs() + " \x1b[35mClient\x1b[37m: \x1b[32m" + player + " \x1b[37m: \x1b[34m'" + rooms[room].state.players[player].name + "'\n";
                }
            }
        }
        message = message.substring(0, message.length - 1);
        if (message != "") {
            message += "\x1b[37m";
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
