import { getCurrentState } from "./state";

const Constants = require("../shared/Constants.js");

const canvas = document.getElementById('game-canvas');
const context = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function render()
{
    const { me, others, bullets } = getCurrentState();
    if(!me)
    {
        return;
    }
    
    
}