// Advanced Wars Strategy Game - JavaScript Implementation

class StrategyGame {
    constructor(gameSettings = null) {
        // Game settings (can be customized)
        this.gameSettings = gameSettings || {
            players: 2,
            gameMode: 'multiplayer',
            botDifficulties: { 2: 'medium' }, // difficulty per player number
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
                actionCost: 1,
                transportSize: 1,
                terrain: 'land'
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
                actionCost: 1,
                transportSize: 2,
                terrain: 'land'
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
                actionCost: 1,
                transportSize: 2,
                terrain: 'land'
            },
            transport: {
                name: 'Transport Ship',
                symbol: 'TS',
                health: 100,
                maxHealth: 100,
                movement: 5,
                attackRange: 0,
                attackPower: 0,
                defense: 40,
                cost: 3000,
                canCapture: false,
                actionCost: 2,
                transportCapacity: 4,
                transportedUnits: [],
                terrain: 'water'
            },
            battleship: {
                name: 'Battleship',
                symbol: 'BS',
                health: 100,
                maxHealth: 100,
                movement: 3,
                attackRange: 4,
                attackPower: 95,
                defense: 80,
                cost: 4500,
                canCapture: false,
                actionCost: 3,
                terrain: 'water'
            },
            submarine: {
                name: 'Submarine',
                symbol: 'SUB',
                health: 100,
                maxHealth: 100,
                movement: 4,
                attackRange: 1,
                attackPower: 75,
                defense: 60,
                cost: 3500,
                canCapture: false,
                actionCost: 2,
                canSubmerge: true,
                isSubmerged: false,
                terrain: 'water'
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
            },
            seaport: {
                name: 'Sea Port',
                defenseBonus: 1,
                movementCost: 1,
                className: 'terrain-seaport',
                capturable: true
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
            case 'naval':
                this.generateNavalMap();
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

    generateNavalMap() {
        // Make everything water first (90% water map)
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                this.gameBoard[y][x].terrain = 'water';
            }
        }

        // Create center island (5x5)
        const centerX = Math.floor(this.mapWidth / 2);
        const centerY = Math.floor(this.mapHeight / 2);
        
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                if (this.isValidPosition(x, y)) {
                    this.gameBoard[y][x].terrain = 'plains';
                }
            }
        }

        // Add cities on center island
        if (this.isValidPosition(centerX, centerY)) {
            this.gameBoard[centerY][centerX].terrain = 'city';
        }
        if (this.isValidPosition(centerX - 1, centerY - 1)) {
            this.gameBoard[centerY - 1][centerX - 1].terrain = 'city';
        }
        if (this.isValidPosition(centerX + 1, centerY + 1)) {
            this.gameBoard[centerY + 1][centerX + 1].terrain = 'city';
        }

        // Create player HQ islands (3x3 each)
        const playerPositions = this.getPlayerHQPositions();
        
        playerPositions.forEach((pos, index) => {
            const player = index + 1;
            if (player <= this.gameSettings.players) {
                this.createPlayerIsland(pos.x, pos.y, player);
            }
        });

        // Add sea ports around the map
        this.addSeaPorts();
    }

    getPlayerHQPositions() {
        // Return corner positions for HQ islands
        return [
            { x: 1, y: 1 },                                    // Player 1: top-left
            { x: this.mapWidth - 2, y: this.mapHeight - 2 },   // Player 2: bottom-right
            { x: this.mapWidth - 2, y: 1 },                    // Player 3: top-right
            { x: 1, y: this.mapHeight - 2 }                    // Player 4: bottom-left
        ];
    }

    createPlayerIsland(centerX, centerY, player) {
        // Create 3x3 island
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                if (this.isValidPosition(x, y)) {
                    this.gameBoard[y][x].terrain = 'plains';
                }
            }
        }

        // Place HQ in center
        if (this.isValidPosition(centerX, centerY)) {
            this.gameBoard[centerY][centerX].terrain = 'hq';
            this.gameBoard[centerY][centerX].owner = player;
        }

        // Add a city on the island
        const cityX = centerX + (player % 2 === 1 ? -1 : 1);
        const cityY = centerY + (player <= 2 ? -1 : 1);
        if (this.isValidPosition(cityX, cityY)) {
            this.gameBoard[cityY][cityX].terrain = 'city';
        }
    }

    addSeaPorts() {
        // Add sea ports at strategic water locations
        const seaPortPositions = [
            { x: Math.floor(this.mapWidth / 4), y: Math.floor(this.mapHeight / 4) },
            { x: Math.floor(3 * this.mapWidth / 4), y: Math.floor(this.mapHeight / 4) },
            { x: Math.floor(this.mapWidth / 4), y: Math.floor(3 * this.mapHeight / 4) },
            { x: Math.floor(3 * this.mapWidth / 4), y: Math.floor(3 * this.mapHeight / 4) },
            { x: Math.floor(this.mapWidth / 2), y: 2 },
            { x: Math.floor(this.mapWidth / 2), y: this.mapHeight - 3 }
        ];

        seaPortPositions.forEach(pos => {
            if (this.isValidPosition(pos.x, pos.y) && this.gameBoard[pos.y][pos.x].terrain === 'water') {
                this.gameBoard[pos.y][pos.x].terrain = 'seaport';
            }
        });
    }

    placeHeadquarters() {
        // Skip if naval map (HQs are placed during island creation)
        if (this.gameSettings.mapPreset === 'naval') {
            return;
        }
        
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
        
        if (this.gameSettings.mapPreset === 'naval') {
            // Naval map initial units
            const playerPositions = this.getPlayerHQPositions();
            
            for (let i = 0; i < players; i++) {
                const player = i + 1;
                const pos = playerPositions[i];
                
                // Place infantry on HQ island
                this.addUnit(pos.x - 1, pos.y, 'infantry', player);
                this.addUnit(pos.x + 1, pos.y, 'infantry', player);
                
                // Place initial transport ship in nearby water
                const waterPos = this.findNearestWater(pos.x, pos.y);
                if (waterPos) {
                    this.addUnit(waterPos.x, waterPos.y, 'transport', player);
                }
            }
            return;
        }
        
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

    findNearestWater(x, y) {
        // Find nearest water tile for ship placement
        for (let radius = 1; radius <= 5; radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (Math.abs(dx) + Math.abs(dy) === radius) {
                        const newX = x + dx;
                        const newY = y + dy;
                        if (this.isValidPosition(newX, newY) && 
                            this.gameBoard[newY][newX].terrain === 'water' &&
                            !this.gameBoard[newY][newX].unit) {
                            return { x: newX, y: newY };
                        }
                    }
                }
            }
        }
        return null;
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
            capturingBuildingPos: null, // Position of building being captured {x, y}
            terrain: unitTemplate.terrain || 'land',
            transportSize: unitTemplate.transportSize || 1,
            // Ship-specific properties
            transportCapacity: unitTemplate.transportCapacity || 0,
            transportedUnits: unitTemplate.transportedUnits ? [...unitTemplate.transportedUnits] : [],
            canSubmerge: unitTemplate.canSubmerge || false,
            isSubmerged: unitTemplate.isSubmerged || false
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
        
        // Store existing highlight classes before clearing
        const existingHighlights = new Map();
        const existingTiles = boardElement.querySelectorAll('.tile');
        existingTiles.forEach(tile => {
            const x = tile.dataset.x;
            const y = tile.dataset.y;
            const key = `${x},${y}`;
            const hasMovable = tile.classList.contains('movable');
            const hasAttackable = tile.classList.contains('attackable');
            const hasSelected = tile.classList.contains('selected');
            if (hasMovable || hasAttackable || hasSelected) {
                existingHighlights.set(key, { hasMovable, hasAttackable, hasSelected });
            }
        });
        
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
                    
                    // Add special styling for submarines
                    if (cell.unit.type === 'submarine') {
                        if (cell.unit.isSubmerged && cell.unit.player !== this.currentPlayer) {
                            // Hide enemy submerged submarines
                            unitElement.style.display = 'none';
                        } else if (cell.unit.isSubmerged) {
                            // Show own submerged submarines with special styling
                            unitElement.classList.add('submerged');
                        }
                    }
                    
                    // Add cargo indicator for transport ships
                    if (cell.unit.type === 'transport' && cell.unit.transportedUnits.length > 0) {
                        unitElement.classList.add('has-cargo');
                    }
                    
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
                
                // Restore highlight classes if they existed
                const key = `${x},${y}`;
                const highlights = existingHighlights.get(key);
                if (highlights) {
                    if (highlights.hasMovable) tile.classList.add('movable');
                    if (highlights.hasAttackable) tile.classList.add('attackable');
                    if (highlights.hasSelected) tile.classList.add('selected');
                }
                
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
        
        // Check for submarine surprise attack
        if (cell.unit && cell.unit.type === 'submarine' && cell.unit.isSubmerged && 
            cell.unit.player !== this.currentPlayer) {
            // Enemy moved onto submerged submarine - surprise attack!
            this.triggerSubmarineSurpriseAttack(cell.unit, x, y);
            return;
        }
        
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
            if ((cell.terrain === 'city' || cell.terrain === 'hq' || cell.terrain === 'seaport') && 
                cell.owner === this.currentPlayer) {
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

    triggerSubmarineSurpriseAttack(submarine, x, y) {
        // Surface the submarine
        submarine.isSubmerged = false;
        
        // Check if there are enemy units on the same tile (shouldn't happen in normal movement)
        // This handles the case where an enemy ship moves onto the submarine's tile
        const enemyUnits = this.units.filter(unit => 
            unit.x === x && unit.y === y && unit.player !== submarine.player
        );
        
        if (enemyUnits.length > 0) {
            const target = enemyUnits[0];
            this.logMessage(`Submarine surfaces and surprise attacks ${target.type}!`);
            this.performAttack(submarine, target);
        }
        
        this.renderBoard();
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
        
        // Show cascading context menu
        this.showUnitContextMenu(unit);
        
        this.logMessage(`Selected ${unit.type} at (${unit.x}, ${unit.y}) - Choose an action`);
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
            if (tile) {
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
                        
                        // Check if unit can move through this terrain based on unit type
                        let canMoveThrough = false;
                        if (unit.terrain === 'water') {
                            // Ships can move on water and sea ports
                            if (cell.terrain === 'water' || cell.terrain === 'seaport') {
                                canMoveThrough = true;
                            }
                        } else if (unit.terrain === 'land') {
                            // Land units movement rules
                            if (movementCost < 999) {
                                canMoveThrough = true;
                            } else if (cell.terrain === 'water' && unit.type === 'infantry') {
                                // Infantry can move through water
                                canMoveThrough = true;
                            }
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
                            // Use actual movement cost
                            let actualMovementCost = movementCost;
                            if (cell.terrain === 'water' && unit.type === 'infantry') {
                                actualMovementCost = 2;
                            } else if (unit.terrain === 'water') {
                                actualMovementCost = 1; // Ships move normally on water
                            }
                            
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
        // Safety check: don't move onto a tile occupied by a friendly unit
        const targetCell = this.gameBoard[newY][newX];
        if (targetCell.unit && targetCell.unit.player === unit.player && targetCell.unit !== unit) {
            this.logMessage(`Cannot move ${unit.type}: tile occupied by friendly ${targetCell.unit.type}!`);
            return;
        }
        
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
        this.hideUnitContextMenu();
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
        this.hideUnitContextMenu();
        this.renderBoard();
        this.updateUI();
        this.checkVictoryConditions();
    }

    // New function for selecting building tiles
    selectBuildingTile(x, y) {
        this.selectedBuildingTile = {x, y};
        this.selectedUnit = null;
        this.clearHighlights();
        this.hideUnitContextMenu();
        
        const tile = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        if (tile) {
            tile.classList.add('selected');
        }
        
        // Show building context menu
        this.showBuildingContextMenu(x, y);
        
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
            this.hideBuildingContextMenu();
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
        // If it's a transport with cargo, destroy all transported units
        if (unit.type === 'transport' && unit.transportedUnits && unit.transportedUnits.length > 0) {
            const cargoCount = unit.transportedUnits.length;
            this.logMessage(`${cargoCount} units destroyed with the transport!`);
            unit.transportedUnits = []; // Clear cargo
        }

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
        this.hideAllContextMenus();
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
        
        // Difficulty-based thinking time
        const thinkingTime = this.getAIThinkingTime();
        
        // Add a delay to make AI actions visible
        setTimeout(() => {
            this.performAIActions();
        }, thinkingTime);
    }
    
    getAIThinkingTime(player = this.currentPlayer) {
        const difficulty = this.gameSettings.botDifficulties[player] || 'medium';
        switch (difficulty) {
            case 'easy': return 500;   // Quick decisions
            case 'medium': return 1000; // Normal thinking
            case 'hard': return 1500;   // Longer strategic thinking
            default: return 1000;
        }
    }
    
    shouldAIMakeOptimalDecision(player = this.currentPlayer) {
        const difficulty = this.gameSettings.botDifficulties[player] || 'medium';
        switch (difficulty) {
            case 'easy': return Math.random() > 0.4;  // 60% optimal decisions
            case 'medium': return Math.random() > 0.2; // 80% optimal decisions
            case 'hard': return Math.random() > 0.05;  // 95% optimal decisions
            default: return Math.random() > 0.2;
        }
    }
    
    getAIAggressiveness(player = this.currentPlayer) {
        const difficulty = this.gameSettings.botDifficulties[player] || 'medium';
        switch (difficulty) {
            case 'easy': return 0.3;   // Less aggressive
            case 'medium': return 0.6; // Moderately aggressive
            case 'hard': return 0.9;   // Very aggressive
            default: return 0.6;
        }
    }
    
    getAIPreferredUnitType(affordableUnits, unitTypes, player = this.currentPlayer) {
        const aggressiveness = this.getAIAggressiveness(player);
        const currentMoney = this.playerMoney[player];
        const difficulty = this.gameSettings.botDifficulties[player] || 'medium';
        
        // Easy AI prefers cheaper units, Hard AI optimizes unit composition
        switch (difficulty) {
            case 'easy':
                // Mostly build infantry, occasionally other units
                if (Math.random() > 0.7 && affordableUnits.includes('tank')) {
                    return 'tank';
                }
                return affordableUnits.includes('infantry') ? 'infantry' : affordableUnits[0];
                
            case 'medium':
                // Balanced approach - mix of infantry and stronger units
                if (currentMoney >= unitTypes.tank?.cost && Math.random() > 0.4) {
                    return affordableUnits.includes('tank') ? 'tank' : 'infantry';
                }
                return affordableUnits.includes('infantry') ? 'infantry' : affordableUnits[0];
                
            case 'hard':
                // Strategic unit selection - prioritize based on game state
                const playerUnits = this.units.filter(u => u.player === this.currentPlayer);
                const enemyUnits = this.units.filter(u => u.player !== this.currentPlayer);
                
                // If enemy has many units, prioritize combat units
                if (enemyUnits.length > playerUnits.length && affordableUnits.includes('tank')) {
                    return 'tank';
                }
                
                // If we have few capture units, build infantry
                const infantryCount = playerUnits.filter(u => u.type === 'infantry').length;
                if (infantryCount < 2 && affordableUnits.includes('infantry')) {
                    return 'infantry';
                }
                
                // Otherwise build strongest affordable unit
                const preferredOrder = ['tank', 'artillery', 'infantry', 'transport'];
                for (const type of preferredOrder) {
                    if (affordableUnits.includes(type)) {
                        return type;
                    }
                }
                break;
                
            default:
                return affordableUnits.includes('infantry') ? 'infantry' : affordableUnits[0];
        }
        
        return affordableUnits[0] || 'infantry';
    }

    performAIActions() {
        const aiPlayer = this.currentPlayer;
        
        // Get all AI units that haven't acted
        const availableUnits = this.units.filter(unit => 
            unit.player === aiPlayer && !unit.hasActed && !unit.hasMoved
        );

        // Create a queue of AI actions and track planned destinations
        this.aiActionQueue = [];
        this.aiPlannedDestinations = new Set();
        
        // Prioritize actions based on difficulty: attack enemies, capture buildings, move strategically
        for (const unit of availableUnits) {
            if (this.currentActions <= 0) break;
            
            // Apply difficulty-based decision making
            if (!this.shouldAIMakeOptimalDecision(this.currentPlayer)) {
                // On easier difficulties, occasionally skip optimal actions
                if (Math.random() < 0.3) continue;
            }
            
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
            // Check if another unit has already planned to move to this destination
            const destinationKey = `${moveTarget.x},${moveTarget.y}`;
            if (this.aiPlannedDestinations && this.aiPlannedDestinations.has(destinationKey)) {
                return null; // Skip this move to avoid collision
            }
            
            // Record this destination as planned
            if (this.aiPlannedDestinations) {
                this.aiPlannedDestinations.add(destinationKey);
            }
            
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
            // Double-check that the target tile is not occupied by a friendly unit
            const targetCell = this.gameBoard[y][x];
            if (targetCell.unit && targetCell.unit.player === unit.player) {
                continue; // Skip tiles occupied by friendly units
            }
            
            // Check if another unit has already planned to move to this destination
            const destinationKey = `${x},${y}`;
            if (this.aiPlannedDestinations && this.aiPlannedDestinations.has(destinationKey)) {
                continue; // Skip tiles already targeted by other units
            }
            
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
            
            // Choose unit type based on difficulty and strategy
            let unitType = this.getAIPreferredUnitType(affordableUnits, unitTypes, this.currentPlayer);
            
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
            // Double-check that the target tile is not occupied by a friendly unit
            const targetCell = this.gameBoard[y][x];
            if (targetCell.unit && targetCell.unit.player === unit.player) {
                continue; // Skip tiles occupied by friendly units
            }
            
            const distance = Math.abs(x - targetX) + Math.abs(y - targetY);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestMove = { x, y };
            }
        }
        
        if (bestMove) {
            // Final safety check before moving
            const targetCell = this.gameBoard[bestMove.y][bestMove.x];
            if (!targetCell.unit || targetCell.unit.player !== unit.player) {
                this.selectedUnit = unit;
                this.moveUnit(unit, bestMove.x, bestMove.y);
                this.selectedUnit = null;
            }
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
            
            // Choose unit type based on difficulty and strategy
            let unitType = this.getAIPreferredUnitType(affordableUnits, unitTypes, this.currentPlayer);
            
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
        
        // Handle special action buttons based on unit type
        this.updateSpecialActionButtons(hasSelectedUnit);
        
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
        
        // Update building buttons
        this.updateBuildingButtons(hasSelectedBuilding);
    }

    updateSpecialActionButtons(hasSelectedUnit) {
        // Handle submarine submerge/surface button
        const submergeBtn = document.getElementById('submergeBtn');
        if (submergeBtn) {
            if (hasSelectedUnit && this.selectedUnit.canSubmerge) {
                submergeBtn.style.display = 'block';
                submergeBtn.disabled = this.currentActions < 1;
                submergeBtn.textContent = this.selectedUnit.isSubmerged ? 'Surface' : '🌊 Submerge';
            } else {
                submergeBtn.style.display = 'none';
            }
        }

        // Handle transport load/unload buttons
        const loadBtn = document.getElementById('loadBtn');
        const unloadBtn = document.getElementById('unloadBtn');
        
        if (loadBtn && unloadBtn) {
            if (hasSelectedUnit && this.selectedUnit.type === 'transport') {
                const nearbyLandUnits = this.getNearbyLandUnits(this.selectedUnit);
                const hasCargoSpace = this.selectedUnit.transportedUnits.length < this.selectedUnit.transportCapacity;
                const hasCargo = this.selectedUnit.transportedUnits.length > 0;
                const nearLand = this.isNearLand(this.selectedUnit.x, this.selectedUnit.y);

                loadBtn.style.display = (nearbyLandUnits.length > 0 && hasCargoSpace) ? 'block' : 'none';
                loadBtn.disabled = this.currentActions < 1;

                unloadBtn.style.display = (hasCargo && nearLand) ? 'block' : 'none';
                unloadBtn.disabled = this.currentActions < 1;
            } else {
                loadBtn.style.display = 'none';
                unloadBtn.style.display = 'none';
            }
        }
    }

    updateBuildingButtons(hasSelectedBuilding) {
        // Update ship building buttons for sea ports
        const buildTransportBtn = document.getElementById('buildTransportBtn');
        const buildBattleshipBtn = document.getElementById('buildBattleshipBtn');
        const buildSubmarineBtn = document.getElementById('buildSubmarineBtn');
        
        const isSeaPort = hasSelectedBuilding && 
                         this.gameBoard[this.selectedBuildingTile.y][this.selectedBuildingTile.x].terrain === 'seaport';
        
        // Show/hide appropriate building buttons based on building type
        if (hasSelectedBuilding) {
            if (isSeaPort) {
                // Show ship building buttons for sea ports
                if (buildTransportBtn) {
                    buildTransportBtn.style.display = 'block';
                    const cost = this.getUnitTypes().transport.cost;
                    const actionCost = this.getUnitTypes().transport.actionCost;
                    buildTransportBtn.disabled = this.playerMoney[this.currentPlayer] < cost || this.currentActions < actionCost;
                }
                if (buildBattleshipBtn) {
                    buildBattleshipBtn.style.display = 'block';
                    const cost = this.getUnitTypes().battleship.cost;
                    const actionCost = this.getUnitTypes().battleship.actionCost;
                    buildBattleshipBtn.disabled = this.playerMoney[this.currentPlayer] < cost || this.currentActions < actionCost;
                }
                if (buildSubmarineBtn) {
                    buildSubmarineBtn.style.display = 'block';
                    const cost = this.getUnitTypes().submarine.cost;
                    const actionCost = this.getUnitTypes().submarine.actionCost;
                    buildSubmarineBtn.disabled = this.playerMoney[this.currentPlayer] < cost || this.currentActions < actionCost;
                }
                
                // Hide land unit buttons
                const buildInfantryBtn = document.getElementById('buildInfantryBtn');
                const buildTankBtn = document.getElementById('buildTankBtn');
                const buildArtilleryBtn = document.getElementById('buildArtilleryBtn');
                if (buildInfantryBtn) buildInfantryBtn.style.display = 'none';
                if (buildTankBtn) buildTankBtn.style.display = 'none';
                if (buildArtilleryBtn) buildArtilleryBtn.style.display = 'none';
            } else {
                // Hide ship building buttons
                if (buildTransportBtn) buildTransportBtn.style.display = 'none';
                if (buildBattleshipBtn) buildBattleshipBtn.style.display = 'none';
                if (buildSubmarineBtn) buildSubmarineBtn.style.display = 'none';
            }
        } else {
            // Hide all ship building buttons when no building selected
            if (buildTransportBtn) buildTransportBtn.style.display = 'none';
            if (buildBattleshipBtn) buildBattleshipBtn.style.display = 'none';
            if (buildSubmarineBtn) buildSubmarineBtn.style.display = 'none';
        }
    }

    // Submarine submerge/surface functionality
    toggleSubmerge() {
        if (!this.selectedUnit || !this.selectedUnit.canSubmerge || this.currentActions < 1) {
            return;
        }

        this.selectedUnit.isSubmerged = !this.selectedUnit.isSubmerged;
        this.currentActions -= 1;
        this.selectedUnit.hasMoved = true;

        const action = this.selectedUnit.isSubmerged ? 'submerged' : 'surfaced';
        this.logMessage(`Submarine ${action}! Actions remaining: ${this.currentActions}`);

        this.selectedUnit = null;
        this.clearHighlights();
        this.renderBoard();
        this.updateUI();
    }

    // Transport ship functionality
    getNearbyLandUnits(transport) {
        const nearbyUnits = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        for (const [dx, dy] of directions) {
            const x = transport.x + dx;
            const y = transport.y + dy;

            if (this.isValidPosition(x, y)) {
                const cell = this.gameBoard[y][x];
                if (cell.unit && cell.unit.player === transport.player && 
                    cell.unit.terrain === 'land') {
                    nearbyUnits.push(cell.unit);
                }
            }
        }

        return nearbyUnits;
    }

    isNearLand(x, y) {
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;

            if (this.isValidPosition(newX, newY)) {
                const terrain = this.gameBoard[newY][newX].terrain;
                if (terrain !== 'water' && terrain !== 'seaport') {
                    return true;
                }
            }
        }

        return false;
    }

    loadUnit() {
        if (!this.selectedUnit || this.selectedUnit.type !== 'transport' || this.currentActions < 1) {
            return;
        }

        const transport = this.selectedUnit;
        const nearbyUnits = this.getNearbyLandUnits(transport);

        if (nearbyUnits.length === 0) {
            this.logMessage("No nearby land units to load!");
            return;
        }

        // For now, load the first available unit that fits
        for (const unit of nearbyUnits) {
            const unitTypes = this.getUnitTypes();
            const transportSize = unitTypes[unit.type].transportSize || 1;
            const currentLoad = transport.transportedUnits.reduce((total, u) => {
                const uTypes = this.getUnitTypes();
                return total + (uTypes[u.type].transportSize || 1);
            }, 0);

            if (currentLoad + transportSize <= transport.transportCapacity) {
                // Load the unit
                transport.transportedUnits.push(unit);
                this.units = this.units.filter(u => u.id !== unit.id);
                this.gameBoard[unit.y][unit.x].unit = null;

                this.currentActions -= 1;
                this.logMessage(`${unit.type} loaded onto transport! Actions remaining: ${this.currentActions}`);

                this.renderBoard();
                this.updateUI();
                return;
            }
        }

        this.logMessage("Transport is full or nearby units are too large!");
    }

    unloadUnit() {
        if (!this.selectedUnit || this.selectedUnit.type !== 'transport' || 
            this.selectedUnit.transportedUnits.length === 0 || this.currentActions < 1) {
            return;
        }

        const transport = this.selectedUnit;
        
        if (!this.isNearLand(transport.x, transport.y)) {
            this.logMessage("Must be adjacent to land to unload units!");
            return;
        }

        // Find an empty adjacent land tile
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        let unloadPosition = null;

        for (const [dx, dy] of directions) {
            const x = transport.x + dx;
            const y = transport.y + dy;

            if (this.isValidPosition(x, y)) {
                const cell = this.gameBoard[y][x];
                if (!cell.unit && cell.terrain !== 'water' && cell.terrain !== 'seaport') {
                    unloadPosition = { x, y };
                    break;
                }
            }
        }

        if (!unloadPosition) {
            this.logMessage("No empty adjacent land tiles to unload!");
            return;
        }

        // Unload the first unit
        const unitToUnload = transport.transportedUnits.shift();
        unitToUnload.x = unloadPosition.x;
        unitToUnload.y = unloadPosition.y;
        unitToUnload.hasMoved = true; // Unit can't move again this turn

        this.units.push(unitToUnload);
        this.gameBoard[unloadPosition.y][unloadPosition.x].unit = unitToUnload;

        this.currentActions -= 1;
        this.logMessage(`${unitToUnload.type} unloaded from transport! Actions remaining: ${this.currentActions}`);

        this.renderBoard();
        this.updateUI();
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
        
        // Hide mode selection panel and context menus
        document.getElementById('modeSelection').style.display = 'none';
        this.hideAllContextMenus();
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
        
        // Special action buttons
        document.getElementById('submergeBtn').addEventListener('click', () => this.toggleSubmerge());
        document.getElementById('loadBtn').addEventListener('click', () => this.loadUnit());
        document.getElementById('unloadBtn').addEventListener('click', () => this.unloadUnit());
        
        // Context menu event listeners
        document.getElementById('closeContextMenu').addEventListener('click', () => this.hideUnitContextMenu());
        document.getElementById('contextMoveBtn').addEventListener('click', () => {
            this.setActionMode('move');
            this.updateContextMenuButtons(this.selectedUnit);
            this.logMessage("Move mode selected - click on highlighted tiles to move");
            this.hideUnitContextMenu();
        });
        document.getElementById('contextAttackBtn').addEventListener('click', () => {
            this.setActionMode('attack');
            this.updateContextMenuButtons(this.selectedUnit);
            this.logMessage("Attack mode selected - click on highlighted tiles to attack");
            this.hideUnitContextMenu();
        });
        document.getElementById('contextCaptureBtn').addEventListener('click', () => {
            this.captureBuilding();
            this.hideUnitContextMenu();
        });
        document.getElementById('contextSubmergeBtn').addEventListener('click', () => {
            this.toggleSubmerge();
        });
        document.getElementById('contextLoadBtn').addEventListener('click', () => {
            this.loadUnit();
        });
        document.getElementById('contextUnloadBtn').addEventListener('click', () => {
            this.unloadUnit();
        });
        document.getElementById('contextWaitBtn').addEventListener('click', () => {
            this.waitUnit();
        });
        document.getElementById('contextCancelBtn').addEventListener('click', () => {
            this.cancelSelection();
        });
        
        // Close context menu when clicking elsewhere
        document.addEventListener('click', (e) => {
            const unitContextMenu = document.getElementById('unitContextMenu');
            const buildingContextMenu = document.getElementById('buildingContextMenu');
            if (!unitContextMenu.contains(e.target) && !buildingContextMenu.contains(e.target) && !e.target.closest('.tile')) {
                this.hideAllContextMenus();
            }
        });

        // Building context menu event listeners
        document.getElementById('closeBuildingContextMenu').addEventListener('click', () => this.hideBuildingContextMenu());
        document.getElementById('contextBuildInfantryBtn').addEventListener('click', () => {
            this.buildUnit('infantry');
        });
        document.getElementById('contextBuildTankBtn').addEventListener('click', () => {
            this.buildUnit('tank');
        });
        document.getElementById('contextBuildArtilleryBtn').addEventListener('click', () => {
            this.buildUnit('artillery');
        });
        document.getElementById('contextBuildTransportBtn').addEventListener('click', () => {
            this.buildUnit('transport');
        });
        document.getElementById('contextBuildBattleshipBtn').addEventListener('click', () => {
            this.buildUnit('battleship');
        });
        document.getElementById('contextBuildSubmarineBtn').addEventListener('click', () => {
            this.buildUnit('submarine');
        });
        document.getElementById('contextCancelBuildingBtn').addEventListener('click', () => {
            this.hideBuildingContextMenu();
            this.cancelSelection();
        });
        
        // Building buttons
        const buildInfantryBtn = document.getElementById('buildInfantryBtn');
        const buildTankBtn = document.getElementById('buildTankBtn');
        const buildArtilleryBtn = document.getElementById('buildArtilleryBtn');
        const buildTransportBtn = document.getElementById('buildTransportBtn');
        const buildBattleshipBtn = document.getElementById('buildBattleshipBtn');
        const buildSubmarineBtn = document.getElementById('buildSubmarineBtn');
        
        if (buildInfantryBtn) {
            buildInfantryBtn.addEventListener('click', () => this.buildUnit('infantry'));
        }
        if (buildTankBtn) {
            buildTankBtn.addEventListener('click', () => this.buildUnit('tank'));
        }
        if (buildArtilleryBtn) {
            buildArtilleryBtn.addEventListener('click', () => this.buildUnit('artillery'));
        }
        if (buildTransportBtn) {
            buildTransportBtn.addEventListener('click', () => this.buildUnit('transport'));
        }
        if (buildBattleshipBtn) {
            buildBattleshipBtn.addEventListener('click', () => this.buildUnit('battleship'));
        }
        if (buildSubmarineBtn) {
            buildSubmarineBtn.addEventListener('click', () => this.buildUnit('submarine'));
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

    // Context Menu Functions
    showUnitContextMenu(unit) {
        // Close any other open menus first
        this.hideBuildingContextMenu();
        
        const contextMenu = document.getElementById('unitContextMenu');
        const contextUnitType = document.getElementById('contextUnitType');
        
        // Update header with unit info
        contextUnitType.textContent = `${unit.type} Actions`;
        
        // Position the context menu near the selected unit
        const tile = document.querySelector(`[data-x="${unit.x}"][data-y="${unit.y}"]`);
        if (tile) {
            const rect = tile.getBoundingClientRect();
            const menuWidth = 220; // Approximate menu width
            const menuHeight = 300; // Approximate menu height
            
            let left = rect.right + 10;
            let top = rect.top;
            
            // Adjust position if menu would go off screen
            if (left + menuWidth > window.innerWidth) {
                left = rect.left - menuWidth - 10;
            }
            if (top + menuHeight > window.innerHeight) {
                top = window.innerHeight - menuHeight - 10;
            }
            
            contextMenu.style.left = left + 'px';
            contextMenu.style.top = top + 'px';
        }
        
        // Update context menu buttons availability
        this.updateContextMenuButtons(unit);
        
        // Update tile highlighting to show movement/attack options
        this.updateTileHighlighting();
        
        // Show the context menu
        contextMenu.classList.remove('hidden');
    }

    hideUnitContextMenu() {
        const contextMenu = document.getElementById('unitContextMenu');
        contextMenu.classList.add('hidden');
    }

    hideAllContextMenus() {
        this.hideUnitContextMenu();
        this.hideBuildingContextMenu();
    }

    updateContextMenuButtons(unit) {
        // Basic movement buttons - always available if unit hasn't moved
        const canAct = !unit.hasMoved && this.currentActions > 0;
        
        const contextMoveBtn = document.getElementById('contextMoveBtn');
        const contextAttackBtn = document.getElementById('contextAttackBtn');
        
        contextMoveBtn.disabled = !canAct;
        contextAttackBtn.disabled = !canAct;
        
        // Update active states based on current action mode
        contextMoveBtn.classList.toggle('active', this.currentActionMode === 'move');
        contextAttackBtn.classList.toggle('active', this.currentActionMode === 'attack');
        
        // Update button text to show current state
        if (this.currentActionMode === 'move') {
            contextMoveBtn.querySelector('.context-text').textContent = 'Move (Active)';
        } else {
            contextMoveBtn.querySelector('.context-text').textContent = 'Move';
        }
        
        if (this.currentActionMode === 'attack') {
            contextAttackBtn.querySelector('.context-text').textContent = 'Attack (Active)';
        } else {
            contextAttackBtn.querySelector('.context-text').textContent = 'Attack';
        }
        
        // Special action buttons
        const contextCaptureBtn = document.getElementById('contextCaptureBtn');
        const contextSubmergeBtn = document.getElementById('contextSubmergeBtn');
        const contextLoadBtn = document.getElementById('contextLoadBtn');
        const contextUnloadBtn = document.getElementById('contextUnloadBtn');
        
        // Check if unit is on a capturable building
        const cell = this.gameBoard[unit.y][unit.x];
        const canCapture = canAct && (cell.terrain === 'city' || cell.terrain === 'hq' || cell.terrain === 'seaport') && 
                          (!cell.owner || cell.owner !== unit.player);
        
        if (canCapture) {
            contextCaptureBtn.style.display = 'block';
            contextCaptureBtn.disabled = false;
        } else {
            contextCaptureBtn.style.display = 'none';
        }
        
        // Submarine submerge
        if (unit.canSubmerge) {
            contextSubmergeBtn.style.display = 'block';
            contextSubmergeBtn.disabled = !canAct;
            const submergeText = document.querySelector('#contextSubmergeBtn .context-text');
            submergeText.textContent = unit.isSubmerged ? 'Surface' : 'Submerge';
        } else {
            contextSubmergeBtn.style.display = 'none';
        }
        
        // Transport load/unload
        if (unit.type === 'transport') {
            const nearbyUnits = this.getNearbyLandUnits(unit);
            const canLoad = canAct && nearbyUnits.length > 0 && 
                           unit.transportedUnits.length < unit.transportCapacity;
            
            contextLoadBtn.style.display = 'block';
            contextLoadBtn.disabled = !canLoad;
            
            const canUnload = canAct && unit.transportedUnits.length > 0 && 
                             this.isNearLand(unit.x, unit.y);
            
            contextUnloadBtn.style.display = 'block';
            contextUnloadBtn.disabled = !canUnload;
        } else {
            contextLoadBtn.style.display = 'none';
            contextUnloadBtn.style.display = 'none';
        }
        
        // Hide special section if no special actions available
        const specialSection = document.getElementById('contextSpecialSection');
        const hasSpecialActions = contextCaptureBtn.style.display !== 'none' || 
                                 contextSubmergeBtn.style.display !== 'none' ||
                                 contextLoadBtn.style.display !== 'none' ||
                                 contextUnloadBtn.style.display !== 'none';
        
        specialSection.style.display = hasSpecialActions ? 'block' : 'none';
        
        // General buttons
        document.getElementById('contextWaitBtn').disabled = !canAct;
        document.getElementById('contextCancelBtn').disabled = false; // Always can cancel
    }

    // Building Context Menu Functions
    showBuildingContextMenu(x, y) {
        // Close any other open menus first
        this.hideUnitContextMenu();
        
        const contextMenu = document.getElementById('buildingContextMenu');
        const contextBuildingType = document.getElementById('contextBuildingType');
        
        const cell = this.gameBoard[y][x];
        let buildingName = 'Building';
        if (cell.terrain === 'city') buildingName = 'City';
        else if (cell.terrain === 'hq') buildingName = 'Headquarters';
        else if (cell.terrain === 'seaport') buildingName = 'Sea Port';
        
        // Update header with building info
        contextBuildingType.textContent = `${buildingName} - Build Units`;
        
        // Position the context menu near the selected building
        const tile = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        if (tile) {
            const rect = tile.getBoundingClientRect();
            const menuWidth = 220; // Approximate menu width
            const menuHeight = 350; // Approximate menu height
            
            let left = rect.right + 10;
            let top = rect.top;
            
            // Adjust position if menu would go off screen
            if (left + menuWidth > window.innerWidth) {
                left = rect.left - menuWidth - 10;
            }
            if (top + menuHeight > window.innerHeight) {
                top = window.innerHeight - menuHeight - 10;
            }
            
            contextMenu.style.left = left + 'px';
            contextMenu.style.top = top + 'px';
        }
        
        // Update context menu buttons availability
        this.updateBuildingContextMenuButtons(x, y);
        
        // Show the context menu
        contextMenu.classList.remove('hidden');
    }

    hideBuildingContextMenu() {
        const contextMenu = document.getElementById('buildingContextMenu');
        contextMenu.classList.add('hidden');
    }

    updateBuildingContextMenuButtons(x, y) {
        const cell = this.gameBoard[y][x];
        const unitTypes = this.getUnitTypes();
        
        // Land unit buttons
        const contextBuildInfantryBtn = document.getElementById('contextBuildInfantryBtn');
        const contextBuildTankBtn = document.getElementById('contextBuildTankBtn');
        const contextBuildArtilleryBtn = document.getElementById('contextBuildArtilleryBtn');
        
        // Naval unit buttons
        const contextBuildTransportBtn = document.getElementById('contextBuildTransportBtn');
        const contextBuildBattleshipBtn = document.getElementById('contextBuildBattleshipBtn');
        const contextBuildSubmarineBtn = document.getElementById('contextBuildSubmarineBtn');
        
        // Sections
        const landUnitsSection = document.getElementById('contextLandUnitsSection');
        const navalUnitsSection = document.getElementById('contextNavalUnitsSection');
        
        if (cell.terrain === 'seaport') {
            // Sea port - show naval units, hide land units
            landUnitsSection.style.display = 'none';
            navalUnitsSection.style.display = 'block';
            
            // Update naval unit buttons
            this.updateBuildingButton(contextBuildTransportBtn, 'transport', unitTypes);
            this.updateBuildingButton(contextBuildBattleshipBtn, 'battleship', unitTypes);
            this.updateBuildingButton(contextBuildSubmarineBtn, 'submarine', unitTypes);
        } else {
            // City/HQ - show land units, hide naval units
            landUnitsSection.style.display = 'block';
            navalUnitsSection.style.display = 'none';
            
            // Update land unit buttons
            this.updateBuildingButton(contextBuildInfantryBtn, 'infantry', unitTypes);
            this.updateBuildingButton(contextBuildTankBtn, 'tank', unitTypes);
            this.updateBuildingButton(contextBuildArtilleryBtn, 'artillery', unitTypes);
        }
    }

    updateBuildingButton(button, unitType, unitTypes) {
        const unitTemplate = unitTypes[unitType];
        const cost = unitTemplate.cost;
        const actionCost = unitTemplate.actionCost;
        
        // Check affordability
        const canAfford = this.playerMoney[this.currentPlayer] >= cost && this.currentActions >= actionCost;
        
        button.disabled = !canAfford;
        
        // Update cost display
        const costElement = button.querySelector('.context-cost');
        if (costElement) {
            costElement.textContent = cost;
            if (!canAfford) {
                costElement.style.color = '#e74c3c';
                costElement.style.background = 'rgba(231, 76, 60, 0.2)';
            } else {
                costElement.style.color = '#f1c40f';
                costElement.style.background = 'rgba(241, 196, 15, 0.2)';
            }
        }
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
            const botDifficultyGroup = document.getElementById('quickBotDifficultyGroup');
            
            if (e.target.value === 'singleplayer') {
                playerCountGroup.style.display = 'none';
                botDifficultyGroup.style.display = 'block';
                this.updateBotDifficultySelectors('quick');
            } else {
                playerCountGroup.style.display = 'block';
                botDifficultyGroup.style.display = 'none';
            }
        });

        // Custom rules game mode toggle
        document.getElementById('gameMode').addEventListener('change', (e) => {
            const botDifficultyGroup = document.getElementById('botDifficultyGroup');
            
            if (e.target.value === 'singleplayer') {
                botDifficultyGroup.style.display = 'block';
                this.updateBotDifficultySelectors('custom');
            } else {
                botDifficultyGroup.style.display = 'none';
            }
        });

        // Player count change listeners
        document.getElementById('playerCount').addEventListener('change', () => {
            const quickGameMode = document.getElementById('quickGameMode').value;
            if (quickGameMode === 'singleplayer') {
                this.updateBotDifficultySelectors('quick');
            }
        });

        document.getElementById('customPlayerCount').addEventListener('change', () => {
            const gameMode = document.getElementById('gameMode').value;
            if (gameMode === 'singleplayer') {
                this.updateBotDifficultySelectors('custom');
            }
        });
    }

    updateBotDifficultySelectors(mode) {
        const isQuick = mode === 'quick';
        const playerCountId = isQuick ? 'playerCount' : 'customPlayerCount';
        const playerCount = parseInt(document.getElementById(playerCountId).value);
        
        // In singleplayer mode, all players except player 1 are bots
        const botCount = playerCount - 1;
        
        for (let i = 2; i <= 4; i++) {
            const selectorId = isQuick ? `quickBot${i}Difficulty` : `bot${i}Difficulty`;
            const selector = document.getElementById(selectorId);
            
            if (selector) {
                if (i <= playerCount) {
                    selector.style.display = 'block';
                } else {
                    selector.style.display = 'none';
                }
            }
        }

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
        
        // Collect individual bot difficulties
        const botDifficulties = {};
        if (quickGameMode === 'singleplayer') {
            const actualPlayerCount = 2; // Quick match with bot is always 2 players
            for (let i = 2; i <= actualPlayerCount; i++) {
                const difficultyElement = document.getElementById(`quickBotDifficulty${i}`);
                if (difficultyElement) {
                    botDifficulties[i] = difficultyElement.value;
                }
            }
        }
        
        const gameSettings = {
            gameMode: quickGameMode,
            players: quickGameMode === 'singleplayer' ? 2 : playerCount,
            botDifficulties: Object.keys(botDifficulties).length > 0 ? botDifficulties : { 2: 'medium' },
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

        // Collect individual bot difficulties
        const botDifficulties = {};
        if (gameMode === 'singleplayer') {
            for (let i = 2; i <= playerCount; i++) {
                const difficultyElement = document.getElementById(`botDifficulty${i}`);
                if (difficultyElement) {
                    botDifficulties[i] = difficultyElement.value;
                }
            }
        }
        
        const gameSettings = {
            gameMode: gameMode,
            players: gameMode === 'singleplayer' ? playerCount : playerCount,
            botDifficulties: Object.keys(botDifficulties).length > 0 ? botDifficulties : { 2: 'medium' },
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