const Constants = require("../shared/Constants.js");

const canvas = document.getElementById('game');
const context = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function render()
{
    // do stuff
    context.rect(canvas.width / 2, canvas.height / 2, 10, 10);
}

let renderInterval = null;
export function startRendering()
{
    renderInterval = setInterval(render, 1000 / 60);
}

export function stopRendering()
{
    clearInterval(renderInterval);
}