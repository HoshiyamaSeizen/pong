const Game = {
	config: {
		speed: 100,
		balls: 1,
		color1: '#000000',
		color2: '#ffffff',
		width: 20,
		blockSize: 10,
		ballRadius: 3,
		noVertAndHor: true,
	},
	instance: {
		ballsIn: [],
		ballsOut: [],
		blocks: [],
	},
	score: {
		blocksCount: 0,
		blocksCount1: 0,
		blocksCount2: 0,
	},
	running: false,
	widthLimit: 0,
	scale: 1,
};

const OUTSIDE = 0;
const INSIDE = 1;

/** Moves ball according to its trajectory */
const moveBall = (ball) => {
	if (ball.angle >= 1 && ball.angle <= 3) ball.y -= 1;
	if (ball.angle >= 5 && ball.angle <= 7) ball.y += 1;
	if (ball.angle >= 3 && ball.angle <= 5) ball.x -= 1;
	if (ball.angle == 7 || ball.angle == 0 || ball.angle == 1) ball.x += 1;
	return ball;
};

/** Returns random integer in range between max and min */
const randInt = (min, max) => {
	return Math.floor(Math.random() * (max - min) + min);
};

/** Checks for the presence of balls in the block */
const checkForBalls = (x, y, checkInside) => {
	scaledBlockSize = Game.config.blockSize * Game.scale;
	scaledBallRadius = Game.config.ballRadius * Game.scale;
	result = false;

	const func = (ball) => {
		if (
			(Math.floor((ball.x - scaledBallRadius) / scaledBlockSize) == x ||
				Math.floor((ball.x + scaledBallRadius) / scaledBlockSize) == x) &&
			(Math.floor((ball.y - scaledBallRadius) / scaledBlockSize) == y ||
				Math.floor((ball.y + scaledBallRadius) / scaledBlockSize) == y)
		)
			result = true;
	};

	if (checkInside) Game.instance.ballsIn.forEach(func);
	else Game.instance.ballsOut.forEach(func);
	return result;
};

/** Initializes ans starts the game */
const gameInit = () => {
	// Start
	Game.running = !Game.running;
	if (!Game.running) {
		return;
	}

	var config = Game.config;
	var blockSize = config.blockSize;
	var ballRadius = config.ballRadius;

	// Init instance
	Game.instance = {
		ballsIn: [],
		ballsOut: [],
		blocks: [],
	};

	// Calculate max scale
	Game.scale = Math.floor(Game.widthLimit / config.width);

	// Adjust canvas size
	var screenSize = blockSize * Game.scale * config.width;
	gameScreen = document.getElementById('game');
	gameScreen.setAttribute('width', `${screenSize}px`);
	gameScreen.setAttribute('height', `${screenSize}px`);

	// Calculate center of the map
	var center = Math.floor((config.width - 1) / 2);

	// Initial blocks' color and position
	var addBlock = !(config.width % 2);
	var alpha = Math.floor(config.width / 6);
	for (y = 0; y < config.width; y++) {
		Game.instance.blocks.push([]);
		for (x = 0; x < config.width; x++) {
			Game.instance.blocks[y][x] = {
				color:
					x >= center - alpha &&
					x <= center + alpha + addBlock &&
					y >= center - alpha &&
					y <= center + alpha + addBlock,
				x: x * blockSize * Game.scale,
				y: y * blockSize * Game.scale,
			};
		}
	}

	// Count the blocks
	let score1 = document.getElementById('score-1');
	let score2 = document.getElementById('score-2');
	Game.score = { blocksCount: 0, blocksCount1: 0, blocksCount2: 0 };
	Game.score.blocksCount1 = Game.instance.blocks.reduce((prev, blocks) => {
		Game.score.blocksCount += blocks.length;
		return prev + blocks.filter((block) => block.color).length;
	}, 0);

	Game.score.blocksCount2 = Game.score.blocksCount - Game.score.blocksCount1;
	console.log(Game.score.blocksCount, Game.score.blocksCount1, Game.score.blocksCount2);

	// Init inside balls' random position and angle
	var limitMin = ((center - alpha) * blockSize + ballRadius) * Game.scale;
	var limitMax = ((center + alpha + addBlock + 1) * blockSize - ballRadius) * Game.scale;
	for (i = 0; i < config.balls; i++) {
		Game.instance.ballsIn[i] = {
			angle: randInt(0, 8),
			x: randInt(limitMin, limitMax),
			y: randInt(limitMin, limitMax),
		};
	}

	// Init outside balls' random position and angle
	limitMin = ((center - alpha) * blockSize - ballRadius) * Game.scale;
	limitMax = ((center + alpha + addBlock + 1) * blockSize + ballRadius) * Game.scale;
	for (i = 0; i < config.balls; i++) {
		Game.instance.ballsOut[i] = {
			angle: randInt(0, 8),
			x: randInt(ballRadius * Game.scale, screenSize - ballRadius * Game.scale),
			y: 0,
		};

		x = Game.instance.ballsOut[i].x;
		while (1) {
			y = randInt(ballRadius * Game.scale, screenSize - ballRadius * Game.scale);
			if (x < limitMin || x > limitMax || y <= limitMin || y >= limitMax) {
				Game.instance.ballsOut[i].y = y;
				break;
			}
		}
	}

	// Remove horizontal and vertical move
	if (config.noVertAndHor) {
		for (i = 0; i < config.balls; i++) {
			if (!(Game.instance.ballsOut[i].angle % 2)) Game.instance.ballsOut[i].angle += 1;
			if (!(Game.instance.ballsIn[i].angle % 2)) Game.instance.ballsIn[i].angle += 1;
		}
	}

	// Get canvas 2d context
	var ctx = gameScreen.getContext('2d');

	// Movement functionality
	scaledBlockSize = blockSize * Game.scale;
	scaledBallRadius = ballRadius * Game.scale;
	blocks = Game.instance.blocks;

	/** Handles ball bouncing */
	const bounce = (blockX, blockY, wallColor, angleChangeFunc, ball) => {
		if (blocks[blockY][blockX].color == wallColor) {
			if (!checkForBalls(blockX, blockY, wallColor)) {
				Game.score.blocksCount1 -= !wallColor ? -1 : 1;
				Game.score.blocksCount2 -= wallColor ? -1 : 1;
				blocks[blockY][blockX].color = 1 - wallColor;
			}
			angleChangeFunc(ball);
		}
	};

	/** Update lyfecycle function */
	const update = () => {
		/** Check for blocks ahead and break it if needed */
		const advance = (ball, inOrOut) => {
			angleChange = (ball) => {
				ball.angle = 8 - ball.angle;
			};

			if (ball.angle >= 1 && ball.angle <= 3) {
				blockX = Math.floor(ball.x / scaledBlockSize);
				blockY = Math.floor((ball.y - scaledBallRadius - 1) / scaledBlockSize);

				if (blockY == -1) angleChange(ball);
				else if (blocks[blockY][blockX].color == inOrOut)
					bounce(blockX, blockY, inOrOut, angleChange, ball);
				else if (ball.x - blockX * scaledBlockSize <= scaledBallRadius) {
					blockX = Math.floor((ball.x - scaledBallRadius) / scaledBlockSize);
					bounce(blockX, blockY, inOrOut, angleChange, ball);
				} else if ((blockX + 1) * scaledBlockSize - ball.x <= scaledBallRadius) {
					blockX = Math.floor((ball.x + scaledBallRadius) / scaledBlockSize);
					bounce(blockX, blockY, inOrOut, angleChange, ball);
				}
			}
			if (ball.angle >= 5 && ball.angle <= 7) {
				blockX = Math.floor(ball.x / scaledBlockSize);
				blockY = Math.floor((ball.y + scaledBallRadius + 1) / scaledBlockSize);

				if (blockY == config.width) angleChange(ball);
				else if (blocks[blockY][blockX].color == inOrOut)
					bounce(blockX, blockY, inOrOut, angleChange, ball);
				else if (ball.x - blockX * scaledBlockSize <= scaledBallRadius) {
					blockX = Math.floor((ball.x - scaledBallRadius) / scaledBlockSize);
					bounce(blockX, blockY, inOrOut, angleChange, ball);
				} else if ((blockX + 1) * scaledBlockSize - ball.x <= scaledBallRadius) {
					blockX = Math.floor((ball.x + scaledBallRadius) / scaledBlockSize);
					bounce(blockX, blockY, inOrOut, angleChange, ball);
				}
			}
			if (ball.angle >= 3 && ball.angle <= 5) {
				angleChange = (ball) => {
					ball.angle = ball.angle === 5 ? 7 : 4 - ball.angle;
				};

				blockX = Math.floor((ball.x - scaledBallRadius - 1) / scaledBlockSize);
				blockY = Math.floor(ball.y / scaledBlockSize);
				if (blockX == -1) angleChange(ball);
				else if (blocks[blockY][blockX].color == inOrOut) {
					bounce(blockX, blockY, inOrOut, angleChange, ball);
				} else if (ball.y - blockY * scaledBlockSize <= scaledBallRadius) {
					blockY = Math.floor((ball.y - scaledBallRadius) / scaledBlockSize);
					bounce(blockX, blockY, inOrOut, angleChange, ball);
				} else if ((blockY + 1) * scaledBlockSize - ball.y <= scaledBallRadius) {
					blockY = Math.floor((ball.y + scaledBallRadius) / scaledBlockSize);
					bounce(blockX, blockY, inOrOut, angleChange, ball);
				}
			}
			if (ball.angle == 7 || ball.angle == 0 || ball.angle == 1) {
				angleChange = (ball) => {
					ball.angle = ball.angle == 7 ? 5 : 4 - ball.angle;
				};

				blockX = Math.floor((ball.x + scaledBallRadius + 1) / scaledBlockSize);
				blockY = Math.floor(ball.y / scaledBlockSize);
				if (blockX == config.width) angleChange(ball);
				else if (blocks[blockY][blockX].color == inOrOut) {
					bounce(blockX, blockY, inOrOut, angleChange, ball);
				} else if (ball.y - blockY * scaledBlockSize <= scaledBallRadius) {
					blockY = Math.floor((ball.y - scaledBallRadius) / scaledBlockSize);
					bounce(blockX, blockY, inOrOut, angleChange, ball);
				} else if ((blockY + 1) * scaledBlockSize - ball.y <= scaledBallRadius) {
					blockY = Math.floor((ball.y + scaledBallRadius) / scaledBlockSize);
					bounce(blockX, blockY, inOrOut, angleChange, ball);
				}
			}
		};
		Game.instance.ballsOut.forEach((ball) => advance(ball, INSIDE));
		Game.instance.ballsIn.forEach((ball) => advance(ball, OUTSIDE));

		// Move balls
		Game.instance.ballsOut.forEach((ball) => (ball = moveBall(ball)));
		Game.instance.ballsIn.forEach((ball) => (ball = moveBall(ball)));
	};

	/** Render lyfecycle function */
	const render = () => {
		// Clear previous frame
		ctx.clearRect(0, 0, screenSize, screenSize);

		// Draw blocks outside (fill whole screen)
		ctx.fillStyle = config.color1;
		ctx.fillRect(0, 0, screenSize, screenSize);

		// Draw blocks inside
		ctx.fillStyle = config.color2;
		Game.instance.blocks.forEach((row) => {
			row.forEach((block) => {
				if (block.color) {
					ctx.fillRect(block.x, block.y, blockSize * Game.scale, blockSize * Game.scale);
				}
			});
		});

		// Draw balls outside
		ctx.fillStyle = config.color2;
		Game.instance.ballsOut.forEach((ball) =>
			fillCircle(ctx, ball.x, ball.y, ballRadius * Game.scale)
		);

		// Draw balls inside
		ctx.fillStyle = config.color1;
		Game.instance.ballsIn.forEach((ball) =>
			fillCircle(ctx, ball.x, ball.y, ballRadius * Game.scale)
		);

		// Draw score
		score1.innerText = `${Game.score.blocksCount1} (${Math.round(
			(Game.score.blocksCount1 / Game.score.blocksCount) * 100
		)}%)`;
		score2.innerText = `${Game.score.blocksCount2} (${Math.round(
			(Game.score.blocksCount2 / Game.score.blocksCount) * 100
		)}%)`;
	};

	// Start game life cycle
	const cycle = () => {
		for (i = 0; i < config.speed / 50 + 1; i++) {
			update();
			render();
		}
		if (Game.running) setTimeout(cycle, 500 / config.speed);
	};
	cycle();
};

window.onload = () => {
	screen = document.querySelector('.window-game');
	if (screen.offsetHeight < screen.offsetWidth) minGameScreenWidth = screen.offsetHeight;
	else minGameScreenWidth = screen.offsetWidth;

	Game.widthLimit = Math.floor((minGameScreenWidth - 100) / Game.config.blockSize);
	document.getElementById('width-input').setAttribute('max', Game.widthLimit);
	if (Game.config.width > Game.widthLimit) updateVal('width', Game.widthLimit);
};

window.onresize = () => {
	Game.running = false;
	window.onload();
};

/** Draws a circle of specified center and radius */
const fillCircle = (ctx, x, y, r) => {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, 2 * Math.PI, 0);
	ctx.fill();
};

/** Changes config parameters */
const updateVal = (name, val) => {
	document.getElementById(`val-${name}`).innerHTML = val;
	switch (name) {
		case 'speed':
			Game.config.speed = val;
			break;
		case 'balls':
			Game.config.balls = val;
			break;
		case 'color1':
			Game.config.color1 = val;
			break;
		case 'color2':
			Game.config.color2 = val;
			break;
		case 'width':
			Game.config.width = val;
			break;
		default:
			break;
	}
};
