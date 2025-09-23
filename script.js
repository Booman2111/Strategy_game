// Advanced Wars Strategy Game - JavaScript Implementation

class StrategyGame {
    constructor(gameSettings = null) {
        // Game settings (can be customized)
        this.gameSettings = gameSettings || {
            players: 2,
            gameMode: 'multiplayer',
            startingMoney: 2000,
            incomePerTurn: 500,
            actionsPerTurn: 5,
            mapPreset: 'default',
            mapSize: '12x8',
            turnLimit: null,
            maxTurns: null
        };
        
        // Parse map size
        const [width, height] = this.gameSettings.mapSize.split('x').map(Number);
        this.mapWidth = width;
        this.mapHeight = height;
        
        this.currentPlayer = 1;
        this.turnNumber = 1;
        this.selectedUnit = null;
        this.gameBoard = [];
        this.units = [];
        this.gameState = 'playing'; // 'playing', 'gameOver'
        this.gameMode = null; // 'move', 'attack', 'wait'
        this.currentActionMode = null; // 'move', 'attack' - for UI mode selection
        
        // Action points and economy system
        this.maxActionsPerTurn = this.gameSettings.actionsPerTurn;
        this.currentActions = this.maxActionsPerTurn;
        this.playerMoney = {};
        
        // Initialize player money
        for (let i = 1; i <= this.gameSettings.players; i++) {
            this.playerMoney[i] = this.gameSettings.startingMoney;
        }
        
        this.incomePerTurn = this.gameSettings.incomePerTurn;
        this.selectedBuildingTile = null; // For building units
        
        // Don't initialize game automatically - wait for page navigation
        if (document.getElementById('gamePage').classList.contains('active')) {
            this.initializeGame();
        }
        this.setupEventListeners();
    }

    // Unit Types Configuration
    getUnitTypes() {
        return {
            infantry: {
                name: 'Infantry',
                symbol: 'I',
                health: 100,
                maxHealth: 100,
                movement: 3,
                attackRange: 1,
                attackPower: 55,
                defense: 60,
                cost: 800,
                canCapture: true,
                actionCost: 1
            },
            tank: {
                name: 'Tank',
                symbol: 'T',
                health: 100,
                maxHealth: 100,
                movement: 4,
                attackRange: 1,
                attackPower: 85,
                defense: 70,
                cost: 2500,
                canCapture: false,
                actionCost: 2
            },
            artillery: {
                name: 'Artillery',
                symbol: 'A',
                health: 100,
                maxHealth: 100,
                movement: 1,
                attackRange: 3,
                attackPower: 90,
                defense: 50,
                cost: 2000,
                canCapture: false,
                actionCost: 2
            }
        };
    }

    // Terrain Types Configuration
    getTerrainTypes() {
        return {
            plains: {
                name: 'Plains',
                defenseBonus: 0,
                movementCost: 1,
                className: 'terrain-plains'
            },
            forest: {
                name: 'Forest',
                defenseBonus: 1,
                movementCost: 2,
                className: 'terrain-forest'
            },
            city: {
                name: 'City',
                defenseBonus: 2,
                movementCost: 1,
                className: 'terrain-city',
                capturable: true
            },
            hq: {
                name: 'Headquarters',
                defenseBonus: 3,
                movementCost: 1,
                className: 'terrain-hq',
                capturable: true
            },
            water: {
                name: 'Water',
                defenseBonus: 0,
                movementCost: 999,
                className: 'terrain-water'
            }
        };
    }

    initializeGame() {
        this.createMap();
        this.placeInitialUnits();
        this.renderBoard();
        this.updateUI();
        this.logMessage("Game started. Player 1's turn.");
    }

    createMap() {
        // Initialize board with plains
        for (let y = 0; y < this.mapHeight; y++) {
            this.gameBoard[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                this.gameBoard[y][x] = {
                    terrain: 'plains',
                    unit: null,
                    owner: null
                };
            }
        }

        // Generate map based on preset
        switch (this.gameSettings.mapPreset) {
            case 'small':
                this.generateSmallMap();
                break;
            case 'large':
                this.generateLargeMap();
                break;
            case 'islands':
                this.generateIslandsMap();
                break;
            case 'chokepoint':
                this.generateChokepointMap();
                break;
            default:
                this.generateDefaultMap();
        }

        // Place headquarters for all players
        this.placeHeadquarters();
    }

    generateDefaultMap() {
        // Add some forests
        const forestPositions = [
            [2, 2], [3, 2], [this.mapWidth-3, 2], [this.mapWidth-4, 2],
            [1, Math.floor(this.mapHeight/2)], [2, Math.floor(this.mapHeight/2)], 
            [this.mapWidth-2, Math.floor(this.mapHeight/2)], [this.mapWidth-3, Math.floor(this.mapHeight/2)],
            [2, this.mapHeight-3], [3, this.mapHeight-3], [this.mapWidth-3, this.mapHeight-3], [this.mapWidth-4, this.mapHeight-3]
        ];
        forestPositions.forEach(([x, y]) => {
            if (this.isValidPosition(x, y)) {
                this.gameBoard[y][x].terrain = 'forest';
            }
        });

        // Add cities
        const cityPositions = [
            [1, 1], [this.mapWidth-2, 1], [Math.floor(this.mapWidth/2), Math.floor(this.mapHeight/3)], [Math.floor(this.mapWidth/2)+1, Math.floor(this.mapHeight/3)],
            [1, this.mapHeight-2], [this.mapWidth-2, this.mapHeight-2], [Math.floor(this.mapWidth/2), this.mapHeight-Math.floor(this.mapHeight/3)-1], [Math.floor(this.mapWidth/2)+1, this.mapHeight-Math.floor(this.mapHeight/3)-1]
        ];
        cityPositions.forEach(([x, y]) => {
            if (this.isValidPosition(x, y)) {
                this.gameBoard[y][x].terrain = 'city';
            }
        });

        // Add some water in the center
        const waterPositions = [
            [Math.floor(this.mapWidth/2), 0], [Math.floor(this.mapWidth/2)+1, 0], 
            [Math.floor(this.mapWidth/2), 1], [Math.floor(this.mapWidth/2)+1, 1],
            [Math.floor(this.mapWidth/2), this.mapHeight-2], [Math.floor(this.mapWidth/2)+1, this.mapHeight-2], 
            [Math.floor(this.mapWidth/2), this.mapHeight-1], [Math.floor(this.mapWidth/2)+1, this.mapHeight-1]
        ];
        waterPositions.forEach(([x, y]) => {
            if (this.isValidPosition(x, y)) {
                this.gameBoard[y][x].terrain = 'water';
            }
        });
    }

    generateSmallMap() {
        // Smaller map with fewer features
        const forestPositions = [
            [1, 1], [this.mapWidth-2, 1],
            [1, this.mapHeight-2], [this.mapWidth-2, this.mapHeight-2]
        ];
        forestPositions.forEach(([x, y]) => {
            if (this.isValidPosition(x, y)) {
                this.gameBoard[y][x].terrain = 'forest';
            }
        });

        // Add a couple cities
        if (this.isValidPosition(Math.floor(this.mapWidth/2), Math.floor(this.mapHeight/2))) {
            this.gameBoard[Math.floor(this.mapHeight/2)][Math.floor(this.mapWidth/2)].terrain = 'city';
        }
    }

    generateLargeMap() {
        // More complex terrain for large maps
        // Add multiple forest clusters
        for (let i = 0; i < 4; i++) {
            const centerX = Math.floor(Math.random() * (this.mapWidth - 4)) + 2;
            const centerY = Math.floor(Math.random() * (this.mapHeight - 4)) + 2;
            
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const x = centerX + dx;
                    const y = centerY + dy;
                    if (this.isValidPosition(x, y) && Math.random() > 0.3) {
                        this.gameBoard[y][x].terrain = 'forest';
                    }
                }
            }
        }

        // Add more cities
        const cityCount = Math.floor((this.mapWidth * this.mapHeight) / 20);
        for (let i = 0; i < cityCount; i++) {
            const x = Math.floor(Math.random() * this.mapWidth);
            const y = Math.floor(Math.random() * this.mapHeight);
            if (this.isValidPosition(x, y) && this.gameBoard[y][x].terrain === 'plains') {
                this.gameBoard[y][x].terrain = 'city';
            }
        }
    }

    generateIslandsMap() {
        // Create water barriers creating island-like sections
        // Vertical water barrier in middle
        const centerX = Math.floor(this.mapWidth / 2);
        for (let y = 2; y < this.mapHeight - 2; y++) {
            if (this.isValidPosition(centerX, y)) {
                this.gameBoard[y][centerX].terrain = 'water';
            }
            if (this.isValidPosition(centerX + 1, y)) {
                this.gameBoard[y][centerX + 1].terrain = 'water';
            }
        }

        // Add forests on each side
        const leftForests = [[1, 2], [2, 3], [1, this.mapHeight-3], [2, this.mapHeight-4]];
        const rightForests = [[this.mapWidth-2, 2], [this.mapWidth-3, 3], [this.mapWidth-2, this.mapHeight-3], [this.mapWidth-3, this.mapHeight-4]];
        
        [...leftForests, ...rightForests].forEach(([x, y]) => {
            if (this.isValidPosition(x, y)) {
                this.gameBoard[y][x].terrain = 'forest';
            }
        });

        // Cities on each island
        const cities = [[2, 1], [this.mapWidth-3, 1], [2, this.mapHeight-2], [this.mapWidth-3, this.mapHeight-2]];
        cities.forEach(([x, y]) => {
            if (this.isValidPosition(x, y)) {
                this.gameBoard[y][x].terrain = 'city';
            }
        });
    }

    generateChokepointMap() {
        // Create narrow passages with strategic points
        const centerY = Math.floor(this.mapHeight / 2);
        
        // Create horizontal water barriers with gaps
        for (let x = 2; x < this.mapWidth - 2; x++) {
            if (x !== Math.floor(this.mapWidth / 2) && x !== Math.floor(this.mapWidth / 2) + 1) {
                if (this.isValidPosition(x, centerY)) {
                    this.gameBoard[centerY][x].terrain = 'water';
                }
            }
        }

        // Add forests near chokepoints
        const chokepointForests = [
            [Math.floor(this.mapWidth / 2) - 1, centerY - 1],
            [Math.floor(this.mapWidth / 2) + 2, centerY - 1],
            [Math.floor(this.mapWidth / 2) - 1, centerY + 1],
            [Math.floor(this.mapWidth / 2) + 2, centerY + 1]
        ];
        chokepointForests.forEach(([x, y]) => {
            if (this.isValidPosition(x, y)) {
                this.gameBoard[y][x].terrain = 'forest';
            }
        });

        // Strategic cities
        const strategicCities = [
            [Math.floor(this.mapWidth / 2), centerY - 2],
            [Math.floor(this.mapWidth / 2) + 1, centerY + 2]
        ];
        strategicCities.forEach(([x, y]) => {
            if (this.isValidPosition(x, y)) {
                this.gameBoard[y][x].terrain = 'city';
            }
        });
    }

    placeHeadquarters() {
        // Place HQs based on number of players
        const players = this.gameSettings.players;
        
        if (players === 2) {
            // Traditional diagonal corners
            this.gameBoard[0][0].terrain = 'hq';
            this.gameBoard[0][0].owner = 1;
            this.gameBoard[this.mapHeight - 1][this.mapWidth - 1].terrain = 'hq';
            this.gameBoard[this.mapHeight - 1][this.mapWidth - 1].owner = 2;
        } else if (players === 3) {
            // Three corners
            this.gameBoard[0][0].terrain = 'hq';
            this.gameBoard[0][0].owner = 1;
            this.gameBoard[0][this.mapWidth - 1].terrain = 'hq';
            this.gameBoard[0][this.mapWidth - 1].owner = 2;
            this.gameBoard[this.mapHeight - 1][Math.floor(this.mapWidth / 2)].terrain = 'hq';
            this.gameBoard[this.mapHeight - 1][Math.floor(this.mapWidth / 2)].owner = 3;
        } else if (players === 4) {
            // Four corners
            this.gameBoard[0][0].terrain = 'hq';
            this.gameBoard[0][0].owner = 1;
            this.gameBoard[0][this.mapWidth - 1].terrain = 'hq';
            this.gameBoard[0][this.mapWidth - 1].owner = 2;
            this.gameBoard[this.mapHeight - 1][0].terrain = 'hq';
            this.gameBoard[this.mapHeight - 1][0].owner = 3;
            this.gameBoard[this.mapHeight - 1][this.mapWidth - 1].terrain = 'hq';
            this.gameBoard[this.mapHeight - 1][this.mapWidth - 1].owner = 4;
        }
    }

    placeInitialUnits() {
        const players = this.gameSettings.players;
        
        // Starting units for each player based on number of players
        if (players === 2) {
            // Player 1 units (top-left)
            this.addUnit(1, 0, 'infantry', 1);
            this.addUnit(2, 0, 'tank', 1);
            this.addUnit(0, 1, 'infantry', 1);
            this.addUnit(1, 1, 'infantry', 1);

            // Player 2 units (bottom-right)
            this.addUnit(this.mapWidth - 2, this.mapHeight - 1, 'infantry', 2);
            this.addUnit(this.mapWidth - 3, this.mapHeight - 1, 'tank', 2);
            this.addUnit(this.mapWidth - 1, this.mapHeight - 2, 'infantry', 2);
            this.addUnit(this.mapWidth - 2, this.mapHeight - 2, 'infantry', 2);
        } else if (players === 3) {
            // Player 1 (top-left)
            this.addUnit(1, 0, 'infantry', 1);
            this.addUnit(0, 1, 'infantry', 1);
            
            // Player 2 (top-right)
            this.addUnit(this.mapWidth - 2, 0, 'infantry', 2);
            this.addUnit(this.mapWidth - 1, 1, 'infantry', 2);
            
            // Player 3 (bottom-center)
            this.addUnit(Math.floor(this.mapWidth / 2) - 1, this.mapHeight - 1, 'infantry', 3);
            this.addUnit(Math.floor(this.mapWidth / 2) + 1, this.mapHeight - 1, 'infantry', 3);
        } else if (players === 4) {
            // Player 1 (top-left)
            this.addUnit(1, 0, 'infantry', 1);
            this.addUnit(0, 1, 'infantry', 1);
            
            // Player 2 (top-right)
            this.addUnit(this.mapWidth - 2, 0, 'infantry', 2);
            this.addUnit(this.mapWidth - 1, 1, 'infantry', 2);
            
            // Player 3 (bottom-left)
            this.addUnit(1, this.mapHeight - 1, 'infantry', 3);
            this.addUnit(0, this.mapHeight - 2, 'infantry', 3);
            
            // Player 4 (bottom-right)
            this.addUnit(this.mapWidth - 2, this.mapHeight - 1, 'infantry', 4);
            this.addUnit(this.mapWidth - 1, this.mapHeight - 2, 'infantry', 4);
        }
    }

    addUnit(x, y, type, player) {
        if (!this.isValidPosition(x, y) || this.gameBoard[y][x].unit) {
            return false;
        }

        const unitTypes = this.getUnitTypes();
        const unitTemplate = unitTypes[type];
        
        const unit = {
            id: `${player}-${type}-${x}-${y}-${Date.now()}`,
            type: type,
            x: x,
            y: y,
            player: player,
            health: unitTemplate.health,
            maxHealth: unitTemplate.maxHealth,
            movement: unitTemplate.movement,
            attackRange: unitTemplate.attackRange,
            attackPower: unitTemplate.attackPower,
            defense: unitTemplate.defense,
            canCapture: unitTemplate.canCapture,
            hasActed: false,
            hasMoved: false, // New: tracks if unit moved this turn
            symbol: unitTemplate.symbol,
            actionCost: unitTemplate.actionCost,
            captureProgress: 0, // Progress towards capturing current building (0-3)
            capturingBuildingPos: null // Position of building being captured {x, y}
        };

        this.units.push(unit);
        this.gameBoard[y][x].unit = unit;
        return true;
    }

    isValidPosition(x, y) {
        return x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight;
    }

    renderBoard() {
        const boardElement = document.getElementById('gameBoard');
        boardElement.innerHTML = '';

        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.dataset.x = x;
                tile.dataset.y = y;
                
                const cell = this.gameBoard[y][x];
                const terrainTypes = this.getTerrainTypes();
                
                // Add terrain class
                tile.classList.add(terrainTypes[cell.terrain].className);
                
                // Add player ownership class for capturable buildings
                if (cell.owner && (cell.terrain === 'city' || cell.terrain === 'hq')) {
                    tile.classList.add(`owned-by-player${cell.owner}`);
                }
                
                // Add unit if present
                if (cell.unit) {
                    const unitElement = document.createElement('div');
                    unitElement.className = `unit player${cell.unit.player}`;
                    unitElement.textContent = cell.unit.symbol;
                    
                    // Add health indicator
                    const healthPercent = cell.unit.health / cell.unit.maxHealth;
                    if (healthPercent > 0.7) {
                        unitElement.classList.add('full-health');
                    } else if (healthPercent > 0.3) {
                        unitElement.classList.add('damaged');
                    } else {
                        unitElement.classList.add('critical');
                    }
                    
                    if (this.selectedUnit && this.selectedUnit.id === cell.unit.id) {
                        unitElement.classList.add('selected');
                    }
                    
                    // Add health display underneath unit
                    const healthDisplay = document.createElement('div');
                    healthDisplay.className = 'unit-health';
                    healthDisplay.textContent = `${cell.unit.health}/${cell.unit.maxHealth}`;
                    
                    // Color code health display based on health percentage
                    const healthPct = cell.unit.health / cell.unit.maxHealth;
                    if (healthPct > 0.7) {
                        healthDisplay.classList.add('health-good');
                    } else if (healthPct > 0.3) {
                        healthDisplay.classList.add('health-damaged');
                    } else {
                        healthDisplay.classList.add('health-critical');
                    }
                    
                    unitElement.appendChild(healthDisplay);
                    
                    // Add capture progress indicator
                    if (cell.unit.captureProgress > 0) {
                        const captureIndicator = document.createElement('div');
                        captureIndicator.className = 'capture-progress';
                        captureIndicator.textContent = cell.unit.captureProgress;
                        unitElement.appendChild(captureIndicator);
                    }
                    
                    tile.appendChild(unitElement);
                }
                
                tile.addEventListener('click', () => this.handleTileClick(x, y));
                boardElement.appendChild(tile);
            }
        }
    }

    handleTileClick(x, y) {
        if (this.gameState !== 'playing') return;

        // In single player mode, prevent human interaction during bot's turn
        if (this.gameSettings.gameMode === 'singleplayer' && this.currentPlayer === 2) {
            return;
        }

        const cell = this.gameBoard[y][x];
        
        // If there's a unit on this tile
        if (cell.unit) {
            // If it's the current player's unit, select it
            if (cell.unit.player === this.currentPlayer && !cell.unit.hasMoved) {
                this.selectUnit(cell.unit);
            }
            // If it's an enemy unit and we have a selected unit, handle based on mode
            else if (this.selectedUnit && cell.unit.player !== this.currentPlayer) {
                if (this.currentActionMode === 'attack') {
                    this.attemptAttack(x, y);
                } else if (this.currentActionMode === null) {
                    this.logMessage("Please select Move or Attack mode first!");
                } else {
                    this.logMessage("Switch to Attack mode to attack enemy units!");
                }
            }
        } else {
            // Empty tile - check if it's a building for unit creation
            const terrainTypes = this.getTerrainTypes();
            if ((cell.terrain === 'city' || cell.terrain === 'hq') && cell.owner === this.currentPlayer) {
                this.selectBuildingTile(x, y);
            }
            // Or try to move selected unit here (only in move mode)
            else if (this.selectedUnit) {
                if (this.currentActionMode === 'move') {
                    this.attemptMove(x, y);
                } else if (this.currentActionMode === null) {
                    this.logMessage("Please select Move or Attack mode first!");
                } else {
                    this.logMessage("Switch to Move mode to move units!");
                }
            }
        }
    }

    setActionMode(mode) {
        this.currentActionMode = mode;
        this.updateModeIndicators();
        this.updateTileHighlighting();
        this.logMessage(`Switched to ${mode} mode`);
    }

    updateModeIndicators() {
        const moveBtn = document.getElementById('moveBtn');
        const attackBtn = document.getElementById('attackBtn');
        const modeIndicator = document.getElementById('modeIndicator');

        // Remove active class from both buttons
        moveBtn.classList.remove('active');
        attackBtn.classList.remove('active');
        
        // Remove mode classes from indicator
        modeIndicator.classList.remove('move-mode', 'attack-mode');

        if (this.currentActionMode === 'move') {
            moveBtn.classList.add('active');
            modeIndicator.classList.add('move-mode');
            modeIndicator.textContent = 'Mode: 📍 Move Selected';
        } else if (this.currentActionMode === 'attack') {
            attackBtn.classList.add('active');
            modeIndicator.classList.add('attack-mode');
            modeIndicator.textContent = 'Mode: ⚔️ Attack Selected';
        } else {
            modeIndicator.textContent = 'Mode: None Selected';
        }
    }

    updateTileHighlighting() {
        this.clearHighlights();
        if (this.selectedUnit) {
            if (this.currentActionMode === 'move') {
                this.highlightMoveablePositions();
            } else if (this.currentActionMode === 'attack') {
                this.highlightAttackablePositions();
            } else {
                // Show both if no mode selected
                this.highlightMoveablePositions();
                this.highlightAttackablePositions();
            }
        }
        this.renderBoard();
    }

    selectUnit(unit) {
        // Clear previous selection
        this.clearHighlights();
        
        this.selectedUnit = unit;
        this.currentActionMode = null; // Reset mode when selecting new unit
        this.updateUnitInfo();
        this.updateTileHighlighting();
        this.updateActionButtons();
        
        // Show mode selection panel
        document.getElementById('modeSelection').style.display = 'block';
        this.updateModeIndicators();
        
        this.logMessage(`Selected ${unit.type} at (${unit.x}, ${unit.y}) - Choose Move or Attack mode`);
    }

    clearHighlights() {
        const tiles = document.querySelectorAll('.tile');
        tiles.forEach(tile => {
            tile.classList.remove('movable', 'attackable', 'selected');
        });
    }

    highlightMoveablePositions() {
        if (!this.selectedUnit) return;

        const moveablePositions = this.getMoveablePositions(this.selectedUnit);
        moveablePositions.forEach(([x, y]) => {
            const tile = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
            if (tile) {
                tile.classList.add('movable');
            }
        });
    }

    highlightAttackablePositions() {
        if (!this.selectedUnit) return;

        const attackablePositions = this.getAttackablePositions(this.selectedUnit);
        attackablePositions.forEach(([x, y]) => {
            const tile = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
            if (tile && this.gameBoard[y][x].unit && this.gameBoard[y][x].unit.player !== this.currentPlayer) {
                tile.classList.add('attackable');
            }
        });
    }

    getMoveablePositions(unit) {
        const positions = [];
        const visited = new Set();
        const queue = [[unit.x, unit.y, 0]]; // [x, y, movementUsed]
        
        visited.add(`${unit.x},${unit.y}`);
        
        while (queue.length > 0) {
            const [x, y, movementUsed] = queue.shift();
            
            if (movementUsed < unit.movement) {
                const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                
                for (const [dx, dy] of directions) {
                    const newX = x + dx;
                    const newY = y + dy;
                    const key = `${newX},${newY}`;
                    
                    if (this.isValidPosition(newX, newY) && !visited.has(key)) {
                        const cell = this.gameBoard[newY][newX];
                        const terrainTypes = this.getTerrainTypes();
                        const movementCost = terrainTypes[cell.terrain].movementCost;
                        
                        // Check if unit can move through this terrain
                        let canMoveThrough = false;
                        if (movementCost < 999) {
                            canMoveThrough = true;
                        } else if (cell.terrain === 'water' && unit.type === 'infantry') {
                            // Infantry can move through water
                            canMoveThrough = true;
                        }
                        
                        // Check unit occupation rules
                        let canMoveToTile = false;
                        if (!cell.unit) {
                            // Empty tile - can move here
                            canMoveToTile = true;
                        } else if (newX === unit.x && newY === unit.y) {
                            // Starting position - can always pathfind through
                            canMoveToTile = true;
                        } else if (cell.unit.player === unit.player) {
                            // Friendly unit - can move through for pathfinding but not stop on
                            canMoveToTile = true;
                        }
                        // Enemy unit - cannot move through or to
                        
                        if (canMoveThrough && canMoveToTile) {
                            // Use actual movement cost, but treat water as cost 2 for infantry
                            const actualMovementCost = (cell.terrain === 'water' && unit.type === 'infantry') ? 2 : movementCost;
                            const newMovementUsed = movementUsed + actualMovementCost;
                            
                            if (newMovementUsed <= unit.movement) {
                                visited.add(key);
                                
                                // Only add as valid destination if tile is empty or starting position
                                if (!cell.unit || (newX === unit.x && newY === unit.y)) {
                                    if (!(newX === unit.x && newY === unit.y)) {
                                        positions.push([newX, newY]);
                                    }
                                }
                                // Always add to queue for pathfinding through friendly units
                                queue.push([newX, newY, newMovementUsed]);
                            }
                        }
                    }
                }
            }
        }
        
        return positions;
    }

    getAttackablePositions(unit) {
        const positions = [];
        
        // Only allow adjacent attacks (distance = 1)
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const distance = Math.abs(dx) + Math.abs(dy);
                // Only adjacent tiles (distance = 1), not diagonal (distance = 2) or same tile (distance = 0)
                if (distance === 1) {
                    const x = unit.x + dx;
                    const y = unit.y + dy;
                    
                    if (this.isValidPosition(x, y)) {
                        positions.push([x, y]);
                    }
                }
            }
        }
        
        return positions;
    }

    attemptMove(x, y) {
        if (!this.selectedUnit) return;
        
        // Check if player has enough actions
        if (this.currentActions < 1) {
            this.logMessage("Not enough actions remaining!");
            return;
        }

        const moveablePositions = this.getMoveablePositions(this.selectedUnit);
        const canMove = moveablePositions.some(([mx, my]) => mx === x && my === y);
        
        if (canMove) {
            this.moveUnit(this.selectedUnit, x, y);
        } else {
            this.logMessage("Cannot move to that position!");
        }
    }

    moveUnit(unit, newX, newY) {
        // Remove unit from old position
        this.gameBoard[unit.y][unit.x].unit = null;
        
        // Reset capture progress if moving away from capturing building
        if (unit.capturingBuildingPos && 
            (unit.capturingBuildingPos.x !== newX || unit.capturingBuildingPos.y !== newY)) {
            unit.captureProgress = 0;
            unit.capturingBuildingPos = null;
            this.logMessage(`${unit.type} stopped capturing and moved away.`);
        }
        
        // Update unit position
        unit.x = newX;
        unit.y = newY;
        
        // Place unit in new position
        this.gameBoard[newY][newX].unit = unit;
        
        // Consume action and mark unit as moved
        this.currentActions -= 1;
        unit.hasMoved = true;
        
        this.logMessage(`${unit.type} moved to (${newX}, ${newY}) - Actions remaining: ${this.currentActions}`);
        
        this.clearHighlights();
        this.selectedUnit = null;
        this.renderBoard();
        this.updateUI();
    }

    attemptAttack(x, y) {
        if (!this.selectedUnit) return;
        
        // Check if player has enough actions
        if (this.currentActions < 1) {
            this.logMessage("Not enough actions remaining!");
            return;
        }

        const attackablePositions = this.getAttackablePositions(this.selectedUnit);
        const canAttack = attackablePositions.some(([ax, ay]) => ax === x && ay === y);
        
        if (canAttack) {
            const target = this.gameBoard[y][x].unit;
            if (target && target.player !== this.currentPlayer) {
                this.performAttack(this.selectedUnit, target);
            }
        } else {
            // Check if we can move into attack position
            const moveToAttackPosition = this.findMoveToAttackPosition(this.selectedUnit, x, y);
            if (moveToAttackPosition) {
                // Move to attack position and then attack
                this.moveUnit(this.selectedUnit, moveToAttackPosition.x, moveToAttackPosition.y);
                this.logMessage(`Moving into attack position...`);
                
                // Now perform the attack
                const target = this.gameBoard[y][x].unit;
                if (target && target.player !== this.currentPlayer) {
                    this.performAttack(this.selectedUnit, target);
                }
            } else {
                this.logMessage("Cannot attack that target!");
            }
        }
    }

    findMoveToAttackPosition(unit, targetX, targetY) {
        // Get all positions unit can move to
        const moveablePositions = this.getMoveablePositions(unit);
        
        // Check each moveable position to see if it can attack the target
        for (const [mx, my] of moveablePositions) {
            // Skip if there's another unit on this position (except friendly units we can move through)
            const cell = this.gameBoard[my][mx];
            if (cell.unit && cell.unit !== unit && cell.unit.player !== unit.player) {
                continue;
            }
            if (cell.unit && cell.unit !== unit && cell.unit.player === unit.player) {
                continue; // Can't stop on friendly unit
            }
            
            // Check if from this position, we can attack the target (adjacent only)
            const dx = Math.abs(mx - targetX);
            const dy = Math.abs(my - targetY);
            const distance = dx + dy;
            
            if (distance === 1) {
                return { x: mx, y: my };
            }
        }
        
        return null; // No valid attack position found
    }

    performAttack(attacker, defender) {
        // Consume action
        this.currentActions -= 1;
        
        // Calculate damage
        const damage = this.calculateDamage(attacker, defender);
        defender.health = Math.max(0, defender.health - damage);
        
        this.logMessage(`${attacker.type} attacks ${defender.type} for ${damage} damage! Actions remaining: ${this.currentActions}`);
        
        // Check if defender is destroyed
        if (defender.health <= 0) {
            this.destroyUnit(defender);
            this.logMessage(`${defender.type} destroyed!`);
        } else {
            // Counter-attack if in range
            const counterAttackRange = this.getAttackablePositions(defender);
            const canCounterAttack = counterAttackRange.some(([cx, cy]) => cx === attacker.x && cy === attacker.y);
            
            if (canCounterAttack) {
                const counterDamage = this.calculateDamage(defender, attacker);
                attacker.health = Math.max(0, attacker.health - counterDamage);
                
                this.logMessage(`${defender.type} counter-attacks for ${counterDamage} damage!`);
                
                if (attacker.health <= 0) {
                    this.destroyUnit(attacker);
                    this.logMessage(`${attacker.type} destroyed by counter-attack!`);
                }
            }
        }
        
        // Mark attacker as having acted
        attacker.hasMoved = true;
        this.selectedUnit = null;
        this.clearHighlights();
        this.renderBoard();
        this.updateUI();
        this.checkVictoryConditions();
    }

    // New function for selecting building tiles
    selectBuildingTile(x, y) {
        this.selectedBuildingTile = {x, y};
        this.selectedUnit = null;
        this.clearHighlights();
        
        const tile = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        if (tile) {
            tile.classList.add('selected');
        }
        
        this.updateUI();
        this.logMessage(`Selected building at (${x}, ${y}). Choose unit type to build.`);
    }

    // New function for building units
    buildUnit(unitType) {
        if (!this.selectedBuildingTile) {
            this.logMessage("No building selected!");
            return;
        }

        const unitTypes = this.getUnitTypes();
        const unitTemplate = unitTypes[unitType];
        const cost = unitTemplate.cost;
        const actionCost = unitTemplate.actionCost;

        // Check if player has enough money and actions
        if (this.playerMoney[this.currentPlayer] < cost) {
            this.logMessage(`Not enough money! Need ${cost}, have ${this.playerMoney[this.currentPlayer]}`);
            return;
        }

        if (this.currentActions < actionCost) {
            this.logMessage(`Not enough actions! Need ${actionCost}, have ${this.currentActions}`);
            return;
        }

        const {x, y} = this.selectedBuildingTile;
        
        // Check if tile is empty
        if (this.gameBoard[y][x].unit) {
            this.logMessage("Building is occupied!");
            return;
        }

        // Build the unit
        if (this.addUnit(x, y, unitType, this.currentPlayer)) {
            this.playerMoney[this.currentPlayer] -= cost;
            this.currentActions -= actionCost;
            
            this.logMessage(`Built ${unitType} for ${cost} money and ${actionCost} actions! Money: ${this.playerMoney[this.currentPlayer]}, Actions: ${this.currentActions}`);
            
            this.selectedBuildingTile = null;
            this.clearHighlights();
            this.renderBoard();
            this.updateUI();
        }
    }
    
    calculateDamage(attacker, defender) {
        const terrainTypes = this.getTerrainTypes();
        const defenderTerrain = this.gameBoard[defender.y][defender.x].terrain;
        const terrainDefense = terrainTypes[defenderTerrain].defenseBonus;
        
        // Basic damage calculation
        const attackerHealthPercent = attacker.health / attacker.maxHealth;
        const effectiveAttack = attacker.attackPower * attackerHealthPercent;
        const effectiveDefense = defender.defense + (terrainDefense * 10);
        
        const baseDamage = (effectiveAttack - effectiveDefense) / 10;
        const damage = Math.max(1, Math.round(baseDamage + (Math.random() * 10)));
        
        return Math.min(damage, defender.health);
    }

    destroyUnit(unit) {
        // Remove from units array
        this.units = this.units.filter(u => u.id !== unit.id);
        
        // Remove from board
        this.gameBoard[unit.y][unit.x].unit = null;
        
        // Clear selection if this was the selected unit
        if (this.selectedUnit && this.selectedUnit.id === unit.id) {
            this.selectedUnit = null;
        }
    }

    captureBuilding(unit, x, y) {
        const cell = this.gameBoard[y][x];
        cell.owner = unit.player;
        this.logMessage(`Player ${unit.player} captured ${cell.terrain}!`);
    }

    endTurn() {
        // Reset all units' hasActed and hasMoved status for current player
        this.units.forEach(unit => {
            if (unit.player === this.currentPlayer) {
                unit.hasActed = false;
                unit.hasMoved = false;
            }
        });
        
        // Add income to current player
        this.playerMoney[this.currentPlayer] += this.incomePerTurn;
        
        // Switch players
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        
        // Reset actions for new player
        this.currentActions = this.maxActionsPerTurn;
        
        // Increment turn counter when it's player 1's turn
        if (this.currentPlayer === 1) {
            this.turnNumber++;
        }
        
        this.selectedUnit = null;
        this.selectedBuildingTile = null;
        this.clearHighlights();
        this.renderBoard();
        this.updateUI();
        
        this.logMessage(`Player ${this.currentPlayer}'s turn begins. Actions: ${this.currentActions}, Money: ${this.playerMoney[this.currentPlayer]}`);
        this.checkVictoryConditions();
        
        // Trigger AI if in single player mode and it's the bot's turn
        if (this.gameSettings.gameMode === 'singleplayer' && this.currentPlayer === 2) {
            this.executeAITurn();
        }
    }

    checkVictoryConditions() {
        // Check turn limit first
        if (this.gameSettings.turnLimit && this.gameSettings.maxTurns && this.turnNumber > this.gameSettings.maxTurns) {
            // Determine winner by remaining HQs or units
            let winner = this.determineWinnerByScore();
            this.gameOver(winner, `Turn limit reached (${this.gameSettings.maxTurns} turns)!`);
            return;
        }

        // Check if any player has captured all enemy HQs
        const players = this.gameSettings.players;
        
        for (let player = 1; player <= players; player++) {
            let hasWon = true;
            
            // Check if this player controls all HQs
            for (let y = 0; y < this.mapHeight; y++) {
                for (let x = 0; x < this.mapWidth; x++) {
                    const cell = this.gameBoard[y][x];
                    if (cell.terrain === 'hq' && cell.owner !== player) {
                        hasWon = false;
                        break;
                    }
                }
                if (!hasWon) break;
            }
            
            if (hasWon) {
                this.gameOver(player, `Player ${player} captured all headquarters!`);
                return;
            }
        }
    }

    determineWinnerByScore() {
        // Score based on: remaining HQs + controlled cities + unit count + money
        let scores = {};
        
        for (let player = 1; player <= this.gameSettings.players; player++) {
            scores[player] = 0;
            
            // Count controlled buildings
            for (let y = 0; y < this.mapHeight; y++) {
                for (let x = 0; x < this.mapWidth; x++) {
                    const cell = this.gameBoard[y][x];
                    if (cell.owner === player) {
                        if (cell.terrain === 'hq') scores[player] += 100;
                        else if (cell.terrain === 'city') scores[player] += 20;
                    }
                }
            }
            
            // Count units
            const playerUnits = this.units.filter(u => u.player === player);
            scores[player] += playerUnits.length * 10;
            
            // Add money (scaled down)
            scores[player] += Math.floor(this.playerMoney[player] / 100);
        }
        
        // Find player with highest score
        let winner = 1;
        let highestScore = scores[1];
        
        for (let player = 2; player <= this.gameSettings.players; player++) {
            if (scores[player] > highestScore) {
                highestScore = scores[player];
                winner = player;
            }
        }
        
        return winner;
    }

    gameOver(winner, reason) {
        this.gameState = 'gameOver';
        this.logMessage(`Game Over! Player ${winner} wins! ${reason}`);
        
        const modal = document.getElementById('victoryModal');
        const message = document.getElementById('victoryMessage');
        const details = document.getElementById('victoryDetails');
        
        message.textContent = `Player ${winner} Wins!`;
        details.textContent = reason;
        modal.classList.remove('hidden');
    }

    // AI Functions
    executeAITurn() {
        if (this.gameState !== 'playing' || this.currentPlayer !== 2) return;
        
        this.logMessage("Bot is thinking...");
        
        // Add a delay to make AI actions visible
        setTimeout(() => {
            this.performAIActions();
        }, 1000);
    }

    performAIActions() {
        const aiPlayer = this.currentPlayer;
        
        // Get all AI units that haven't acted
        const availableUnits = this.units.filter(unit => 
            unit.player === aiPlayer && !unit.hasActed && !unit.hasMoved
        );

        // Create a queue of AI actions
        this.aiActionQueue = [];
        
        // Prioritize actions: attack enemies, capture buildings, move strategically
        for (const unit of availableUnits) {
            if (this.currentActions <= 0) break;
            
            // Try to attack nearby enemies
            const attackAction = this.aiPlanAttack(unit);
            if (attackAction) {
                this.aiActionQueue.push(attackAction);
                continue;
            }
            
            // Try to capture buildings
            const captureAction = this.aiPlanCapture(unit);
            if (captureAction) {
                this.aiActionQueue.push(captureAction);
                continue;
            }
            
            // Move towards objectives
            const moveAction = this.aiPlanMove(unit);
            if (moveAction) {
                this.aiActionQueue.push(moveAction);
            }
        }

        // Plan building units
        const buildActions = this.aiPlanBuildUnits();
        this.aiActionQueue.push(...buildActions);

        // Execute actions sequentially with delays
        this.executeAIActionQueue();
    }

    executeAIActionQueue() {
        if (!this.aiActionQueue || this.aiActionQueue.length === 0) {
            // End AI turn after all actions are complete
            setTimeout(() => {
                this.endTurn();
            }, 800);
            return;
        }

        const action = this.aiActionQueue.shift();
        this.logMessage(`Bot ${action.description}...`);
        
        // Highlight the unit performing the action
        if (action.unit) {
            this.selectedUnit = action.unit;
            this.renderBoard();
            this.updateUI();
        }

        // Execute the action after a short delay to show selection
        setTimeout(() => {
            action.execute();
            
            // Clear selection and continue with next action
            this.selectedUnit = null;
            this.clearHighlights();
            this.renderBoard();
            this.updateUI();
            
            // Continue with next action after delay
            setTimeout(() => {
                this.executeAIActionQueue();
            }, 1200);
        }, 800);
    }

    aiPlanAttack(unit) {
        // Find enemies within adjacent range only
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const distance = Math.abs(dx) + Math.abs(dy);
                // Only adjacent tiles (distance = 1), not diagonal or same tile
                if (distance === 1) {
                    const targetX = unit.x + dx;
                    const targetY = unit.y + dy;
                    
                    if (this.isValidPosition(targetX, targetY)) {
                        const targetCell = this.gameBoard[targetY][targetX];
                        if (targetCell.unit && targetCell.unit.player !== unit.player) {
                            return {
                                type: 'attack',
                                unit: unit,
                                targetX: targetX,
                                targetY: targetY,
                                description: `attacks enemy ${targetCell.unit.type}`,
                                execute: () => {
                                    this.selectedUnit = unit;
                                    this.attemptAttack(targetX, targetY);
                                    this.selectedUnit = null;
                                }
                            };
                        }
                    }
                }
            }
        }
        return null;
    }

    aiPlanCapture(unit) {
        const unitTypes = this.getUnitTypes();
        if (!unitTypes[unit.type].canCapture) return null;
        
        const currentCell = this.gameBoard[unit.y][unit.x];
        
        // If already on a capturable building, capture it
        if ((currentCell.terrain === 'city' || currentCell.terrain === 'hq') && 
            currentCell.owner !== unit.player) {
            return {
                type: 'capture',
                unit: unit,
                description: `captures ${currentCell.terrain}`,
                execute: () => {
                    this.selectedUnit = unit;
                    this.captureBuilding();
                    this.selectedUnit = null;
                }
            };
        }
        
        // Plan move towards nearest capturable building
        const target = this.findNearestCapturableBuilding(unit);
        if (target) {
            const moveTarget = this.aiCalculateMoveTowards(unit, target.x, target.y);
            if (moveTarget) {
                return {
                    type: 'move-to-capture',
                    unit: unit,
                    targetX: moveTarget.x,
                    targetY: moveTarget.y,
                    description: `moves toward ${target.terrain || 'building'}`,
                    execute: () => {
                        this.selectedUnit = unit;
                        this.moveUnit(unit, moveTarget.x, moveTarget.y);
                        this.selectedUnit = null;
                    }
                };
            }
        }
        
        return null;
    }

    aiPlanMove(unit) {
        // Find a strategic position to move to
        const enemyHQ = this.findEnemyHQ(unit.player);
        
        let targetX, targetY;
        if (enemyHQ) {
            targetX = enemyHQ.x;
            targetY = enemyHQ.y;
        } else {
            // Move towards center
            targetX = Math.floor(this.mapWidth / 2);
            targetY = Math.floor(this.mapHeight / 2);
        }
        
        const moveTarget = this.aiCalculateMoveTowards(unit, targetX, targetY);
        if (moveTarget) {
            return {
                type: 'move',
                unit: unit,
                targetX: moveTarget.x,
                targetY: moveTarget.y,
                description: `moves strategically`,
                execute: () => {
                    this.selectedUnit = unit;
                    this.moveUnit(unit, moveTarget.x, moveTarget.y);
                    this.selectedUnit = null;
                }
            };
        }
        
        return null;
    }

    aiCalculateMoveTowards(unit, targetX, targetY) {
        // Use the same movement logic as human players
        const moveablePositions = this.getMoveablePositions(unit);
        
        // Find the moveable position closest to the target
        let bestMove = null;
        let bestDistance = Infinity;
        
        for (const [x, y] of moveablePositions) {
            const distance = Math.abs(x - targetX) + Math.abs(y - targetY);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestMove = { x, y };
            }
        }
        
        return bestMove;
    }

    aiPlanBuildUnits() {
        const buildActions = [];
        const buildablePositions = [];
        
        // Find all cities and HQs owned by AI
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const cell = this.gameBoard[y][x];
                if ((cell.terrain === 'city' || cell.terrain === 'hq') && 
                    cell.owner === this.currentPlayer && !cell.unit) {
                    buildablePositions.push({ x, y });
                }
            }
        }
        
        // Build units if we have money and actions
        const unitTypes = this.getUnitTypes();
        const affordableUnits = Object.keys(unitTypes).filter(type => 
            this.playerMoney[this.currentPlayer] >= unitTypes[type].cost &&
            this.currentActions >= unitTypes[type].actionCost
        );
        
        for (const pos of buildablePositions) {
            if (this.currentActions <= 0 || affordableUnits.length === 0) break;
            
            // Prioritize infantry for capture, tanks for combat
            let unitType = 'infantry';
            if (this.playerMoney[this.currentPlayer] >= unitTypes.tank.cost && 
                this.currentActions >= unitTypes.tank.actionCost) {
                unitType = Math.random() > 0.6 ? 'tank' : 'infantry';
            }
            
            if (affordableUnits.includes(unitType)) {
                buildActions.push({
                    type: 'build',
                    position: pos,
                    unitType: unitType,
                    description: `builds ${unitType}`,
                    execute: () => {
                        this.selectedBuildingTile = pos;
                        this.buildUnit(unitType);
                        this.selectedBuildingTile = null;
                    }
                });
            }
        }
        
        return buildActions;
    }

    aiTryAttack(unit) {
        const unitTypes = this.getUnitTypes();
        const unitData = unitTypes[unit.type];
        
        // Find enemies within attack range
        for (let dy = -unitData.attackRange; dy <= unitData.attackRange; dy++) {
            for (let dx = -unitData.attackRange; dx <= unitData.attackRange; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const targetX = unit.x + dx;
                const targetY = unit.y + dy;
                
                if (this.isValidPosition(targetX, targetY)) {
                    const targetCell = this.gameBoard[targetY][targetX];
                    if (targetCell.unit && targetCell.unit.player !== unit.player) {
                        // Attack this enemy
                        this.selectedUnit = unit;
                        this.attemptAttack(targetX, targetY);
                        this.selectedUnit = null;
                        return true;
                    }
                }
            }
        }
        return false;
    }

    aiTryCapture(unit) {
        const unitTypes = this.getUnitTypes();
        if (!unitTypes[unit.type].canCapture) return false;
        
        const currentCell = this.gameBoard[unit.y][unit.x];
        
        // If already on a capturable building, capture it
        if ((currentCell.terrain === 'city' || currentCell.terrain === 'hq') && 
            currentCell.owner !== unit.player) {
            this.selectedUnit = unit;
            this.captureBuilding(unit, unit.x, unit.y);
            this.selectedUnit = null;
            return true;
        }
        
        // Move towards nearest capturable building
        const target = this.findNearestCapturableBuilding(unit);
        if (target) {
            this.aiMoveTowards(unit, target.x, target.y);
            return true;
        }
        
        return false;
    }

    aiMoveUnit(unit) {
        // Find a strategic position to move to
        const enemyHQ = this.findEnemyHQ(unit.player);
        
        if (enemyHQ) {
            this.aiMoveTowards(unit, enemyHQ.x, enemyHQ.y);
        } else {
            // Move towards center or random direction
            const centerX = Math.floor(this.mapWidth / 2);
            const centerY = Math.floor(this.mapHeight / 2);
            this.aiMoveTowards(unit, centerX, centerY);
        }
    }

    aiMoveTowards(unit, targetX, targetY) {
        // Use the same movement logic as human players
        const moveablePositions = this.getMoveablePositions(unit);
        
        // Find the moveable position closest to the target
        let bestMove = null;
        let bestDistance = Infinity;
        
        for (const [x, y] of moveablePositions) {
            const distance = Math.abs(x - targetX) + Math.abs(y - targetY);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestMove = { x, y };
            }
        }
        
        if (bestMove) {
            this.selectedUnit = unit;
            this.moveUnit(unit, bestMove.x, bestMove.y);
            this.selectedUnit = null;
        }
    }

    aiBuildUnits() {
        const buildablePositions = [];
        
        // Find all cities and HQs owned by AI
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const cell = this.gameBoard[y][x];
                if ((cell.terrain === 'city' || cell.terrain === 'hq') && 
                    cell.owner === this.currentPlayer && !cell.unit) {
                    buildablePositions.push({ x, y });
                }
            }
        }
        
        // Build units if we have money and actions
        const unitTypes = this.getUnitTypes();
        const affordableUnits = Object.keys(unitTypes).filter(type => 
            this.playerMoney[this.currentPlayer] >= unitTypes[type].cost &&
            this.currentActions >= unitTypes[type].actionCost
        );
        
        for (const pos of buildablePositions) {
            if (this.currentActions <= 0 || affordableUnits.length === 0) break;
            
            // Prioritize infantry for capture, tanks for combat
            let unitType = 'infantry';
            if (this.playerMoney[this.currentPlayer] >= unitTypes.tank.cost && 
                this.currentActions >= unitTypes.tank.actionCost) {
                unitType = Math.random() > 0.6 ? 'tank' : 'infantry';
            }
            
            if (affordableUnits.includes(unitType)) {
                this.selectedBuildingTile = pos;
                this.buildUnit(unitType);
                this.selectedBuildingTile = null;
            }
        }
    }

    findNearestCapturableBuilding(unit) {
        let nearest = null;
        let minDistance = Infinity;
        
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const cell = this.gameBoard[y][x];
                if ((cell.terrain === 'city' || cell.terrain === 'hq') && 
                    cell.owner !== unit.player) {
                    
                    const distance = Math.abs(x - unit.x) + Math.abs(y - unit.y);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearest = { x, y };
                    }
                }
            }
        }
        
        return nearest;
    }

    findEnemyHQ(playerNum) {
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const cell = this.gameBoard[y][x];
                if (cell.terrain === 'hq' && cell.owner !== playerNum) {
                    return { x, y };
                }
            }
        }
        return null;
    }

    newGame() {
        // Reset game state
        this.currentPlayer = 1;
        this.turnNumber = 1;
        this.selectedUnit = null;
        this.selectedBuildingTile = null;
        this.gameBoard = [];
        this.units = [];
        this.gameState = 'playing';
        this.currentActions = this.maxActionsPerTurn;
        this.playerMoney = {
            1: 2000,
            2: 2000
        };
        
        // Clear UI
        document.getElementById('logMessages').innerHTML = '';
        document.getElementById('victoryModal').classList.add('hidden');
        
        // Restart game
        this.initializeGame();
    }

    updateUI() {
        // Update player turn indicator
        const playerTurnElement = document.getElementById('playerTurn');
        const playerColorElement = document.getElementById('playerColor');
        const turnCounterElement = document.getElementById('turnCounter');
        
        // Show "Bot's Turn" instead of "Player 2's Turn" in single player mode
        if (this.gameSettings.gameMode === 'singleplayer' && this.currentPlayer === 2) {
            playerTurnElement.textContent = "Bot's Turn";
        } else {
            playerTurnElement.textContent = `Player ${this.currentPlayer}'s Turn`;
        }
        
        playerColorElement.className = `player${this.currentPlayer}-color`;
        turnCounterElement.textContent = `Turn: ${this.turnNumber} | Actions: ${this.currentActions}/${this.maxActionsPerTurn} | Money: ${this.playerMoney[this.currentPlayer]}`;
        
        this.updateActionButtons();
    }

    updateUnitInfo() {
        const unitIconElement = document.getElementById('unitIcon');
        const unitTypeElement = document.getElementById('unitType');
        const unitHealthElement = document.getElementById('unitHealth');
        const unitMovementElement = document.getElementById('unitMovement');
        const unitAttackElement = document.getElementById('unitAttack');
        const unitCaptureElement = document.getElementById('unitCapture');
        
        if (this.selectedUnit) {
            unitIconElement.textContent = this.selectedUnit.symbol;
            unitIconElement.className = `unit player${this.selectedUnit.player}`;
            unitTypeElement.textContent = this.selectedUnit.type;
            unitHealthElement.textContent = `Health: ${this.selectedUnit.health}/${this.selectedUnit.maxHealth}`;
            unitMovementElement.textContent = `Movement: ${this.selectedUnit.movement}`;
            unitAttackElement.textContent = `Attack: ${this.selectedUnit.attackPower}`;
            
            // Show capture progress if unit is capturing
            if (this.selectedUnit.captureProgress > 0) {
                const remaining = 3 - this.selectedUnit.captureProgress;
                unitCaptureElement.textContent = `Capturing: ${remaining} turns left`;
                unitCaptureElement.style.display = 'block';
            } else {
                unitCaptureElement.style.display = 'none';
            }
        } else {
            unitIconElement.textContent = '';
            unitIconElement.className = '';
            unitTypeElement.textContent = 'Select a unit';
            unitHealthElement.textContent = 'Health: --';
            unitMovementElement.textContent = 'Movement: --';
            unitAttackElement.textContent = 'Attack: --';
            unitCaptureElement.style.display = 'none';
        }
    }

    updateActionButtons() {
        const moveBtn = document.getElementById('moveBtn');
        const attackBtn = document.getElementById('attackBtn');
        const captureBtn = document.getElementById('captureBtn');
        const waitBtn = document.getElementById('waitBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const endTurnBtn = document.getElementById('endTurnBtn');
        
        const hasSelectedUnit = this.selectedUnit && this.selectedUnit.player === this.currentPlayer && !this.selectedUnit.hasMoved;
        const hasSelectedBuilding = this.selectedBuildingTile !== null;
        
        // Mode buttons are enabled if unit is selected
        moveBtn.disabled = !hasSelectedUnit || this.currentActions < 1;
        attackBtn.disabled = !hasSelectedUnit || this.currentActions < 1;
        waitBtn.disabled = !hasSelectedUnit;
        cancelBtn.disabled = !this.selectedUnit && !this.selectedBuildingTile;
        
        // Handle capture button visibility and state
        if (hasSelectedUnit && this.selectedUnit.canCapture) {
            const cell = this.gameBoard[this.selectedUnit.y][this.selectedUnit.x];
            const terrainTypes = this.getTerrainTypes();
            const isOnCapturableBuilding = terrainTypes[cell.terrain].capturable && cell.owner !== this.selectedUnit.player;
            
            if (isOnCapturableBuilding) {
                captureBtn.style.display = 'block';
                captureBtn.disabled = this.currentActions < 1;
            } else {
                captureBtn.style.display = 'none';
            }
        } else {
            captureBtn.style.display = 'none';
        }
        
        endTurnBtn.disabled = this.gameState !== 'playing';
        
        // Update building buttons if they exist
        const buildInfantryBtn = document.getElementById('buildInfantryBtn');
        const buildTankBtn = document.getElementById('buildTankBtn');
        const buildArtilleryBtn = document.getElementById('buildArtilleryBtn');
        
        if (buildInfantryBtn) {
            const infantryCost = this.getUnitTypes().infantry.cost;
            const infantryActionCost = this.getUnitTypes().infantry.actionCost;
            buildInfantryBtn.disabled = !hasSelectedBuilding || this.playerMoney[this.currentPlayer] < infantryCost || this.currentActions < infantryActionCost;
        }
        
        if (buildTankBtn) {
            const tankCost = this.getUnitTypes().tank.cost;
            const tankActionCost = this.getUnitTypes().tank.actionCost;
            buildTankBtn.disabled = !hasSelectedBuilding || this.playerMoney[this.currentPlayer] < tankCost || this.currentActions < tankActionCost;
        }
        
        if (buildArtilleryBtn) {
            const artilleryCost = this.getUnitTypes().artillery.cost;
            const artilleryActionCost = this.getUnitTypes().artillery.actionCost;
            buildArtilleryBtn.disabled = !hasSelectedBuilding || this.playerMoney[this.currentPlayer] < artilleryCost || this.currentActions < artilleryActionCost;
        }
    }

    waitUnit() {
        if (this.selectedUnit && this.currentActions > 0) {
            this.selectedUnit.hasMoved = true;
            this.currentActions -= 1;
            this.logMessage(`${this.selectedUnit.type} waits. Actions remaining: ${this.currentActions}`);
            this.selectedUnit = null;
            this.clearHighlights();
            this.renderBoard();
            this.updateUI();
        }
    }

    captureBuilding() {
        if (!this.selectedUnit) return;
        
        const unit = this.selectedUnit;
        
        // Check if unit can capture and is on a capturable building
        if (!unit.canCapture) {
            this.logMessage("This unit cannot capture buildings!");
            return;
        }
        
        if (this.currentActions < 1) {
            this.logMessage("Not enough actions remaining!");
            return;
        }
        
        const cell = this.gameBoard[unit.y][unit.x];
        const terrainTypes = this.getTerrainTypes();
        
        if (!terrainTypes[cell.terrain].capturable) {
            this.logMessage("This terrain cannot be captured!");
            return;
        }
        
        if (cell.owner === unit.player) {
            this.logMessage("You already control this building!");
            return;
        }
        
        // Check if unit is continuing capture of same building
        const currentPos = {x: unit.x, y: unit.y};
        const isSameBuilding = unit.capturingBuildingPos && 
                              unit.capturingBuildingPos.x === currentPos.x && 
                              unit.capturingBuildingPos.y === currentPos.y;
        
        if (!isSameBuilding) {
            // Starting capture of new building - reset progress
            unit.captureProgress = 0;
            unit.capturingBuildingPos = currentPos;
        }
        
        // Increment capture progress
        unit.captureProgress += 1;
        this.currentActions -= 1;
        unit.hasMoved = true;
        
        if (unit.captureProgress >= 3) {
            // Building captured!
            cell.owner = unit.player;
            unit.captureProgress = 0;
            unit.capturingBuildingPos = null;
            this.logMessage(`${unit.type} captured ${cell.terrain}! Actions remaining: ${this.currentActions}`);
            this.checkVictoryConditions();
        } else {
            // Still capturing
            const remainingTurns = 3 - unit.captureProgress;
            this.logMessage(`${unit.type} capturing ${cell.terrain}... ${remainingTurns} turns remaining. Actions: ${this.currentActions}`);
        }
        
        this.selectedUnit = null;
        this.clearHighlights();
        this.renderBoard();
        this.updateUI();
    }

    cancelSelection() {
        this.selectedUnit = null;
        this.selectedBuildingTile = null;
        this.currentActionMode = null;
        this.clearHighlights();
        this.renderBoard();
        this.updateUI();
        
        // Hide mode selection panel
        document.getElementById('modeSelection').style.display = 'none';
        this.updateModeIndicators();
        
        this.logMessage("Selection cancelled.");
    }

    logMessage(message) {
        const logMessages = document.getElementById('logMessages');
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        logMessages.appendChild(messageElement);
        logMessages.scrollTop = logMessages.scrollHeight;
    }

    setupEventListeners() {
        // Mode selection buttons
        document.getElementById('moveBtn').addEventListener('click', () => this.setActionMode('move'));
        document.getElementById('attackBtn').addEventListener('click', () => this.setActionMode('attack'));
        
        // Action buttons
        document.getElementById('waitBtn').addEventListener('click', () => this.waitUnit());
        document.getElementById('cancelBtn').addEventListener('click', () => this.cancelSelection());
        document.getElementById('endTurnBtn').addEventListener('click', () => this.endTurn());
        document.getElementById('captureBtn').addEventListener('click', () => this.captureBuilding());
        
        // Building buttons
        const buildInfantryBtn = document.getElementById('buildInfantryBtn');
        const buildTankBtn = document.getElementById('buildTankBtn');
        const buildArtilleryBtn = document.getElementById('buildArtilleryBtn');
        
        if (buildInfantryBtn) {
            buildInfantryBtn.addEventListener('click', () => this.buildUnit('infantry'));
        }
        if (buildTankBtn) {
            buildTankBtn.addEventListener('click', () => this.buildUnit('tank'));
        }
        if (buildArtilleryBtn) {
            buildArtilleryBtn.addEventListener('click', () => this.buildUnit('artillery'));
        }
        
        // Game controls
        document.getElementById('newGameButton').addEventListener('click', () => this.newGame());
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
        
        // Help modal
        document.getElementById('helpButton').addEventListener('click', () => {
            document.getElementById('helpModal').classList.remove('hidden');
        });
        
        document.getElementById('closeHelpBtn').addEventListener('click', () => {
            document.getElementById('helpModal').classList.add('hidden');
        });
        
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.add('hidden');
            }
        });
    }
}

// Menu System and Navigation
class MenuSystem {
    constructor() {
        this.currentPage = 'homePage';
        this.game = null;
        this.setupMenuEventListeners();
        this.showPage('homePage');
    }

    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show target page
        document.getElementById(pageId).classList.add('active');
        this.currentPage = pageId;
    }

    setupMenuEventListeners() {
        // Home page buttons
        document.getElementById('quickMatchBtn').addEventListener('click', () => {
            this.showPage('quickMatchPage');
        });

        document.getElementById('customRulesBtn').addEventListener('click', () => {
            this.showPage('customRulesPage');
        });

        document.getElementById('helpBtn').addEventListener('click', () => {
            document.getElementById('helpModal').classList.remove('hidden');
        });

        // Back buttons
        document.getElementById('backFromQuickBtn').addEventListener('click', () => {
            this.showPage('homePage');
        });

        document.getElementById('backFromCustomBtn').addEventListener('click', () => {
            this.showPage('homePage');
        });

        // Start game buttons
        document.getElementById('startQuickGameBtn').addEventListener('click', () => {
            this.startQuickMatch();
        });

        document.getElementById('startCustomGameBtn').addEventListener('click', () => {
            this.startCustomMatch();
        });

        // Back to menu from game
        const backToMenuBtn = document.getElementById('backToMenuBtn');
        if (backToMenuBtn) {
            backToMenuBtn.addEventListener('click', () => {
                this.showPage('homePage');
            });
        }

        const backToMenuFromVictoryBtn = document.getElementById('backToMenuFromVictoryBtn');
        if (backToMenuFromVictoryBtn) {
            backToMenuFromVictoryBtn.addEventListener('click', () => {
                this.showPage('homePage');
                document.getElementById('victoryModal').classList.add('hidden');
            });
        }

        // Turn limit toggle
        document.getElementById('turnLimitEnabled').addEventListener('change', (e) => {
            const turnLimitGroup = document.getElementById('turnLimitGroup');
            turnLimitGroup.style.display = e.target.checked ? 'block' : 'none';
        });

        // Quick match game mode toggle
        document.getElementById('quickGameMode').addEventListener('change', (e) => {
            const playerCountGroup = document.querySelector('#quickMatchPage .setting-group:nth-child(2)');
            if (e.target.value === 'singleplayer') {
                playerCountGroup.style.display = 'none';
            } else {
                playerCountGroup.style.display = 'block';
            }
        });

        // Help modal close
        document.getElementById('closeHelpBtn').addEventListener('click', () => {
            document.getElementById('helpModal').classList.add('hidden');
        });

        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.add('hidden');
            }
        });
    }

    startQuickMatch() {
        const quickGameMode = document.getElementById('quickGameMode').value;
        const playerCount = parseInt(document.getElementById('playerCount').value);
        
        const gameSettings = {
            gameMode: quickGameMode,
            players: quickGameMode === 'singleplayer' ? 2 : playerCount,
            startingMoney: 2000,
            incomePerTurn: 500,
            actionsPerTurn: 5,
            mapPreset: 'default',
            mapSize: '12x8',
            turnLimit: false,
            maxTurns: null
        };

        this.startGame(gameSettings);
    }

    startCustomMatch() {
        const gameMode = document.getElementById('gameMode').value;
        const playerCount = parseInt(document.getElementById('customPlayerCount').value);
        const startingMoney = parseInt(document.getElementById('startingMoney').value);
        const incomePerTurn = parseInt(document.getElementById('incomePerTurn').value);
        const actionsPerTurn = parseInt(document.getElementById('actionsPerTurn').value);
        const mapPreset = document.getElementById('mapPreset').value;
        const mapSize = document.getElementById('mapSize').value;
        const turnLimitEnabled = document.getElementById('turnLimitEnabled').checked;
        const maxTurns = turnLimitEnabled ? parseInt(document.getElementById('maxTurns').value) : null;

        const gameSettings = {
            gameMode: gameMode,
            players: gameMode === 'singleplayer' ? 2 : playerCount,
            startingMoney: startingMoney,
            incomePerTurn: incomePerTurn,
            actionsPerTurn: actionsPerTurn,
            mapPreset: mapPreset,
            mapSize: mapSize,
            turnLimit: turnLimitEnabled,
            maxTurns: maxTurns
        };

        this.startGame(gameSettings);
    }

    startGame(gameSettings) {
        this.showPage('gamePage');
        
        // Clear existing game log
        const logMessages = document.getElementById('logMessages');
        if (logMessages) {
            logMessages.innerHTML = '';
        }

        // Create new game with settings
        this.game = new StrategyGame(gameSettings);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.menuSystem = new MenuSystem();
});