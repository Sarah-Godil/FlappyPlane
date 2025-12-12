/**
 * Flappy Plane Game Logic (game.js)
 * Vanilla JavaScript & HTML5 Canvas
 */

const playerName = localStorage.getItem('playerName') || 'Player';
const playerNameElement = document.getElementById('player-name');
playerNameElement.textContent = playerName;

// Function to generate the player-specific storage key
function getPlayerScoreKey(name) {
    return `flappyPlaneBestScore_${name}`;
}
// Load the best score for the CURRENT player
let bestPlayerScore = localStorage.getItem(getPlayerScoreKey(playerName)) || 0; // <<< CHANGE 1
// Note: '|| 0' ensures it starts at 0 if no score is found.

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const restartButton = document.getElementById('restartButton');

// --- Game Settings ---
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const PIPE_WIDTH = 50;
const PIPE_GAP = 140; // Vertical gap size
const PIPE_SPEED = 3;
const PIPE_SPAWN_INTERVAL = 90; // Frames between pipe spawns
const GRAVITY = 0.3;
const JUMP_VELOCITY = -6;

// --- Game State ---
let plane;
let obstacles = [];
let score = 0;
let bestScore = localStorage.getItem('flappyPlaneBestScore') || 0;
let isGameOver = true; // Start in Game Over state (before first play)
let frameCount = 0;
let animationFrameId;

// --- Plane Object ---
class Plane {
    constructor() {
        this.x = 50;
        this.y = CANVAS_HEIGHT / 2;
        this.width = 40;
        this.height = 30;
        this.velocity = 0;
        this.tilt = 0; // Angle for visual tilt
    }

    // Apply gravity and update position
    update() {
        this.velocity += GRAVITY;
        this.y += this.velocity;
        
        // Calculate tilt based on velocity (optional feature)
        // Range: -20 degrees (up) to +45 degrees (down)
        this.tilt = Math.min(Math.max(-20, this.velocity * 4), 45); 

        // Keep plane within top/bottom boundaries
        if (this.y + this.height > CANVAS_HEIGHT - 30) { // Check ground collision
            this.y = CANVAS_HEIGHT - 30 - this.height;
            this.velocity = 0;
            if (!isGameOver) gameOver();
        }
        if (this.y < 0) { // Check ceiling collision
            this.y = 0;
            this.velocity = 0;
        }
    }

    // Player input: increase upward velocity
    jump() {
        this.velocity = JUMP_VELOCITY;
    }

    // Draw the plane (simple filled triangle for a plane-like shape)
    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        // Convert degrees to radians for rotation
        ctx.rotate(this.tilt * (Math.PI / 180));
        
        // Define dimensions relative to the center (0, 0)
        const bodyWidth = this.width;
        const bodyHeight = this.height * 0.7; // Main body is a bit thinner
        const halfBodyWidth = bodyWidth / 2;
        const halfBodyHeight = bodyHeight / 2;
        
        // --- Colors ---
        const mainColor = '#418ce2ff'; // Light Blue/Sky Blue for the body
        const detailColor = '#2c6ab6ff'; // Darker Blue for wings/tail

        // 1. Draw Main Fuselage (body)
        ctx.fillStyle = mainColor;
        ctx.fillRect(-halfBodyWidth, -halfBodyHeight, bodyWidth, bodyHeight);
        
        // 2. Draw Cockpit (a small protruding piece at the front)
        ctx.beginPath();
        ctx.fillStyle = '#cccccc'; // Grey cockpit glass
        // Start drawing from the front tip of the body (X=halfBodyWidth)
        ctx.arc(halfBodyWidth - 5, 0, halfBodyHeight * 0.7, -Math.PI / 2, Math.PI / 2, false);
        ctx.fill();
        
        // 3. Draw Main Wings (large rectangle spanning the center)
        const wingSpan = bodyWidth * 1.5; // Wider than the body
        const wingHeight = 5;
        ctx.fillStyle = detailColor; 
        ctx.fillRect(-wingSpan / 2 + 5, -wingHeight / 2, wingSpan - 10, wingHeight);
        
        // 4. Draw Tail Fin (Vertical Stabilizer - a small triangle/rectangle at the back top)
        const tailX = -halfBodyWidth + 5;
        const tailHeight = 15;
        
        ctx.fillStyle = detailColor;
        ctx.beginPath();
        ctx.moveTo(tailX, -halfBodyHeight); // Top back corner of the body
        ctx.lineTo(tailX, -halfBodyHeight - tailHeight); // Top point of the tail
        ctx.lineTo(tailX - 5, -halfBodyHeight); // Base point of the tail
        ctx.fill();

        // 5. Draw Horizontal Stabilizer (small wing at the back)
        const hTailWidth = 15;
        const hTailHeight = 3;
        ctx.fillRect(tailX - hTailWidth, halfBodyHeight - hTailHeight, hTailWidth, hTailHeight);
        
        // Restore the canvas state (reset rotation and translation)

        ctx.restore();
    }
}

// --- Obstacle Object (Pipes) ---
class Obstacle {
    constructor() {
        this.x = CANVAS_WIDTH;
        this.width = PIPE_WIDTH;
        this.passed = false; // To track if the plane has passed it for scoring

        // Randomly determine the height of the top pipe.
        // The bottom pipe position is calculated from the top pipe and the gap.
        const minTopHeight = 50;
        const maxTopHeight = CANVAS_HEIGHT - 50 - PIPE_GAP - 30; // 30 is ground height
        this.topHeight = Math.floor(Math.random() * (maxTopHeight - minTopHeight + 1)) + minTopHeight;
        this.bottomY = this.topHeight + PIPE_GAP;
        this.bottomHeight = CANVAS_HEIGHT - this.bottomY - 30; // 30 is ground height
        
    }

    update() {
        this.x -= PIPE_SPEED;
    }

    draw() {
        ctx.fillStyle = '#2886bdff'; // Green pipes

        // Draw Top Pipe
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        
        // Draw Bottom Pipe
        ctx.fillRect(this.x, this.bottomY, this.width, this.bottomHeight);

       const obs = this;
    const windowSize = 15; // Size of each window
    const windowGap = 10; // Vertical space between windows
    const windowPadding = 5; // Horizontal space from the edge of the pipe

    // --- 1. Draw Top Building Body (The background for the windows) ---
    ctx.fillStyle = '#5B769A'; // Light Blue Building Body
    ctx.fillRect(obs.x, 0, obs.width, obs.topHeight);

    // --- 2. Draw Bottom Building Body ---
    ctx.fillStyle = '#5B769A'; // Light Blue Building Body
    ctx.fillRect(obs.x, obs.bottomY, obs.width, obs.bottomHeight);
    
    // --- 3. Draw Windows ---
    ctx.fillStyle = '#cfc9c9ff'; // White windows

    // Define the x-coordinates for the two columns
    // Column 1 is near the left edge, Column 2 is near the right edge
    const xPositions = [
        obs.x + windowPadding, // Position for the first column
        obs.x + obs.width - windowPadding - windowSize // Position for the second column
    ];


    // --- Draw windows on Top Pipe ---
    // Outer loop iterates through the X positions (columns)
    for (let i = 0; i < xPositions.length; i++) {
        const windowX = xPositions[i];
        
        // Inner loop iterates through the Y positions (rows)
        for (let y = windowGap; y < obs.topHeight - windowSize; y += windowSize + windowGap) {
            ctx.fillRect(windowX, y, windowSize, windowSize);
        }
    }

    // --- Draw windows on Bottom Pipe ---
    // Outer loop iterates through the X positions (columns)
    for (let i = 0; i < xPositions.length; i++) {
        const windowX = xPositions[i];
        
        // Inner loop iterates through the Y positions (rows)
        for (let y = obs.bottomY + windowGap; y < CANVAS_HEIGHT - 30 - windowSize; y += windowSize + windowGap) {
            ctx.fillRect(windowX, y, windowSize, windowSize);
        }
    }
    }
}

// --- Core Game Functions ---

function setup() {
    plane = new Plane();
    obstacles = [];
    score = 0;
    frameCount = 0;
    isGameOver = false;
    restartButton.style.display = 'none';
}

function spawnObstacle() {
    obstacles.push(new Obstacle());
}

function checkCollision() {
    const p = plane;

    // Check ground collision (already handled in Plane.update)
    // Check ceiling collision (already handled in Plane.update)

    // Check pipe collisions
    for (const obs of obstacles) {
        // Simple AABB (Axis-Aligned Bounding Box) collision check
        
        // Horizontal check: Is the plane between the pipe's X coordinates?
        const x_overlap = p.x + p.width > obs.x && p.x < obs.x + obs.width;

        if (x_overlap) {
            // Check Top Pipe Collision
            const top_collision = p.y < obs.topHeight;
            
            // Check Bottom Pipe Collision
            const bottom_collision = p.y + p.height > obs.bottomY;

            if (top_collision || bottom_collision) {
                gameOver();
                return true;
            }
        }
        
        // Check scoring (Plane has passed the obstacle's X position)
        if (p.x > obs.x + obs.width && !obs.passed) {
            score++;
            obs.passed = true;
        }
    }
    return false;
}

function update() {
    if (isGameOver) return;

    plane.update();
    // Spawn new obstacles
    if (frameCount % PIPE_SPAWN_INTERVAL === 0) {
        spawnObstacle();
    }
    frameCount++;

    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.update();

        // Remove off-screen obstacles for performance
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }
    }

    checkCollision();
}

function draw() {
    // 1. Clear Canvas (Simulates background scrolling)
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#70c5ce'; // Sky blue background
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Draw Ground
    const groundHeight = 30;
    ctx.fillStyle = '#8bc34a'; // Green Ground
    ctx.fillRect(0, CANVAS_HEIGHT - groundHeight, CANVAS_WIDTH, groundHeight);

    // 3. Draw Obstacles
    obstacles.forEach(obs => obs.draw());

    // 4. Draw Plane
    plane.draw();
    
    // 5. Draw Score and Best Score
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    
    // Current Score
    const scoreText = `Score: ${score}`;
    ctx.fillText(scoreText, CANVAS_WIDTH / 2, 40);
    ctx.strokeText(scoreText, CANVAS_WIDTH / 2, 40);

    // Best Score
    ctx.font = '16px Arial';
    const bestScoreText = `Overall Best: ${bestScore}`;
    ctx.fillText(bestScoreText, CANVAS_WIDTH / 2, 65);
    ctx.strokeText(bestScoreText, CANVAS_WIDTH / 2, 65);

    // 6. Draw Game Over screen
    if (isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        
        ctx.font = '28px Arial';
        ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
        
        ctx.font = '18px Arial';
        ctx.fillText('Click/Tap or Press Space to Restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70);
    }
}

// --- Main Game Loop ---
function loop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(loop);
}

// --- Game Over Function ---
function gameOver() {
    if (isGameOver) return; // Prevent multiple calls
    isGameOver = true;
    cancelAnimationFrame(animationFrameId);

    // Update Best Score
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('flappyPlaneBestScore', bestScore);

        localStorage.setItem(getPlayerScoreKey(playerName), bestScore);
    }
    
    restartButton.style.display = 'block';
}

// --- Event Handlers (Controls) ---
function handleInput() {
    if (isGameOver) {
        
        // If game is over, restart the game
        startGame(); 
    } else {
        // If game is running, jump
        plane.jump();
    }
}

// Keyboard input (Spacebar)
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault(); // Prevent spacebar from scrolling the page
        handleInput();
    }
});

// Mouse click or touch input on the canvas
canvas.addEventListener('click', () => {
    handleInput();
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent default mobile actions (like scrolling/zooming)
    handleInput();
}, { passive: false });

// Restart button listener
restartButton.addEventListener('click', startGame);

// --- Initialization ---
function startGame() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    setup();
    loop();
}

// Initially draw the Game Over screen until the user starts
draw(); 
restartButton.style.display = 'block'; // Show restart button initially
