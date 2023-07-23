"use strict";
var PlayerDirection;
(function (PlayerDirection) {
    PlayerDirection[PlayerDirection["Forward"] = 0] = "Forward";
    PlayerDirection[PlayerDirection["Backward"] = 1] = "Backward";
    PlayerDirection[PlayerDirection["Standby"] = 2] = "Standby";
})(PlayerDirection || (PlayerDirection = {}));
var PlayerTurn;
(function (PlayerTurn) {
    PlayerTurn[PlayerTurn["Left"] = 0] = "Left";
    PlayerTurn[PlayerTurn["Right"] = 1] = "Right";
    PlayerTurn[PlayerTurn["Standby"] = 2] = "Standby";
})(PlayerTurn || (PlayerTurn = {}));
var Input;
(function (Input) {
    Input[Input["START_UP"] = 0] = "START_UP";
    Input[Input["START_DOWN"] = 1] = "START_DOWN";
    Input[Input["START_LEFT"] = 2] = "START_LEFT";
    Input[Input["START_RIGHT"] = 3] = "START_RIGHT";
    Input[Input["END_UP"] = 4] = "END_UP";
    Input[Input["END_DOWN"] = 5] = "END_DOWN";
    Input[Input["END_LEFT"] = 6] = "END_LEFT";
    Input[Input["END_RIGHT"] = 7] = "END_RIGHT";
})(Input || (Input = {}));
var CardinalDirection;
(function (CardinalDirection) {
    CardinalDirection[CardinalDirection["North"] = 0] = "North";
    CardinalDirection[CardinalDirection["East"] = 1] = "East";
    CardinalDirection[CardinalDirection["South"] = 2] = "South";
    CardinalDirection[CardinalDirection["West"] = 3] = "West";
})(CardinalDirection || (CardinalDirection = {}));
/// <reference path="./types.ts" />
const DEFAULT_GAME_STATE = {
    map: [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    controls: {
        direction: PlayerDirection.Standby,
        turn: PlayerTurn.Standby,
    },
    player: { coords: { x: 1.5, y: 1.5 }, angle: 0.3 },
    rays: [],
    rayCount: 0,
};
const FPS = 60;
const MOVE_VELOCITY = 0.2;
const TURN_VELOCITY = Math.PI / 30;
const FOV = Math.PI / 3;
const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));
/// <reference path="../types.ts" />
/// <reference path="../utils.ts" />
const updateControls = (controls, inputs) => {
    const newControls = deepCopy(controls);
    inputs.forEach((input) => {
        switch (input) {
            case Input.START_UP:
                newControls.direction = PlayerDirection.Forward;
                break;
            case Input.START_DOWN:
                newControls.direction = PlayerDirection.Backward;
                break;
            case Input.END_UP:
                if (controls.direction === PlayerDirection.Forward) {
                    newControls.direction = PlayerDirection.Standby;
                }
                break;
            case Input.END_DOWN:
                if (controls.direction === PlayerDirection.Backward) {
                    newControls.direction = PlayerDirection.Standby;
                }
                break;
            case Input.START_LEFT:
                newControls.turn = PlayerTurn.Left;
                break;
            case Input.START_RIGHT:
                newControls.turn = PlayerTurn.Right;
                break;
            case Input.END_LEFT:
                if (controls.turn === PlayerTurn.Left) {
                    newControls.turn = PlayerTurn.Standby;
                }
                break;
            case Input.END_RIGHT:
                if (controls.turn === PlayerTurn.Right) {
                    newControls.turn = PlayerTurn.Standby;
                }
                break;
        }
    });
    return newControls;
};
/// <reference path="../constants.ts" />
/// <reference path="../types.ts" />
const collide = (map, coords) => map[Math.floor(coords.y)][Math.floor(coords.x)] === 1;
const getPlayerNewCoords = (map, playerState, playerControls) => {
    if (![PlayerDirection.Forward, PlayerDirection.Backward].includes(playerControls.direction)) {
        return playerState.coords;
    }
    const goingForward = playerControls.direction === PlayerDirection.Forward;
    const xDelta = Math.cos(playerState.angle) * MOVE_VELOCITY;
    const yDelta = Math.sin(playerState.angle) * MOVE_VELOCITY;
    const newX = goingForward
        ? playerState.coords.x + xDelta
        : playerState.coords.x - xDelta;
    const newY = goingForward
        ? playerState.coords.y + yDelta
        : playerState.coords.y - yDelta;
    const eligibleCoords = [
        { x: newX, y: newY },
        { x: newX, y: playerState.coords.y },
        { x: playerState.coords.x, y: newY }, // if collision on new X axis
    ];
    return (eligibleCoords.find((coords) => !collide(map, coords)) || playerState.coords);
};
const getPlayerNewAngle = (oldAngle, playerControls) => {
    // Left of backward right turn
    if ((playerControls.direction !== PlayerDirection.Backward &&
        playerControls.turn === PlayerTurn.Left) ||
        (playerControls.direction === PlayerDirection.Backward &&
            playerControls.turn === PlayerTurn.Right)) {
        const newAngle = oldAngle - TURN_VELOCITY;
        return newAngle < 0 ? newAngle + 2 * Math.PI : newAngle;
    }
    // Right or backward left turn
    if ((playerControls.direction !== PlayerDirection.Backward &&
        playerControls.turn === PlayerTurn.Right) ||
        (playerControls.direction === PlayerDirection.Backward &&
            playerControls.turn === PlayerTurn.Left)) {
        return (oldAngle + TURN_VELOCITY) % (2 * Math.PI);
    }
    // No turn
    return oldAngle;
};
const updatePlayer = (map, playerState, playerControls) => {
    const newPlayerState = deepCopy(playerState);
    newPlayerState.coords = getPlayerNewCoords(map, playerState, playerControls);
    newPlayerState.angle = getPlayerNewAngle(playerState.angle, playerControls);
    return newPlayerState;
};
/// <reference path="../constants.ts" />
/// <reference path="../types.ts" />
const getRayDirections = (angle) => {
    const rayDirections = [];
    if (angle > 0 && angle < Math.PI) {
        rayDirections.push(CardinalDirection.South);
    }
    else {
        rayDirections.push(CardinalDirection.North);
    }
    if (angle > Math.PI / 2 && angle < Math.PI * 1.5) {
        rayDirections.push(CardinalDirection.West);
    }
    else {
        rayDirections.push(CardinalDirection.East);
    }
    return rayDirections;
};
const areCoordsOutOfMap = (coords, map) => coords.x < 0 ||
    coords.x >= map[0].length ||
    coords.y < 0 ||
    coords.y >= map.length;
const areCoordsAWall = (coords, map) => map[coords.y][coords.x] === 1;
const findCollisionCoords = (map, coords, xOffset, yOffset, verticalDirection, facingDecreasingIndex) => {
    const directionOffset = facingDecreasingIndex ? -1 : 0;
    const cellCoords = verticalDirection
        ? {
            x: Math.floor(coords.x),
            y: coords.y + directionOffset,
        }
        : {
            x: coords.x + directionOffset,
            y: Math.floor(coords.y),
        };
    if (areCoordsOutOfMap(cellCoords, map)) {
        return null;
    }
    if (areCoordsAWall(cellCoords, map)) {
        return coords;
    }
    const nextCoordsToCheck = { x: coords.x + xOffset, y: coords.y + yOffset };
    return findCollisionCoords(map, nextCoordsToCheck, xOffset, yOffset, verticalDirection, facingDecreasingIndex);
};
const findVerticalCollisionCoords = (rayStartCoords, rayAngle, map, facingDecreasingIndex) => {
    if (rayAngle === 0 || rayAngle === Math.PI) {
        return null;
    }
    const y = facingDecreasingIndex
        ? Math.floor(rayStartCoords.y)
        : Math.ceil(rayStartCoords.y);
    const x = rayStartCoords.x + (y - rayStartCoords.y) / Math.tan(rayAngle);
    const A = { x, y };
    const yOffset = facingDecreasingIndex ? -1 : 1;
    const xOffset = yOffset / Math.tan(rayAngle);
    const collidingCoords = findCollisionCoords(map, A, xOffset, yOffset, true, facingDecreasingIndex);
    return collidingCoords;
};
const findHorizontalCollidisionCoords = (rayStartCoords, rayAngle, map, facingDecreasingIndex) => {
    if (rayAngle === Math.PI / 2 || rayAngle === Math.PI * 1.5) {
        return null;
    }
    const x = facingDecreasingIndex
        ? Math.floor(rayStartCoords.x)
        : Math.ceil(rayStartCoords.x);
    const y = rayStartCoords.y + (x - rayStartCoords.x) * Math.tan(rayAngle);
    const B = { x, y };
    const xOffset = facingDecreasingIndex ? -1 : 1;
    const yOffset = xOffset * Math.tan(rayAngle);
    const collidingCoords = findCollisionCoords(map, B, xOffset, yOffset, false, facingDecreasingIndex);
    return collidingCoords;
};
const getRay = (rayStartCoords, rayAngle, map) => {
    const rayDirections = getRayDirections(rayAngle);
    const verticalCollisionCoords = findVerticalCollisionCoords(rayStartCoords, rayAngle, map, rayDirections.includes(CardinalDirection.North));
    const horizontalCollisionCoords = findHorizontalCollidisionCoords(rayStartCoords, rayAngle, map, rayDirections.includes(CardinalDirection.West));
    const verticalRay = verticalCollisionCoords && {
        start: rayStartCoords,
        end: verticalCollisionCoords,
        distance: Math.sqrt(Math.pow((rayStartCoords.x - verticalCollisionCoords.x), 2) +
            Math.pow((rayStartCoords.y - verticalCollisionCoords.y), 2)),
        origin: rayDirections.includes(CardinalDirection.North)
            ? CardinalDirection.North
            : CardinalDirection.South,
    };
    const horizontalRay = horizontalCollisionCoords && {
        start: rayStartCoords,
        end: horizontalCollisionCoords,
        distance: Math.sqrt(Math.pow((rayStartCoords.x - horizontalCollisionCoords.x), 2) +
            Math.pow((rayStartCoords.y - horizontalCollisionCoords.y), 2)),
        origin: rayDirections.includes(CardinalDirection.West)
            ? CardinalDirection.West
            : CardinalDirection.East,
    };
    if (verticalRay && horizontalRay) {
        // Use the coords that are closer to the player
        return verticalRay.distance < horizontalRay.distance
            ? verticalRay
            : horizontalRay;
    }
    return (verticalRay || horizontalRay);
};
const fixDistortion = (ray, playerAngle, rayAngle) => (Object.assign(Object.assign({}, ray), { distance: ray.distance * Math.cos(playerAngle - rayAngle) }));
const getRays = (gameState) => {
    const angleStep = FOV / gameState.rayCount;
    const angleStart = gameState.player.angle - FOV / 2;
    const rayStart = gameState.player.coords;
    const rays = [...Array(gameState.rayCount)].map((_, i) => {
        const rayAngle = (angleStart + i * angleStep) % (Math.PI * 2);
        const ray = getRay(rayStart, rayAngle, gameState.map);
        return fixDistortion(ray, gameState.player.angle, rayAngle);
    });
    return rays;
};
/// <reference path="./controls.ts" />
/// <reference path="./player.ts" />
/// <reference path="./rays.ts" />
const updateGameState = (gameState, inputs) => {
    const newGameState = deepCopy(gameState);
    newGameState.controls = updateControls(gameState.controls, inputs);
    newGameState.player = updatePlayer(gameState.map, gameState.player, newGameState.controls);
    newGameState.rays = getRays(newGameState);
    return newGameState;
};
const loop = (defaultGameState, inputManager, renderer) => {
    let gameState = deepCopy(defaultGameState);
    let lastTimestamp = performance.now();
    const stepDelay = 1000 / FPS;
    renderer.draw(defaultGameState);
    /* Get subsequent states and draw frames */
    const drawNextFrame = (timestamp) => {
        if (timestamp - lastTimestamp > stepDelay) {
            const inputs = inputManager.getInputs();
            const rayCount = renderer.rayCount();
            gameState.rayCount = rayCount;
            gameState = updateGameState(gameState, inputs);
            renderer.draw(gameState);
            lastTimestamp = timestamp;
        }
        requestAnimationFrame(drawNextFrame);
    };
    requestAnimationFrame(drawNextFrame);
};
/// <reference path="./types.ts" />
const getBrowserInputmanager = () => {
    const inputs = [];
    window.addEventListener("keydown", (e) => {
        switch (e.key) {
            case "ArrowUp":
                inputs.push(Input.START_UP);
                break;
            case "ArrowDown":
                inputs.push(Input.START_DOWN);
                break;
            case "ArrowLeft":
                inputs.push(Input.START_LEFT);
                break;
            case "ArrowRight":
                inputs.push(Input.START_RIGHT);
                break;
        }
    });
    window.addEventListener("keyup", (e) => {
        switch (e.key) {
            case "ArrowUp":
                inputs.push(Input.END_UP);
                break;
            case "ArrowDown":
                inputs.push(Input.END_DOWN);
                break;
            case "ArrowLeft":
                inputs.push(Input.END_LEFT);
                break;
            case "ArrowRight":
                inputs.push(Input.END_RIGHT);
                break;
        }
    });
    const getInputs = () => {
        const inputsCopy = [...inputs];
        inputs.length = 0;
        return inputsCopy;
    };
    return { getInputs };
};
/// <reference path="./browser.ts" />
/// <reference path="./types.ts" />
const getInputManager = () => {
    const browserInputManager = getBrowserInputmanager();
    return browserInputManager;
};
/// <reference path="../../types.ts" />
const drawMap = (ctx, renderingValues, map) => {
    ctx.fillStyle = "black";
    map.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            if (cell === 1) {
                ctx.fillRect(renderingValues.minimapMargin +
                    colIndex * renderingValues.minimapCellSize, renderingValues.minimapMargin +
                    rowIndex * renderingValues.minimapCellSize, renderingValues.minimapCellSize, renderingValues.minimapCellSize);
            }
        });
    });
};
const drawPlayer = (ctx, renderingValues, playerState) => {
    ctx.beginPath();
    ctx.arc(renderingValues.minimapMargin +
        playerState.coords.x * renderingValues.minimapCellSize, renderingValues.minimapMargin +
        playerState.coords.y * renderingValues.minimapCellSize, renderingValues.minimapCellSize / 10, 0, 2 * Math.PI);
    ctx.fillStyle = "red";
    ctx.strokeStyle = "red";
    ctx.fill();
};
const drawRay = (ctx, renderingValues, ray) => {
    ctx.beginPath();
    ctx.moveTo(renderingValues.minimapMargin +
        ray.start.x * renderingValues.minimapCellSize, renderingValues.minimapMargin +
        ray.start.y * renderingValues.minimapCellSize);
    ctx.lineTo(renderingValues.minimapMargin + ray.end.x * renderingValues.minimapCellSize, renderingValues.minimapMargin + ray.end.y * renderingValues.minimapCellSize);
    ctx.strokeStyle = "orange";
    ctx.stroke();
};
const drawRays = (ctx, renderingValues, rays) => {
    rays.forEach((ray) => drawRay(ctx, renderingValues, ray));
};
const drawMinimap = (ctx, renderingValues, gameState) => {
    drawMap(ctx, renderingValues, gameState.map);
    drawPlayer(ctx, renderingValues, gameState.player);
    drawRays(ctx, renderingValues, gameState.rays);
};
/// <reference path="../../types.ts" />
const drawCeiling = (ctx, rayIndex, wallOffset) => {
    ctx.beginPath();
    ctx.moveTo(rayIndex, 0);
    ctx.lineTo(rayIndex, wallOffset);
    ctx.strokeStyle = "lightblue";
    ctx.stroke();
};
const drawWall = (ctx, rayIndex, ray, wallOffset, wallHeight, wallSide, texture) => {
    if (!texture) {
        return;
    }
    const wallTexture = [
        CardinalDirection.North,
        CardinalDirection.South,
    ].includes(wallSide)
        ? texture.wall
        : texture.wallLight;
    const sx = Math.floor((([CardinalDirection.North, CardinalDirection.South].includes(wallSide)
        ? ray.end.x
        : ray.end.y) %
        1) *
        wallTexture.width);
    ctx.drawImage(wallTexture, sx, 0, 1, texture.wall.height, rayIndex, wallOffset, 1, wallHeight);
};
const drawFloor = (ctx, rayIndex, wallOffset, wallHeight, projectionPlanHeight) => {
    ctx.beginPath();
    ctx.moveTo(rayIndex, wallOffset + wallHeight);
    ctx.lineTo(rayIndex, projectionPlanHeight);
    ctx.strokeStyle = "lightgreen";
    ctx.stroke();
};
const drawProjection = (ctx, renderingValues, gameState) => {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, renderingValues.projectionPlaneWidth, renderingValues.projectionPlaneHeight);
    gameState.rays.forEach((ray, rayIndex) => {
        const wallHeight = renderingValues.projectionPlaneDistance / ray.distance;
        const wallOffset = (renderingValues.projectionPlaneHeight - wallHeight) / 2;
        drawCeiling(ctx, rayIndex, wallOffset);
        drawWall(ctx, rayIndex, ray, wallOffset, wallHeight, ray.origin, renderingValues.texture);
        drawFloor(ctx, rayIndex, wallOffset, wallHeight, renderingValues.projectionPlaneHeight);
    });
};
/// <reference path="./minimap.ts" />
/// <reference path="./projection.ts" />
/// <reference path="./types.ts" />
const draw = (ctx, renderingValues, gameState) => {
    drawProjection(ctx, renderingValues, gameState);
    drawMinimap(ctx, renderingValues, gameState);
};
const loadTexture = () => {
    const wallImage = new Image();
    wallImage.src = "./assets/wall.jpg";
    const wallLightImage = new Image();
    wallLightImage.src = "./assets/wall-light.jpg";
    return {
        wall: wallImage,
        wallLight: wallLightImage,
    };
};
/// <reference path="../../types.ts" />
/// <reference path="./texture.ts" />
/// <reference path="./types.ts" />
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const getCanvasAndRenderingContext = (document) => {
    const canvas = document.getElementById("canvas");
    if (!canvas) {
        throw "Could not found canvas element";
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw "Could not get canvas' 2D context";
    }
    return { canvas, ctx };
};
const setCanvasSize = (window, canvas) => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};
const setCanvasRenderingValues = (renderingValues, canvas, gameState) => {
    const nbCellWidth = gameState.map[0].length;
    const nbCellHeight = gameState.map.length;
    const minimapRatio = nbCellWidth / nbCellHeight;
    renderingValues.minimapHeight = canvas.height / 5;
    renderingValues.minimapWidth = renderingValues.minimapHeight * minimapRatio;
    renderingValues.minimapCellSize =
        renderingValues.minimapHeight / gameState.map.length;
    renderingValues.minimapMargin = renderingValues.minimapHeight / 10;
    renderingValues.projectionPlaneWidth = canvas.width;
    renderingValues.projectionPlaneHeight = canvas.height;
    renderingValues.projectionPlaneDistance =
        canvas.width / 2 / Math.tan(FOV / 2);
};
const initCanvasRenderer = (window, document, renderingValues, gameState) => __awaiter(void 0, void 0, void 0, function* () {
    const { canvas, ctx } = getCanvasAndRenderingContext(document);
    setCanvasSize(window, canvas);
    setCanvasRenderingValues(renderingValues, canvas, gameState);
    renderingValues.texture = loadTexture();
    window.addEventListener("resize", () => {
        setCanvasSize(window, canvas);
        setCanvasRenderingValues(renderingValues, canvas, gameState);
    });
    return { canvas, ctx };
});
/// <reference path="./draw.ts" />
/// <reference path="./init.ts" />
/// <reference path="./types.ts" />
const getCanvasRenderer = (defaultGameState) => __awaiter(void 0, void 0, void 0, function* () {
    const renderingValues = {
        minimapCellSize: 0,
        minimapMargin: 0,
        minimapWidth: 0,
        minimapHeight: 0,
        projectionPlaneWidth: 0,
        projectionPlaneHeight: 0,
        projectionPlaneDistance: 0,
        texture: undefined,
    };
    const { canvas, ctx } = yield initCanvasRenderer(window, document, renderingValues, defaultGameState);
    return {
        draw: (gameState) => draw(ctx, renderingValues, gameState),
        rayCount: () => renderingValues.projectionPlaneWidth,
        canvas,
        ctx,
    };
});
/// <reference path="./canvas/index.ts" />
/// <reference path="./types.ts" />
const getRenderer = (defaultGameState) => __awaiter(void 0, void 0, void 0, function* () {
    const canvasRenderer = yield getCanvasRenderer(defaultGameState);
    return canvasRenderer;
});
/// <reference path="./constants.ts" />
/// <reference path="./game/index.ts" />
/// <reference path="./input/index.ts" />
/// <reference path="./renderer/index.ts" />
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    const inputManager = getInputManager();
    const renderer = yield getRenderer(DEFAULT_GAME_STATE);
    loop(DEFAULT_GAME_STATE, inputManager, renderer);
});
main();
