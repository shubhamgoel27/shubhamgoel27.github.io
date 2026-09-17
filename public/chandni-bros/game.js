// ============================================================
// CHANDNI CHOWK BROS: DHAMAAL EDITION — Phaser 3 Engine
// ============================================================

// ─── CONSTANTS ──────────────────────────────────────────────
const GAME_W = 1280;
const GAME_H = 720;
const GROUND_Y = 620;
const PLAYER_W = 70;
const PLAYER_H = 100;
const PLATFORM_H = 160;
const PLATFORM_W = 220;

const LEVEL_CONFIG = [
    { dist: 6000, name: "The Market", desc: "Avoid Rickshaws and grab samosas!", sky1: '#87CEEB', sky2: '#FFF3E0', groundColor: '#8D6E63', accent: '#FF6F00' },
    { dist: 9000, name: "Paranthe Wali Gali", desc: "Watch out for cows and slippery oil!", sky1: '#FFE0B2', sky2: '#FFF8E1', groundColor: '#795548', accent: '#F57F17' },
    { dist: 12000, name: "Kinari Bazaar", desc: "Watch for open manholes! 🚧", sky1: '#E1BEE7', sky2: '#FCE4EC', groundColor: '#6D4C41', accent: '#AD1457' },
    { dist: 15000, name: "Rooftops", desc: "Monkeys are angry! Dodge the bananas!", sky1: '#FFCCBC', sky2: '#FBE9E7', groundColor: '#5D4037', accent: '#BF360C' },
    { dist: 20000, name: "Red Fort", desc: "The final stretch. Don't stop!", sky1: '#B3E5FC', sky2: '#E8F5E9', groundColor: '#4E342E', accent: '#1B5E20' }
];

const EMOJI = {
    rickshaw: '🛺', cow: '🐄', monkey: '🐒', dog: '🐕',
    food: ['🥟', '🧆', '☕', '🧁', '🍩'],
    chai: '🍵', paan: '🌿', diya: '🪔', jalebi: '🍥',
    tulsi: '🌱', mango: '🥭', coconut: '🥥', feather: '🪶',
    banana: '🍌', pigeon: '🐦', heart: '❤️', kite: '🪁',
    marigold: '🌼'
};

// Shared game state (persists across scene restarts)
const G = {
    character: 'raju',
    playerName: 'Anonymous',
    level: 0,
    score: 0,
    lives: 5,
    totalDist: 0,
    chaiBoostTimer: 0,
    comboCount: 0,
    comboTimer: 0,
};

// ─── CHARACTER SELECT (DOM) ─────────────────────────────────
window.selectChar = function (char) {
    G.character = char;
    document.querySelectorAll('.char-card').forEach(el => el.classList.remove('selected'));
    document.getElementById(`btn-${char}`).classList.add('selected');
    document.getElementById('startBtn').disabled = false;
};

// ─── EMOJI TEXTURE HELPER ──────────────────────────────────
function makeEmojiTexture(scene, key, emoji, size) {
    if (scene.textures.exists(key)) return;
    const pad = Math.ceil(size * 0.3);
    const dim = size + pad * 2;
    const c = document.createElement('canvas');
    c.width = dim; c.height = dim;
    const cx = c.getContext('2d');
    cx.font = size + 'px Arial';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(emoji, dim / 2, dim / 2);
    scene.textures.addCanvas(key, c);
}

// ─── BOOT SCENE ─────────────────────────────────────────────
class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    create() {
        // Generate particle texture
        const gfx = this.make.graphics({ add: false });
        gfx.fillStyle(0xffffff);
        gfx.fillCircle(4, 4, 4);
        gfx.generateTexture('particle', 8, 8);
        gfx.destroy();

        // Small rect for ground/platform physics
        const g2 = this.make.graphics({ add: false });
        g2.fillStyle(0xffffff);
        g2.fillRect(0, 0, 4, 4);
        g2.generateTexture('pixel', 4, 4);
        g2.destroy();

        // Don't auto-start GameScene; wait for user to click Start
    }
}

// ─── GAME SCENE ─────────────────────────────────────────────
class GameScene extends Phaser.Scene {
    constructor() { super('Game'); }

    create() {
        const lvl = LEVEL_CONFIG[G.level];
        this.levelWidth = lvl.dist;
        this.levelConfig = lvl;

        // Physics world bounds
        this.physics.world.setBounds(0, 0, this.levelWidth, GAME_H + 200);

        // ── Initialize all data arrays (before any methods that push to them) ──
        this.pits = [];
        this.pigeons = [];
        this.kites = [];
        this.rangolis = [];
        this.puddles = [];
        this.hangingWires = [];
        this.npcs = [];
        this.scorePopups = [];
        this.platformVisuals = [];

        // ── Background ──
        this.createBackground();

        // ── Ground segments (with pit gaps) ──
        this.groundGroup = this.physics.add.staticGroup();
        this.generatePits();
        this.createGroundSegments();

        // ── Platforms ──
        this.platformGroup = this.physics.add.staticGroup();

        // ── Entity groups ──
        this.collectibles = this.physics.add.group({ allowGravity: false });
        this.hazards = this.physics.add.group({ allowGravity: false });
        this.projectiles = this.physics.add.group();

        // ── Generate Level ──
        this.generateLevel();

        // ── Player ──
        this.createPlayer();

        // ── Boss (level 5) ──
        this.boss = null;
        this.bossDefeated = false;
        this.bossWarningX = 0;
        this.bossWarningShown = false;
        if (G.level === 4) this.createBoss();

        // ── Collisions ──
        this.physics.add.collider(this.player, this.groundGroup);
        this.physics.add.collider(this.player, this.platformGroup, null, (player, plat) => {
            return player.body.velocity.y > 0 && player.body.bottom <= plat.body.top + 15;
        });
        this.physics.add.collider(this.hazards, this.groundGroup);
        this.physics.add.overlap(this.player, this.collectibles, this.onCollect, null, this);
        this.physics.add.overlap(this.player, this.hazards, this.onHazardContact, null, this);
        this.physics.add.overlap(this.player, this.projectiles, this.onProjectileHit, null, this);

        // ── Camera ──
        this.cameras.main.setBounds(0, 0, this.levelWidth, GAME_H);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.1);
        this.cameras.main.setFollowOffset(-GAME_W / 6, 0);

        // ── Input ──
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');
        this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        // Touch controls
        this.bindTouchControls();

        // ── Player state ──
        this.pState = {
            facingRight: true,
            grounded: false,
            isSliding: false,
            slideTimer: 0,
            isDashing: false,
            dashTimer: 0,
            dashCooldown: 0,
            dashCooldownMax: 3000,
            invulnTimer: 0,
            hasDoubleJumpPower: false,
            hasDoubleJumped: false,
            doubleJumpTimer: 0,
            scoreMultiplier: 1,
            scoreMultTimer: 0,
            animTimer: 0,
            speed: G.character === 'priya' ? 420 : 480,
            jumpStr: G.character === 'priya' ? -1500 : -1320,
            dashSpeed: 1500,
            // Squash/stretch state
            scaleX: 1,
            scaleY: 1,
            wasGrounded: true,
        };

        // ── Key state tracking (for single-press actions) ──
        this.jumpJustPressed = false;
        this.slideJustPressed = false;
        this.dashJustPressed = false;
        this.input.keyboard.on('keydown-SPACE', () => { this.jumpJustPressed = true; });
        this.input.keyboard.on('keydown-UP', () => { this.jumpJustPressed = true; });
        this.input.keyboard.on('keydown-W', () => { this.jumpJustPressed = true; });
        this.input.keyboard.on('keydown-DOWN', () => { this.slideJustPressed = true; });
        this.input.keyboard.on('keydown-S', () => { this.slideJustPressed = true; });
        this.input.keyboard.on('keydown-SHIFT', () => { this.dashJustPressed = true; });
        this.input.keyboard.on('keydown-E', () => { this.dashJustPressed = true; });

        // ── HUD ──
        this.showHUD();
        document.getElementById('targetDistDisplay').innerText = Math.floor(this.levelWidth / 10);

        // ── VFX container ──
        this.vfxEmitter = this.add.particles(0, 0, 'particle', {
            speed: { min: 20, max: 150 },
            lifespan: 400,
            scale: { start: 0.8, end: 0 },
            emitting: false,
        });

        // ── Music ──
        AudioManager.init();
        AudioManager.resume();
        AudioManager.startMusic();
    }

    // ─── BACKGROUND ─────────────────────────────────────────
    createBackground() {
        const lvl = this.levelConfig;

        // Sky gradient (fixed, doesn't scroll)
        const skyGfx = this.add.graphics().setScrollFactor(0).setDepth(-100);
        const skyCanvas = document.createElement('canvas');
        skyCanvas.width = GAME_W; skyCanvas.height = GAME_H;
        const sctx = skyCanvas.getContext('2d');
        const grad = sctx.createLinearGradient(0, 0, 0, GAME_H);
        grad.addColorStop(0, lvl.sky1);
        grad.addColorStop(1, lvl.sky2);
        sctx.fillStyle = grad;
        sctx.fillRect(0, 0, GAME_W, GAME_H);
        // Sun
        sctx.fillStyle = 'rgba(255, 167, 38, 0.15)';
        sctx.beginPath(); sctx.arc(GAME_W - 200, 100, 100, 0, Math.PI * 2); sctx.fill();
        sctx.fillStyle = '#FFA726';
        sctx.beginPath(); sctx.arc(GAME_W - 200, 100, 70, 0, Math.PI * 2); sctx.fill();
        if (!this.textures.exists('sky_' + G.level)) {
            this.textures.addCanvas('sky_' + G.level, skyCanvas);
        }
        this.add.image(GAME_W / 2, GAME_H / 2, 'sky_' + G.level).setScrollFactor(0).setDepth(-100);
        skyGfx.destroy();

        // Far building silhouettes
        this.farBuildings = this.add.graphics().setScrollFactor(0.15).setDepth(-90);
        this.farBuildings.fillStyle(Phaser.Display.Color.HexStringToColor(lvl.groundColor).color, 0.2);
        for (let i = -200; i < this.levelWidth + 400; i += 150) {
            this.farBuildings.fillRect(i, GROUND_Y - 180, 60, 180);
            this.farBuildings.fillTriangle(i, GROUND_Y - 180, i + 30, GROUND_Y - 210, i + 60, GROUND_Y - 180);
        }

        // Near building silhouettes
        this.nearBuildings = this.add.graphics().setScrollFactor(0.25).setDepth(-85);
        this.nearBuildings.fillStyle(Phaser.Display.Color.HexStringToColor(lvl.groundColor).color, 0.3);
        for (let i = -100; i < this.levelWidth + 400; i += 200) {
            this.nearBuildings.fillRect(i, GROUND_Y - 140, 80, 140);
            this.nearBuildings.fillRect(i + 100, GROUND_Y - 100, 60, 100);
        }

        // Kites (parallax)
        for (let k = 0; k < 15; k++) {
            const kx = Math.random() * this.levelWidth;
            const ky = 50 + Math.random() * 150;
            const color = ['#FF1744', '#FF9100', '#00E676', '#2979FF', '#D500F9'][Math.floor(Math.random() * 5)];
            this.kites.push({ x: kx, y: ky, color, phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.5 });
        }
        this.kiteGfx = this.add.graphics().setScrollFactor(0.3).setDepth(-80);

        // String lights
        this.stringLightGfx = this.add.graphics().setScrollFactor(0.6).setDepth(-70);
    }

    drawDynamicBackground() {
        // Kites
        this.kiteGfx.clear();
        const t = this.time.now / 1000;
        this.kites.forEach(k => {
            const bobY = k.y + Math.sin(t * k.speed + k.phase) * 20;
            const col = Phaser.Display.Color.HexStringToColor(k.color).color;
            this.kiteGfx.fillStyle(col, 1);
            this.kiteGfx.fillTriangle(k.x, bobY - 20, k.x + 15, bobY, k.x, bobY + 25);
            this.kiteGfx.fillTriangle(k.x, bobY - 20, k.x - 15, bobY, k.x, bobY + 25);
        });

        // String lights
        this.stringLightGfx.clear();
        const colors = [0xFF1744, 0xFF9100, 0xFFEA00, 0x00E676, 0x2979FF, 0xD500F9];
        const camX = this.cameras.main.scrollX;
        for (let row = 0; row < (G.level >= 2 ? 2 : 1); row++) {
            const y = 30 + row * 30;
            for (let x = -80; x < GAME_W + 80; x += 80) {
                const wx = x + camX * 0.6;
                const idx = Math.floor(wx / 80) % colors.length;
                const brightness = 0.6 + Math.sin(t * 3 + idx) * 0.4;
                this.stringLightGfx.fillStyle(colors[Math.abs(idx)], brightness * 0.4);
                this.stringLightGfx.fillCircle(x, y + 8, 5);
            }
        }
    }

    // ─── GROUND & PITS ─────────────────────────────────────
    generatePits() {
        if (G.level < 2) return; // Pits from level 3 (index 2)
        const pitChances = [0, 0, 0.10, 0.18, 0.25];
        const chance = pitChances[Math.min(G.level, 4)];
        let x = 1500;
        while (x < this.levelWidth - 1200) {
            if (Math.random() < chance) {
                let w;
                if (G.level >= 4 && Math.random() < 0.3) {
                    w = 350 + Math.random() * 100; // mega pit
                } else {
                    w = 150 + Math.random() * 100;
                }
                this.pits.push({
                    x, w,
                    hasLadder: G.level >= 3 && Math.random() < 0.35,
                    hasKiteString: G.level >= 4 && (w >= 300 || (w >= 180 && Math.random() < 0.4)),
                    kitePhase: Math.random() * Math.PI * 2,
                });
                x += w + 400; // minimum spacing
            } else {
                x += 300 + Math.random() * 300;
            }
        }
    }

    createGroundSegments() {
        // Sort pits by x
        this.pits.sort((a, b) => a.x - b.x);

        let segStart = 0;
        this.pits.forEach(pit => {
            if (pit.x > segStart) {
                this.addGroundSeg(segStart, pit.x);
            }
            segStart = pit.x + pit.w;
        });
        if (segStart < this.levelWidth) {
            this.addGroundSeg(segStart, this.levelWidth);
        }

        // Pit visuals
        this.pitGfx = this.add.graphics().setDepth(1);
        this.pits.forEach(pit => {
            // Dark hole
            this.pitGfx.fillStyle(0x0D0D0D, 1);
            this.pitGfx.fillRect(pit.x, GROUND_Y, pit.w, 180);
            // Sewer water
            this.pitGfx.fillStyle(0x145014, 0.6);
            this.pitGfx.fillRect(pit.x + 5, GROUND_Y + 150, pit.w - 10, 25);
            // Brick walls
            this.pitGfx.fillStyle(0x4E342E, 1);
            this.pitGfx.fillRect(pit.x, GROUND_Y, 8, 180);
            this.pitGfx.fillRect(pit.x + pit.w - 8, GROUND_Y, 8, 180);
            // Construction barriers
            this.pitGfx.fillStyle(0xFF6F00, 1);
            this.pitGfx.fillRect(pit.x - 10, GROUND_Y - 38, pit.w + 20, 10);
            this.pitGfx.fillStyle(0xFFFFFF, 1);
            for (let i = 0; i < 5; i += 2) {
                const bx = pit.x - 10 + i * ((pit.w + 20) / 5);
                this.pitGfx.fillRect(bx, GROUND_Y - 38, (pit.w + 20) / 5, 10);
            }
            // Warning emoji
            if (pit.w > 180) {
                this.add.text(pit.x + pit.w / 2, GROUND_Y - 55, '⚠ KHATARA', {
                    fontSize: '11px', fontFamily: 'Poppins', fontStyle: 'bold',
                    color: '#FF5252', backgroundColor: 'rgba(0,0,0,0.7)',
                    padding: { x: 8, y: 4 }
                }).setOrigin(0.5).setDepth(2);
            }
            // Ladder
            if (pit.hasLadder) {
                const lx = pit.x + pit.w - 30;
                this.pitGfx.lineStyle(3, 0x8D6E63);
                this.pitGfx.lineBetween(lx, GROUND_Y, lx, GROUND_Y + 145);
                this.pitGfx.lineBetween(lx + 18, GROUND_Y, lx + 18, GROUND_Y + 145);
                for (let ry = 15; ry < 140; ry += 20) {
                    this.pitGfx.lineStyle(2, 0x8D6E63);
                    this.pitGfx.lineBetween(lx, GROUND_Y + ry, lx + 18, GROUND_Y + ry);
                }
            }
            // Kite string (visual - drawn dynamically)
        });
    }

    addGroundSeg(x1, x2) {
        const w = x2 - x1;
        if (w <= 0) return;
        const seg = this.groundGroup.create(x1 + w / 2, GROUND_Y + 50, 'pixel');
        seg.setDisplaySize(w, 100).refreshBody();
        seg.setVisible(false);

        // Visual ground
        const gfx = this.add.graphics().setDepth(0);
        const col = Phaser.Display.Color.HexStringToColor(this.levelConfig.groundColor).color;
        gfx.fillStyle(col, 1);
        gfx.fillRect(x1, GROUND_Y, w, 100);
        // Top edge
        gfx.fillStyle(0xD7CCC8, 1);
        gfx.fillRect(x1, GROUND_Y, w, 8);
        // Brick pattern
        gfx.fillStyle(0x000000, 0.05);
        for (let bx = x1; bx < x2; bx += 40) {
            const row = Math.floor(bx / 40) % 2;
            gfx.fillRect(bx, GROUND_Y + 15 + row * 5, 38, 18);
        }
    }

    // ─── LEVEL GENERATION ───────────────────────────────────
    generateLevel() {
        let x = 600;
        const endX = this.levelWidth - 600;

        while (x < endX) {
            // Random pigeons
            if (Math.random() < 0.3) {
                this.addPigeon(x + Math.random() * 150);
            }

            // Rangolis
            if (Math.random() < 0.15) {
                this.addRangoli(x + Math.random() * 200);
            }

            // Water puddles
            if (Math.random() < 0.12 && G.level >= 1) {
                this.puddles.push({ x: x + Math.random() * 100, w: 120 + Math.random() * 80, splashed: false });
            }

            // Check if this x is in a pit zone (skip entity placement)
            const inPit = this.pits.some(p => x > p.x - 50 && x < p.x + p.w + 50);

            if (!inPit && Math.random() < 0.45) {
                // Shop stalls (platforms)
                const shopCount = Math.floor(Math.random() * 2) + 1;
                for (let s = 0; s < shopCount; s++) {
                    const type = Math.floor(Math.random() * 3);
                    this.addPlatform(x, GROUND_Y - PLATFORM_H, type);

                    // Stacked 2nd tier (level 3+)
                    const secondTierY = GROUND_Y - PLATFORM_H * 2 + 20;
                    if (G.level >= 2 && Math.random() < 0.35) {
                        this.addPlatform(x, secondTierY, (type + 1) % 3);
                        this.addCollectible(x + 70, secondTierY - 60);
                        // Hanging wire fruit
                        if (Math.random() < 0.6) {
                            this.addHangingWire(x + 40 + Math.random() * (PLATFORM_W - 80), secondTierY - PLATFORM_H - 20);
                        }
                    } else {
                        // Items on platform (center-origin: 60px above platform = center of 80px item)
                        if (Math.random() > 0.4) {
                            this.addCollectible(x + 70, GROUND_Y - PLATFORM_H - 60);
                        } else if (G.level >= 1 && Math.random() < 0.5) {
                            this.addHazard(x + 70, GROUND_Y - PLATFORM_H - 60, EMOJI.monkey);
                        }
                    }
                    x += PLATFORM_W + 20;
                }
            } else if (!inPit) {
                const gap = 300 + Math.random() * 300;
                const midX = x + gap / 2;

                if (Math.random() < 0.5 + G.level * 0.05) {
                    // Hazard (has gravity, will fall to ground)
                    if (Math.random() < 0.15 && G.level >= 1) {
                        this.addHazard(midX, GROUND_Y - 80, EMOJI.dog, 'dog');
                    } else if (Math.random() > 0.7) {
                        this.addHazard(midX, GROUND_Y - 80, EMOJI.cow, 'cow');
                    } else {
                        this.addHazard(midX, GROUND_Y - 80, EMOJI.rickshaw, 'auto');
                    }
                } else if (Math.random() > 0.4) {
                    // Collectible (no gravity; center of 80px = sits on ground)
                    this.addCollectible(midX, GROUND_Y - 40);
                }

                x += gap;
            } else {
                x += 200;
            }
        }

        // NPCs: Chai Wallahs
        for (let nx = 2500; nx < this.levelWidth - 2000; nx += 4000 + Math.random() * 2000) {
            this.addChaiWallah(nx);
        }
        // Cycle Rickshaws (level 2+)
        if (G.level >= 1) {
            for (let nx = 2000; nx < this.levelWidth - 2000; nx += 2500 + Math.random() * 1500) {
                this.addCycleRickshaw(nx);
            }
        }

        // Puddle visuals
        this.puddleGfx = this.add.graphics().setDepth(1);
        this.puddles.forEach(p => {
            this.puddleGfx.fillStyle(0x2196F3, 0.4);
            this.puddleGfx.fillEllipse(p.x + p.w / 2, GROUND_Y - 2, p.w, 12);
        });

        // Rangoli visuals
        this.rangolis.forEach(r => {
            const gfx = this.add.graphics().setDepth(0);
            gfx.fillStyle(Phaser.Display.Color.HexStringToColor(r.colors[0]).color, 0.5);
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i;
                gfx.fillEllipse(r.x + Math.cos(angle) * r.size * 0.6, GROUND_Y + 5 + Math.sin(angle) * r.size * 0.2, 8, 3);
            }
        });
    }

    addPlatform(x, y, type) {
        // Physics body (top surface only)
        const plat = this.platformGroup.create(x + PLATFORM_W / 2, y + 5, 'pixel');
        plat.setDisplaySize(PLATFORM_W, 10).refreshBody();
        plat.setVisible(false);

        // Visual
        const gfx = this.add.graphics().setDepth(2);
        // Main building
        gfx.fillStyle(0xCD853F, 1);
        gfx.fillRect(x, y, PLATFORM_W, PLATFORM_H);
        gfx.fillStyle(0x3E2723, 1);
        gfx.fillRect(x + 15, y + 15, PLATFORM_W - 30, PLATFORM_H - 15);

        // Awning
        const awningColors = [0xC62828, 0x1565C0, 0x2E7D32, 0xE65100, 0x6A1B9A];
        gfx.fillStyle(awningColors[type % awningColors.length], 1);
        gfx.fillTriangle(x - 15, y + 50, x, y, x + PLATFORM_W, y);
        gfx.fillTriangle(x - 15, y + 50, x + PLATFORM_W, y, x + PLATFORM_W + 15, y + 50);

        // Stripes
        gfx.fillStyle(0xFFFFFF, 0.15);
        for (let s = 0; s < 4; s++) {
            gfx.fillRect(x + 20 + s * 55, y, 25, 50);
        }

        // Lanterns
        gfx.fillStyle(type % 2 === 0 ? 0xFCD34D : 0xF87171, 1);
        gfx.fillCircle(x + 20, y + 60, 8);
        gfx.fillCircle(x + PLATFORM_W - 20, y + 60, 8);

        // Shop items (decorative)
        if (type === 0) {
            gfx.fillStyle(0xF97316, 1);
            for (let j = 0; j < 3; j++) {
                gfx.fillCircle(x + 50 + j * 45, y + 110, 18);
            }
        } else if (type === 1) {
            [0xEF4444, 0x10B981, 0x3B82F6, 0xF59E0B].forEach((c, k) => {
                gfx.fillStyle(c, 1);
                gfx.fillRect(x + 30 + k * 42, y + 30, 35, 100);
            });
        } else {
            gfx.fillStyle(0xFFA726, 1);
            for (let j = 0; j < 4; j++) {
                gfx.fillCircle(x + 35 + j * 45, y + 90, 15);
            }
        }

        // Marigold garland
        gfx.lineStyle(2, 0xFF9800, 0.8);
        gfx.beginPath();
        for (let g = 0; g <= PLATFORM_W; g += 5) {
            const gy = y - 5 + Math.sin((g / PLATFORM_W) * Math.PI) * 15;
            if (g === 0) gfx.moveTo(x + g, gy);
            else gfx.lineTo(x + g, gy);
        }
        gfx.strokePath();

        this.platformVisuals.push(gfx);
    }

    addCollectible(x, y) {
        const powerUps = [
            { emoji: EMOJI.chai, sub: 'chai', chance: 0.12 },
            { emoji: EMOJI.diya, sub: 'diya', chance: 0.08 },
            { emoji: EMOJI.jalebi, sub: 'jalebi', chance: 0.08 },
            { emoji: EMOJI.paan, sub: 'paan', chance: 0.06 },
            { emoji: EMOJI.tulsi, sub: 'tulsi', chance: 0.06 },
            { emoji: EMOJI.mango, sub: 'mango', chance: 0.05 },
            { emoji: EMOJI.coconut, sub: 'coconut', chance: 0.04 },
            { emoji: EMOJI.feather, sub: 'feather', chance: 0.06 },
        ];

        let chosen = null;
        const roll = Math.random();
        let cumulative = 0;
        for (const pu of powerUps) {
            cumulative += pu.chance + G.level * 0.01;
            if (roll < cumulative) { chosen = pu; break; }
        }

        let emoji, subtype;
        if (chosen) {
            emoji = chosen.emoji;
            subtype = chosen.sub;
        } else {
            emoji = EMOJI.food[Math.floor(Math.random() * EMOJI.food.length)];
            subtype = 'food';
        }

        const key = 'c_' + emoji + '_' + x;
        makeEmojiTexture(this, key, emoji, 80);
        const sprite = this.collectibles.create(x, y, key);
        sprite.setDisplaySize(80, 80);
        sprite.body.setSize(50, 50);
        sprite.setData('subtype', subtype);
        sprite.setData('emoji', emoji);
        sprite.setDepth(5);

        // Bobbing animation
        this.tweens.add({
            targets: sprite,
            y: y - 10,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Glow effect for power-ups
        if (subtype !== 'food') {
            const glowColors = { chai: 0xFF9800, diya: 0xFFD700, paan: 0x00E676, tulsi: 0x4CAF50, mango: 0xFFC107, coconut: 0x8D6E63, feather: 0xFF9800, jalebi: 0xFFA000 };
            const glow = this.add.graphics().setDepth(4);
            glow.fillStyle(glowColors[subtype] || 0xFFD700, 0.25);
            glow.fillCircle(0, 0, 30);
            sprite.setData('glow', glow);
        }
    }

    addHazard(x, y, emoji, subtype) {
        const key = 'h_' + emoji + '_' + Math.floor(x);
        makeEmojiTexture(this, key, emoji, 80);
        const sprite = this.hazards.create(x, y, key);
        sprite.setDisplaySize(80, 80);
        sprite.body.setSize(50, 50);
        sprite.setData('type', emoji);
        sprite.setData('subtype', subtype || '');
        sprite.setData('origX', x);
        sprite.setData('vx', 0);
        sprite.setData('state', 'walk');
        sprite.setData('throwTimer', Math.random() * 100);
        sprite.setData('hornTimer', 0);
        sprite.setDepth(5);
        sprite.body.setAllowGravity(true);
        sprite.body.setBounce(0);

        // Patrol behavior
        if (emoji === EMOJI.cow) {
            const dir = Math.random() < 0.5 ? 1 : -1;
            sprite.setData('vx', dir * (20 + Math.random() * 40));
            sprite.setData('patrolDist', 100 + Math.random() * 150);
            sprite.body.setVelocityX(sprite.getData('vx'));
        } else if (emoji === EMOJI.dog) {
            const dir = Math.random() < 0.5 ? 1 : -1;
            sprite.setData('vx', dir * (60 + Math.random() * 90));
            sprite.setData('patrolDist', 80 + Math.random() * 120);
            sprite.body.setVelocityX(sprite.getData('vx'));
        }
    }

    addHangingWire(x, y) {
        const fruits = ['🍎', '🍊', '🍇', '🥝', '🍋'];
        const fruit = fruits[Math.floor(Math.random() * fruits.length)];
        const wireLen = 40 + Math.random() * 30;
        const phase = Math.random() * Math.PI * 2;

        const key = 'wire_' + fruit + '_' + Math.floor(x);
        makeEmojiTexture(this, key, fruit, 40);
        const sprite = this.collectibles.create(x, y + wireLen, key);
        sprite.setDisplaySize(40, 40);
        sprite.body.setSize(35, 35);
        sprite.setData('subtype', 'wire_fruit');
        sprite.setData('points', 250);
        sprite.setDepth(5);

        // Wire visual
        const wire = this.add.graphics().setDepth(4);
        wire.lineStyle(1.5, 0x555555);
        wire.lineBetween(x, y, x, y + wireLen - 15);
        this.hangingWires.push({ x, y, wireLen, phase, sprite, wire });

        // Bob animation
        this.tweens.add({
            targets: sprite,
            y: y + wireLen + 5,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    addPigeon(x) {
        makeEmojiTexture(this, 'pigeon', EMOJI.pigeon, 30);
        const p = this.add.image(x, GROUND_Y + 10, 'pigeon').setDisplaySize(30, 30).setDepth(3);
        this.pigeons.push({ sprite: p, flying: false, vx: 0, vy: 0, flip: Math.random() > 0.5 });
    }

    addRangoli(x) {
        const colorSets = [
            ['#FF1744', '#FF9100', '#FFEA00'],
            ['#00E676', '#2979FF', '#D500F9'],
            ['#FF4081', '#FF6D00', '#FFD600']
        ];
        this.rangolis.push({
            x,
            colors: colorSets[Math.floor(Math.random() * colorSets.length)],
            size: 30 + Math.random() * 20
        });
    }

    addChaiWallah(x) {
        const gfx = this.add.graphics().setDepth(6);
        // Cart
        gfx.fillStyle(0x5D4037, 1);
        gfx.fillRect(x - 5, GROUND_Y - 45, 70, 45);
        gfx.fillStyle(0x8D6E63, 1);
        gfx.fillRect(x, GROUND_Y - 50, 60, 10);
        // Chai pot
        gfx.fillStyle(0xB0BEC5, 1);
        gfx.fillCircle(x + 30, GROUND_Y - 55, 12);
        gfx.fillRect(x + 18, GROUND_Y - 55, 24, 8);

        makeEmojiTexture(this, 'chaiwallah', '🧑‍🍳', 30);
        this.add.image(x + 50, GROUND_Y - 15, 'chaiwallah').setDisplaySize(30, 30).setDepth(6);

        this.npcs.push({
            type: 'chaiWallah', x, gaveChai: false, nearTimer: 0,
            bubbleTimer: 0, shoutTimer: 0, gfx,
            phrases: ['Chai chai chai!', 'Garam chai! ☕', 'Ek cutting!', 'Adrak wali?'],
            bubble: null,
        });
    }

    addCycleRickshaw(x) {
        const gfx = this.add.graphics().setDepth(6);
        this.drawCycleRickshaw(gfx, 0, 0);

        makeEmojiTexture(this, 'cyclist', '🚴', 22);
        const cyclist = this.add.image(x + 10, GROUND_Y - 22, 'cyclist').setDisplaySize(22, 22).setDepth(6);

        this.npcs.push({
            type: 'cycleRickshaw', x, gfx, cyclist,
            speed: 1.5, carrying: false, carryTimer: 0,
            w: 100, h: 50,
            showBubble: false, bubbleTimer: 0, bubble: null,
        });
    }

    drawCycleRickshaw(gfx, x, y) {
        gfx.clear();
        gfx.fillStyle(0x1B5E20, 1);
        gfx.fillRoundedRect(x + 30, y - 45, 65, 35, 5);
        gfx.fillStyle(0x2E7D32, 1);
        gfx.fillTriangle(x + 25, y - 45, x + 100, y - 60, x + 97, y - 45);
        // Wheels
        gfx.fillStyle(0x333333, 1);
        gfx.fillCircle(x + 15, y - 5, 10);
        gfx.fillCircle(x + 85, y - 5, 10);
    }

    // ─── BOSS ───────────────────────────────────────────────
    createBoss() {
        const bossX = this.levelWidth - 1200;

        // Clear area around boss
        this.collectibles.getChildren().forEach(c => {
            if (c.x > bossX - 800) c.destroy();
        });
        this.hazards.getChildren().forEach(h => {
            if (h.x > bossX - 800) h.destroy();
        });

        // Pre-boss power-ups
        const clearStart = bossX - 800;
        this.addSpecificCollectible(clearStart + 100, GROUND_Y - 60, EMOJI.coconut, 'coconut');
        this.addSpecificCollectible(clearStart + 250, GROUND_Y - 60, EMOJI.chai, 'chai');
        this.addSpecificCollectible(clearStart + 400, GROUND_Y - 60, EMOJI.tulsi, 'tulsi');
        this.addSpecificCollectible(clearStart + 550, GROUND_Y - 60, EMOJI.feather, 'feather');

        this.bossWarningX = clearStart + 300;

        // Boss platforms
        for (let bp = 0; bp < 5; bp++) {
            this.addPlatform(bossX - 200 + bp * 250, GROUND_Y - PLATFORM_H, Math.floor(Math.random() * 3));
        }

        // Boss monkey
        this.boss = {
            x: bossX,
            y: GROUND_Y - 200,
            w: 160, h: 200,
            hp: 5, maxHp: 5,
            phase: 0,
            active: true,
            stunTimer: 0,
            throwTimer: 0,
            moveDir: 1,
            moveSpeed: 120,
            baseX: bossX,
            patrolRange: 400,
            defeated: false,
            defeatTimer: 0,
        };

        // Boss visual (Graphics)
        this.bossGfx = this.add.graphics().setDepth(10);
        // Boss HP bar
        this.bossHpBg = this.add.graphics().setDepth(11);
        this.bossHpFill = this.add.graphics().setDepth(11);
        this.bossLabel = this.add.text(0, 0, 'MONKEY RAJA', {
            fontSize: '10px', fontFamily: 'Poppins', fontStyle: 'bold', color: '#FFFFFF'
        }).setOrigin(0.5).setDepth(11);

        // Warning zone
        this.bossWarningText = this.add.text(this.bossWarningX, GROUND_Y - 240, '', {
            fontSize: '16px', fontFamily: 'Poppins', fontStyle: 'bold', color: '#FF1744',
            align: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 15, y: 10 }
        }).setOrigin(0.5).setDepth(12);
        this.bossWarningText.setText('⚠ WARNING ⚠\nMONKEY RAJA AHEAD!\nStomp his head 5 times');
    }

    addSpecificCollectible(x, y, emoji, subtype) {
        const key = 'sc_' + emoji + '_' + x;
        makeEmojiTexture(this, key, emoji, 80);
        const sprite = this.collectibles.create(x, y, key);
        sprite.setDisplaySize(80, 80);
        sprite.body.setSize(50, 50);
        sprite.setData('subtype', subtype);
        sprite.setData('emoji', emoji);
        sprite.setDepth(5);
        this.tweens.add({
            targets: sprite, y: y - 10, duration: 1200,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
    }

    updateBoss(dt) {
        if (!this.boss || !this.boss.active) return;
        const b = this.boss;

        if (b.defeated) {
            b.defeatTimer += dt;
            b.y += 60 * dt / 1000;
            if (b.defeatTimer > 2000) {
                b.active = false;
                this.bossDefeated = true;
            }
            this.drawBoss();
            return;
        }

        if (b.stunTimer > 0) {
            b.stunTimer -= dt;
            this.drawBoss();
            return;
        }

        // Movement
        const speed = b.moveSpeed + b.phase * 60;
        b.x += b.moveDir * speed * dt / 1000;
        if (b.x > b.baseX + b.patrolRange) b.moveDir = -1;
        if (b.x < b.baseX - b.patrolRange) b.moveDir = 1;

        // Throw bananas
        const throwRate = Math.max(500, 1300 - b.phase * 300);
        b.throwTimer += dt;
        if (b.throwTimer >= throwRate) {
            b.throwTimer = 0;
            const dir = this.player.x < b.x ? -1 : 1;
            const count = 1 + b.phase;
            for (let i = 0; i < count; i++) {
                const spread = (i - (count - 1) / 2) * 120;
                this.spawnBanana(b.x + 80, b.y + 60, (300 + Math.random() * 180) * dir + spread, -360 - Math.random() * 180);
            }
            AudioManager.rickshawHorn();
        }

        // Boss-player collision
        const pL = this.player.x - PLAYER_W / 2 + 10;
        const pR = this.player.x + PLAYER_W / 2 - 10;
        const pT = this.player.y - PLAYER_H;
        const pB = this.player.y;
        const bL = b.x + 20; const bR = b.x + b.w - 20;
        const bT = b.y; const bB = b.y + b.h;

        if (pL < bR && pR > bL && pT < bB && pB > bT) {
            if (this.player.body.velocity.y > 0 && pB < bT + 50) {
                this.hitBoss();
                this.player.body.setVelocityY(-1080);
                this.pState.invulnTimer = 500;
            } else if (this.pState.isDashing && this.pState.invulnTimer > 0) {
                this.hitBoss();
                this.player.body.setVelocityX(this.pState.facingRight ? -900 : 900);
            } else if (this.pState.invulnTimer <= 0) {
                G.lives--;
                this.createHitVFX(this.player.x, this.player.y - PLAYER_H / 2);
                AudioManager.hit();
                this.player.body.setVelocityY(-720);
                this.player.body.setVelocityX(this.player.x < b.x + 80 ? -900 : 900);
                this.pState.invulnTimer = 1000;
                this.updateHUD();
                if (G.lives <= 0) this.endGame(false);
            }
        }

        this.drawBoss();
    }

    hitBoss() {
        const b = this.boss;
        if (b.stunTimer > 0 || b.defeated) return;
        b.hp--;
        b.stunTimer = 1500;
        b.phase = b.maxHp - b.hp;
        this.cameras.main.shake(150, 0.02);
        this.createSparkleVFX(b.x + 80, b.y + 100, 0xFFD700, 20);
        AudioManager.stomp();

        if (b.hp <= 0) {
            b.defeated = true;
            b.defeatTimer = 0;
            this.cameras.main.flash(300, 255, 215, 0);
            G.score += 1000;
            this.addScorePopup(b.x + 80, b.y, '+1000 BOSS DEFEATED!', '#FFD700');
            AudioManager.levelComplete();
        } else {
            this.addScorePopup(b.x + 80, b.y, `HIT! ${b.hp} LEFT`, '#FF4081');
        }
    }

    drawBoss() {
        const b = this.boss;
        if (!b || !b.active) {
            if (this.bossGfx) this.bossGfx.clear();
            if (this.bossHpBg) this.bossHpBg.clear();
            if (this.bossHpFill) this.bossHpFill.clear();
            if (this.bossLabel) this.bossLabel.setVisible(false);
            return;
        }

        this.bossGfx.clear();
        const cx = b.x + 80;
        const cy = b.y + b.h;

        // Body
        this.bossGfx.fillStyle(0x5D4037, b.defeated ? Math.max(0, 1 - b.defeatTimer / 2000) : 1);
        this.bossGfx.fillEllipse(cx, cy - 120, 110, 130);
        // Belly
        this.bossGfx.fillStyle(0xD7CCC8, b.defeated ? Math.max(0, 1 - b.defeatTimer / 2000) : 1);
        this.bossGfx.fillEllipse(cx, cy - 110, 76, 90);
        // Eyes
        this.bossGfx.fillStyle(0xFFFFFF, 1);
        this.bossGfx.fillCircle(cx - 18, cy - 125, 7);
        this.bossGfx.fillCircle(cx + 18, cy - 125, 7);
        this.bossGfx.fillStyle(b.phase >= 2 ? 0xE53935 : 0x1A1A1A, 1);
        this.bossGfx.fillCircle(cx - 18, cy - 124, 4);
        this.bossGfx.fillCircle(cx + 18, cy - 124, 4);
        // Crown
        this.bossGfx.fillStyle(0xFFD700, 1);
        this.bossGfx.fillTriangle(cx - 20, cy - 175, cx, cy - 195, cx + 20, cy - 175);
        // Arms
        const armSwing = Math.sin(this.time.now / 200) * 0.3;
        this.bossGfx.fillStyle(0x5D4037, 1);
        this.bossGfx.fillRect(cx - 55, cy - 60, 18, 50);
        this.bossGfx.fillRect(cx + 37, cy - 60, 18, 50);

        // HP bar
        this.bossHpBg.clear();
        this.bossHpFill.clear();
        this.bossHpBg.fillStyle(0x333333, 1);
        this.bossHpBg.fillRect(b.x + 30, b.y - 30, 100, 12);
        this.bossHpFill.fillStyle(b.hp > 1 ? 0x4CAF50 : 0xE53935, 1);
        this.bossHpFill.fillRect(b.x + 31, b.y - 29, (b.hp / b.maxHp) * 98, 10);
        this.bossLabel.setPosition(b.x + 80, b.y - 44);
        this.bossLabel.setVisible(true);
    }

    spawnBanana(x, y, vx, vy) {
        makeEmojiTexture(this, 'banana', EMOJI.banana, 50);
        const b = this.projectiles.create(x, y, 'banana');
        b.setDisplaySize(50, 50);
        b.body.setVelocity(vx, vy);
        b.body.setAllowGravity(true);
        // Original banana gravity = 0.15/frame² = 540 px/sec². World gravity = 2880.
        // Per-body gravity adjusts the world gravity for this body.
        b.body.setGravityY(540 - 2880);
        b.setDepth(8);
        // Auto-destroy when below screen
        this.time.delayedCall(4000, () => { if (b.active) b.destroy(); });
    }

    // ─── PLAYER ─────────────────────────────────────────────
    createPlayer() {
        // Generate player texture
        const pCanvas = document.createElement('canvas');
        pCanvas.width = 70; pCanvas.height = 100;
        const pCtx = pCanvas.getContext('2d', { willReadFrequently: true });
        this.drawPlayerToCanvas(pCtx, 35, 100, G.character, 'idle', true);
        const texKey = 'player_' + G.character;
        if (this.textures.exists(texKey)) this.textures.remove(texKey);
        this.textures.addCanvas(texKey, pCanvas);

        this.player = this.physics.add.sprite(100, GROUND_Y - PLAYER_H, texKey);
        this.player.setDisplaySize(PLAYER_W, PLAYER_H);
        this.player.body.setSize(40, 90);
        this.player.body.setOffset(15, 5);
        this.player.setDepth(10);
        this.player.body.setCollideWorldBounds(false);
        this.player.body.setMaxVelocityY(2000);

        // Player graphics overlay for dynamic drawing
        this.playerGfx = this.add.graphics().setDepth(10);

        // Store canvas ref for dynamic updates
        this.playerCanvas = pCanvas;
        this.playerCtx = pCtx;
    }

    drawPlayerToCanvas(ctx, cx, baseY, character, state, facingRight) {
        ctx.clearRect(0, 0, 70, 100);
        ctx.save();
        ctx.translate(cx, baseY);
        if (!facingRight) ctx.scale(-1, 1);

        const isRaju = character === 'raju';
        const skinColor = '#D2956A';
        const headY = -75;
        const bodyY = -45;

        // Legs
        ctx.fillStyle = isRaju ? '#1565C0' : '#7B1FA2';
        ctx.fillRect(-7, -15, 8, 25);
        ctx.fillRect(1, -15, 8, 25);
        // Shoes
        ctx.fillStyle = '#8D6E63';
        ctx.beginPath();
        ctx.ellipse(-3, 12, 7, 4, 0, 0, Math.PI * 2);
        ctx.ellipse(5, 12, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        if (isRaju) {
            ctx.fillStyle = '#FF6F00';
            ctx.beginPath();
            ctx.roundRect(-14, bodyY, 28, 32, 4);
            ctx.fill();
            // Collar detail
            ctx.fillStyle = '#FFB300';
            ctx.beginPath();
            ctx.moveTo(-5, bodyY + 2);
            ctx.lineTo(0, bodyY + 14);
            ctx.lineTo(5, bodyY + 2);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillStyle = '#E91E63';
            ctx.beginPath();
            ctx.moveTo(-14, bodyY + 32);
            ctx.lineTo(-12, bodyY);
            ctx.quadraticCurveTo(0, bodyY - 3, 12, bodyY);
            ctx.lineTo(14, bodyY + 32);
            ctx.closePath();
            ctx.fill();
            // Dupatta
            ctx.strokeStyle = '#FF80AB';
            ctx.lineWidth = 2.5;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(10, bodyY + 2);
            ctx.quadraticCurveTo(22, bodyY + 12, 18, bodyY + 35);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Arms
        ctx.fillStyle = skinColor;
        ctx.fillRect(-17, bodyY + 6, 6, 20);
        ctx.fillRect(11, bodyY + 6, 6, 20);
        // Hands
        ctx.beginPath();
        ctx.arc(-14, bodyY + 28, 5, 0, Math.PI * 2);
        ctx.arc(14, bodyY + 28, 5, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(0, headY, 18, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(-7, headY + 1, 5, 6, 0, 0, Math.PI * 2);
        ctx.ellipse(7, headY + 1, 5, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1A1A1A';
        ctx.beginPath();
        ctx.arc(-7, headY + 2, 3, 0, Math.PI * 2);
        ctx.arc(7, headY + 2, 3, 0, Math.PI * 2);
        ctx.fill();
        // Eye shine
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-6, headY + 1, 1.2, 0, Math.PI * 2);
        ctx.arc(8, headY + 1, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        ctx.fillStyle = '#E65100';
        ctx.beginPath();
        ctx.arc(0, headY + 9, 2, 0, Math.PI, false);
        ctx.fill();

        // Hair
        ctx.fillStyle = '#1A1A2E';
        ctx.beginPath();
        ctx.ellipse(0, headY - 10, 18, 12, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-17, headY - 8, 34, 6);

        // Character-specific details
        if (isRaju) {
            // Bindi
            ctx.fillStyle = '#E53935';
            ctx.beginPath();
            ctx.arc(0, headY - 6, 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Bindi
            ctx.fillStyle = '#E53935';
            ctx.beginPath();
            ctx.arc(0, headY - 5, 2.5, 0, Math.PI * 2);
            ctx.fill();
            // Side hair
            ctx.fillStyle = '#1A1A2E';
            ctx.beginPath();
            ctx.ellipse(-15, headY + 4, 4, 16, 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(15, headY + 4, 4, 16, -0.1, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    updatePlayerVisual() {
        const p = this.player;
        const ps = this.pState;

        // Re-draw player canvas for animation states
        this.playerCtx.clearRect(0, 0, 70, 100);
        this.playerCtx.save();
        this.playerCtx.translate(35, 100);
        if (!ps.facingRight) this.playerCtx.scale(-1, 1);

        const isRaju = G.character === 'raju';
        const skinColor = '#D2956A';
        const speed = Math.abs(p.body.velocity.x);
        const walking = speed > 30 && ps.grounded;
        const running = speed > 200 && ps.grounded;
        const jumpPose = !ps.grounded;
        const ctx = this.playerCtx;

        const animSpeed = running ? 0.008 : 0.005;
        ps.animTimer += this.game.loop.delta * (walking ? animSpeed : 0);
        const limbSwing = walking ? Math.sin(ps.animTimer) * 0.5 : 0;
        const bodyBob = walking ? Math.abs(Math.sin(ps.animTimer)) * 2 : 0;
        const bY = -bodyBob;
        const headY = bY - 75;
        const bodyY = bY - 45;

        if (ps.isSliding) {
            ctx.scale(1.15, 0.55);
            ctx.translate(0, 10);
        }

        // Legs
        ctx.fillStyle = isRaju ? '#1565C0' : '#7B1FA2';
        if (jumpPose) {
            ctx.save(); ctx.translate(-7, bY - 15); ctx.rotate(-0.5);
            ctx.fillRect(-4, 0, 8, 25); ctx.restore();
            ctx.save(); ctx.translate(7, bY - 15); ctx.rotate(0.5);
            ctx.fillRect(-4, 0, 8, 25); ctx.restore();
        } else {
            ctx.save(); ctx.translate(-7, bY - 15); ctx.rotate(limbSwing * 0.5);
            ctx.fillRect(-4, 0, 8, 25);
            ctx.fillStyle = '#8D6E63'; ctx.beginPath(); ctx.ellipse(0, 27, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            ctx.save(); ctx.translate(7, bY - 15); ctx.rotate(-limbSwing * 0.5);
            ctx.fillStyle = isRaju ? '#1565C0' : '#7B1FA2'; ctx.fillRect(-4, 0, 8, 25);
            ctx.fillStyle = '#8D6E63'; ctx.beginPath(); ctx.ellipse(0, 27, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        // Body
        if (isRaju) {
            ctx.fillStyle = '#FF6F00';
            ctx.beginPath(); ctx.roundRect(-14, bodyY, 28, 32, 4); ctx.fill();
            ctx.fillStyle = '#FFB300';
            ctx.beginPath(); ctx.moveTo(-5, bodyY + 2); ctx.lineTo(0, bodyY + 14); ctx.lineTo(5, bodyY + 2); ctx.closePath(); ctx.fill();
        } else {
            ctx.fillStyle = '#E91E63';
            ctx.beginPath();
            ctx.moveTo(-14, bodyY + 32); ctx.lineTo(-12, bodyY);
            ctx.quadraticCurveTo(0, bodyY - 3, 12, bodyY); ctx.lineTo(14, bodyY + 32);
            ctx.closePath(); ctx.fill();
        }

        // Arms
        ctx.fillStyle = skinColor;
        if (jumpPose) {
            ctx.save(); ctx.translate(-14, bodyY + 6); ctx.rotate(-1.0);
            ctx.fillRect(-3, 0, 6, 20);
            ctx.beginPath(); ctx.arc(0, 22, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            ctx.save(); ctx.translate(14, bodyY + 6); ctx.rotate(1.0);
            ctx.fillRect(-3, 0, 6, 20);
            ctx.beginPath(); ctx.arc(0, 22, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        } else {
            ctx.save(); ctx.translate(-14, bodyY + 6); ctx.rotate(limbSwing * 0.5);
            ctx.fillRect(-3, 0, 6, 20);
            ctx.beginPath(); ctx.arc(0, 22, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            ctx.save(); ctx.translate(14, bodyY + 6); ctx.rotate(-limbSwing * 0.5);
            ctx.fillStyle = skinColor; ctx.fillRect(-3, 0, 6, 20);
            ctx.beginPath(); ctx.arc(0, 22, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }

        // Head
        ctx.fillStyle = skinColor;
        ctx.beginPath(); ctx.arc(0, headY, 18, 0, Math.PI * 2); ctx.fill();
        // Eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(-7, headY + 1, 5, 6, 0, 0, Math.PI * 2);
        ctx.ellipse(7, headY + 1, 5, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1A1A1A';
        ctx.beginPath();
        ctx.arc(-7, headY + 2, 3, 0, Math.PI * 2); ctx.arc(7, headY + 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-6, headY + 1, 1.2, 0, Math.PI * 2); ctx.arc(8, headY + 1, 1.2, 0, Math.PI * 2);
        ctx.fill();
        // Mouth
        ctx.fillStyle = '#E65100';
        ctx.beginPath(); ctx.arc(0, headY + 9, 2, 0, Math.PI, false); ctx.fill();
        if (walking || running) {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(1, headY + 13, running ? 4 : 2.5, 0, Math.PI, false); ctx.fill();
        }
        // Hair
        ctx.fillStyle = '#1A1A2E';
        ctx.beginPath(); ctx.ellipse(0, headY - 10, 18, 12, 0, Math.PI, Math.PI * 2); ctx.fill();
        ctx.fillRect(-17, headY - 8, 34, 6);
        // Character details
        if (isRaju) {
            ctx.fillStyle = '#E53935';
            ctx.beginPath(); ctx.arc(0, headY - 6, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFEB3B';
            ctx.beginPath(); ctx.arc(0, headY - 6, 1.5, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.fillStyle = '#E53935';
            ctx.beginPath(); ctx.arc(0, headY - 5, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#1A1A2E';
            ctx.beginPath(); ctx.ellipse(-15, headY + 4, 4, 16, 0.1, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(15, headY + 4, 4, 16, -0.1, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();

        // Refresh canvas texture (we drew directly to the texture's source canvas)
        const texKey = 'player_' + G.character;
        const tex = this.textures.get(texKey);
        if (tex && tex.update) {
            tex.update();
        } else if (tex && tex.source && tex.source[0]) {
            tex.source[0].update();
        }
    }

    // ─── PLAYER UPDATE ──────────────────────────────────────
    updatePlayer(dt) {
        const ps = this.pState;
        const p = this.player;
        const dtSec = dt / 1000;
        const speedMult = G.chaiBoostTimer > 0 ? 1.5 : 1;

        // Grounded check
        ps.grounded = p.body.blocked.down || p.body.touching.down;

        // Timers (in ms)
        if (ps.invulnTimer > 0) ps.invulnTimer -= dt;
        if (ps.dashCooldown > 0) ps.dashCooldown -= dt;
        if (G.chaiBoostTimer > 0) G.chaiBoostTimer -= dt;
        if (G.comboTimer > 0) {
            G.comboTimer -= dt;
            if (G.comboTimer <= 0) G.comboCount = 0;
        }
        if (ps.doubleJumpTimer > 0) {
            ps.doubleJumpTimer -= dt;
            if (ps.doubleJumpTimer <= 0) ps.hasDoubleJumpPower = false;
        }
        if (ps.scoreMultTimer > 0) {
            ps.scoreMultTimer -= dt;
            if (ps.scoreMultTimer <= 0) ps.scoreMultiplier = 1;
        }

        // Handle single-press actions
        if (this.jumpJustPressed) {
            this.jumpJustPressed = false;
            this.playerJump();
        }
        if (this.slideJustPressed) {
            this.slideJustPressed = false;
            this.playerStartSlide();
        }
        if (this.dashJustPressed) {
            this.dashJustPressed = false;
            this.playerStartDash();
        }

        // Movement
        const left = this.cursors.left.isDown || this.wasd.A.isDown || this.touchLeft;
        const right = this.cursors.right.isDown || this.wasd.D.isDown || this.touchRight;

        if (ps.isDashing) {
            ps.dashTimer -= dt;
            p.body.setVelocityX(ps.facingRight ? ps.dashSpeed : -ps.dashSpeed);
            // Dash trail VFX - afterimage + particles
            if (Math.random() < 0.5) {
                const trail = this.add.ellipse(
                    p.x + (ps.facingRight ? -15 : 15), p.y,
                    20, PLAYER_H * 0.6, 0xFF9800, 0.4
                ).setDepth(9);
                this.tweens.add({
                    targets: trail,
                    alpha: 0, scaleX: 0.3, scaleY: 0.3,
                    duration: 200,
                    onComplete: () => trail.destroy()
                });
            }
            this.createDustVFX(p.x + (ps.facingRight ? -25 : 25), p.y, 0xFF9800, 2);
            if (ps.dashTimer <= 0) {
                ps.isDashing = false;
                ps.dashCooldown = ps.dashCooldownMax;
            }
        } else if (ps.isSliding) {
            ps.slideTimer -= dt;
            p.body.setVelocityX(p.body.velocity.x * 0.95);
            if (ps.slideTimer <= 0 || !(this.cursors.down.isDown || this.wasd.S.isDown)) {
                ps.isSliding = false;
                p.body.setSize(40, 90);
                p.body.setOffset(15, 5);
            }
        } else {
            if (right) {
                p.body.setVelocityX(ps.speed * speedMult);
                ps.facingRight = true;
            } else if (left) {
                p.body.setVelocityX(-ps.speed * speedMult);
                ps.facingRight = false;
            } else {
                p.body.setVelocityX(p.body.velocity.x * 0.85);
                if (Math.abs(p.body.velocity.x) < 10) p.body.setVelocityX(0);
            }
        }

        // Keep in level bounds
        if (p.x < 30) p.x = 30;
        if (p.x > this.levelWidth - 30) p.x = this.levelWidth - 30;

        // Grounded reset + landing effects
        if (ps.grounded) {
            ps.hasDoubleJumped = false;
            // Just landed
            if (!ps.wasGrounded) {
                ps.scaleX = 1.25;
                ps.scaleY = 0.75;
                this.createDustVFX(p.x, p.y + PLAYER_H / 2, 0x8D6E63, 6);
                // Camera micro-shake on hard landing
                if (p.body.velocity.y > 600) {
                    this.cameras.main.shake(60, 0.003);
                }
            }
        } else {
            // In-air stretch
            if (ps.scaleX === 1 && ps.scaleY === 1) {
                ps.scaleX = 0.9;
                ps.scaleY = 1.1;
            }
        }
        ps.wasGrounded = ps.grounded;

        // Smoothly recover squash/stretch
        ps.scaleX += (1 - ps.scaleX) * 0.15;
        ps.scaleY += (1 - ps.scaleY) * 0.15;
        p.setScale(ps.scaleX, ps.scaleY);

        // Pit fall detection
        let overPit = null;
        for (const pit of this.pits) {
            if (p.x + PLAYER_W / 2 > pit.x + 10 && p.x - PLAYER_W / 2 < pit.x + pit.w - 10) {
                overPit = pit;
                break;
            }
        }

        if (overPit && p.y > GROUND_Y + 120) {
            if (overPit.hasLadder) {
                const penalty = 150;
                G.score = Math.max(0, G.score - penalty);
                this.createSparkleVFX(p.x, GROUND_Y, 0x4CAF50, 8);
                AudioManager.pitFall();
                this.addScorePopup(p.x, GROUND_Y - 80, 'सीढ़ी मिली! -' + penalty, '#4CAF50');
                p.x = overPit.x + overPit.w + 30;
            } else {
                G.lives--;
                G.comboCount = 0;
                this.createHitVFX(p.x, GROUND_Y);
                this.cameras.main.shake(150, 0.015);
                AudioManager.pitFall();
                this.addScorePopup(p.x, GROUND_Y - 80, 'गिर गया!', '#FF1744');
                p.x = overPit.x - 200;
            }
            p.y = GROUND_Y - PLAYER_H;
            p.body.setVelocity(0, 0);
            ps.invulnTimer = 1500;
            this.updateHUD();
            if (G.lives <= 0) this.endGame(false);
        }

        // Kite string grab (for pits that have it)
        if (overPit && overPit.hasKiteString && !ps.grounded && p.body.velocity.y > 0) {
            const swingAngle = Math.sin(this.time.now / 1200 + overPit.kitePhase) * 0.3;
            const anchorY = GROUND_Y - 180;
            const grabX = overPit.x + overPit.w / 2 + Math.sin(swingAngle) * 120;
            const grabY = anchorY + Math.cos(swingAngle) * 120;
            const dist = Phaser.Math.Distance.Between(p.x, p.y, grabX, grabY);
            if (dist < 50) {
                p.body.setVelocityY(-960);
                p.body.setVelocityX(ps.facingRight ? 720 : -720);
                this.createSparkleVFX(grabX, grabY, 0xFF9800, 10);
                AudioManager.doubleJump();
                this.addScorePopup(grabX, grabY - 30, '🪁 Pakda!', '#FF9800');
                G.score += 200;
                this.updateHUD();
            }
        }

        // Invulnerability blinking
        if (ps.invulnTimer > 0) {
            p.setAlpha(Math.floor(ps.invulnTimer / 100) % 2 === 0 ? 0.5 : 1);
        } else {
            p.setAlpha(1);
        }

        // Dust when running
        if (ps.grounded && Math.abs(p.body.velocity.x) > 100 && Math.random() < 0.3) {
            this.createDustVFX(p.x, p.y + PLAYER_H / 2, 0xA0866B, 1);
        }

        // Speed lines when running fast or dashing
        if (Math.abs(p.body.velocity.x) > 350 && Math.random() < 0.4) {
            this.createSpeedLines(p.x, p.y);
        }

        // Puddle splash
        this.puddles.forEach(puddle => {
            if (ps.grounded && !puddle.splashed &&
                p.x + PLAYER_W / 2 > puddle.x && p.x - PLAYER_W / 2 < puddle.x + puddle.w &&
                Math.abs(p.body.velocity.x) > 60) {
                puddle.splashed = true;
                this.createSplashVFX(p.x, GROUND_Y);
                AudioManager.splash();
            }
        });

        // Update collectible glow positions
        this.collectibles.getChildren().forEach(c => {
            const glow = c.getData('glow');
            if (glow) {
                glow.clear();
                glow.fillStyle(0xFFD700, 0.2 + Math.sin(this.time.now / 200) * 0.1);
                glow.fillCircle(c.x, c.y, 25);
            }
        });

        // Update player visual (animated)
        this.updatePlayerVisual();

        // Win check
        if (G.level === 4 && this.boss) {
            if (this.bossDefeated) this.endGame(true);
        } else {
            if (p.x >= this.levelWidth - 200) this.endGame(true);
        }
    }

    playerJump() {
        const ps = this.pState;
        if (ps.isSliding) return;
        if (ps.grounded) {
            this.player.body.setVelocityY(ps.jumpStr);
            ps.grounded = false;
            // Jump squash (compress then spring up)
            ps.scaleX = 0.8;
            ps.scaleY = 1.3;
            this.createDustVFX(this.player.x, this.player.y + PLAYER_H / 2, 0xA0866B, 8);
            AudioManager.jump();
        } else if (ps.hasDoubleJumpPower && !ps.hasDoubleJumped) {
            this.player.body.setVelocityY(ps.jumpStr * 0.85);
            ps.hasDoubleJumped = true;
            ps.scaleX = 0.85;
            ps.scaleY = 1.2;
            this.createSparkleVFX(this.player.x, this.player.y - PLAYER_H / 2, 0xFF9800, 12);
            AudioManager.doubleJump();
        }
    }

    playerStartSlide() {
        const ps = this.pState;
        if (!ps.grounded || ps.isSliding || ps.isDashing) return;
        ps.isSliding = true;
        ps.slideTimer = 500;
        this.player.body.setSize(40, 50);
        this.player.body.setOffset(15, 45);
        AudioManager.slide();
    }

    playerStartDash() {
        const ps = this.pState;
        if (ps.dashCooldown > 0 || ps.isDashing || ps.isSliding) return;
        ps.isDashing = true;
        ps.dashTimer = 200;
        ps.invulnTimer = Math.max(ps.invulnTimer, 200);
        AudioManager.dash();
    }

    // ─── ENTITY AI ──────────────────────────────────────────
    updateEntities(dt) {
        const playerX = this.player.x;

        this.hazards.getChildren().forEach(h => {
            if (!h.active) return;
            const type = h.getData('type');
            const subtype = h.getData('subtype');
            const origX = h.getData('origX');
            const patrolDist = h.getData('patrolDist') || 0;

            // Cow patrol
            if (type === EMOJI.cow) {
                if (h.x > origX + patrolDist || h.x < origX - patrolDist) {
                    h.body.setVelocityX(-h.body.velocity.x);
                }
                h.setFlipX(h.body.velocity.x > 0);
            }

            // Dog chase
            if (type === EMOJI.dog) {
                const state = h.getData('state');
                if (state === 'walk') {
                    if (h.x > origX + patrolDist || h.x < origX - patrolDist) {
                        h.body.setVelocityX(-h.body.velocity.x);
                    }
                    if (Math.abs(h.x - playerX) < 300) {
                        h.setData('state', 'chase');
                    }
                } else if (state === 'chase') {
                    h.body.setVelocityX(playerX > h.x ? 180 : -180);
                    if (Math.abs(h.x - playerX) > 400) {
                        h.setData('state', 'walk');
                        h.body.setVelocityX(h.getData('vx'));
                    }
                }
                h.setFlipX(h.body.velocity.x > 0);
            }

            // Monkey throws
            if (type === EMOJI.monkey) {
                const dist = h.x - playerX;
                if (Math.abs(dist) < 1200) {
                    let timer = h.getData('throwTimer') + dt;
                    if (timer > 2500) {
                        timer = 0;
                        const dir = dist > 0 ? -1 : 1;
                        this.spawnBanana(h.x, h.y + 40, (240 + Math.random() * 120) * dir, -300 - Math.random() * 180);
                    }
                    h.setData('throwTimer', timer);
                }
            }

            // Rickshaw horn
            if (subtype === 'auto') {
                let hornT = h.getData('hornTimer') + dt;
                if (hornT > 3300 && Math.abs(h.x - playerX) < 400) {
                    AudioManager.rickshawHorn();
                    hornT = 0;
                }
                h.setData('hornTimer', hornT);
            }
        });

        // Pigeons
        this.pigeons.forEach(pg => {
            if (!pg.flying && Math.abs(pg.sprite.x - playerX) < 200) {
                pg.flying = true;
                pg.vy = -240 - Math.random() * 180;
                pg.vx = (pg.sprite.x < playerX) ? -240 : 240;
            }
            if (pg.flying) {
                pg.sprite.x += pg.vx * dt / 1000;
                pg.sprite.y += pg.vy * dt / 1000;
                pg.vy -= 9 * dt / 1000;
            }
        });

        // NPCs
        this.npcs.forEach(npc => {
            if (npc.type === 'chaiWallah') {
                const near = Math.abs(playerX - npc.x) < 80;
                if (near && !npc.gaveChai) {
                    npc.nearTimer += dt;
                    if (npc.nearTimer > 1000) {
                        npc.gaveChai = true;
                        G.chaiBoostTimer = 5000;
                        this.createSparkleVFX(npc.x + 30, GROUND_Y - 60, 0xFF9800, 12);
                        AudioManager.powerUp();
                        this.addScorePopup(npc.x, GROUND_Y - 80, 'FREE CHAI! ☕', '#FF9800');
                        this.updateHUD();
                    }
                } else if (!near) {
                    npc.nearTimer = 0;
                }
            }

            if (npc.type === 'cycleRickshaw') {
                npc.x += npc.speed * dt / 1000 * 60;
                // Update visuals
                npc.gfx.clear();
                this.drawCycleRickshaw(npc.gfx, npc.x, GROUND_Y);
                npc.cyclist.setPosition(npc.x + 10, GROUND_Y - 22);

                // Player hop on
                if (!npc.carrying && this.pState.grounded &&
                    this.player.y >= GROUND_Y - npc.h - PLAYER_H &&
                    this.player.y <= GROUND_Y - npc.h - PLAYER_H + 20 &&
                    this.player.x + PLAYER_W / 2 > npc.x + 10 &&
                    this.player.x - PLAYER_W / 2 < npc.x + npc.w - 10) {
                    npc.carrying = true;
                    npc.carryTimer = 3000;
                    npc.speed = 6;
                    AudioManager.collect();
                    this.addScorePopup(npc.x, GROUND_Y - 100, 'Baitho baitho!', '#4CAF50');
                }
                if (npc.carrying) {
                    npc.carryTimer -= dt;
                    this.player.x = npc.x + 40;
                    this.player.y = GROUND_Y - npc.h - PLAYER_H / 2 + 5;
                    this.player.body.setVelocity(0, 0);
                    if (npc.carryTimer <= 0) {
                        npc.carrying = false;
                        npc.speed = 1.5;
                    }
                }
            }
        });
    }

    // ─── COLLISIONS ─────────────────────────────────────────
    onCollect(player, item) {
        const subtype = item.getData('subtype');
        let points = 100;
        let feedbackText = '';

        if (subtype === 'chai') {
            G.chaiBoostTimer = 3000;
            AudioManager.powerUp();
            this.createSparkleVFX(item.x, item.y, 0xFF9800, 15);
            this.cameras.main.flash(150, 255, 152, 0, true);
            points = 200;
            this.addScorePopup(item.x, item.y, '+200 CHAI BOOST!', '#FF9800');
            feedbackText = 'Kadak!';
        } else if (subtype === 'diya') {
            points = 300;
            AudioManager.powerUp();
            this.createSparkleVFX(item.x, item.y, 0xFFD700, 20);
            this.addScorePopup(item.x, item.y, '+300 DIYA!', '#FFD700');
        } else if (subtype === 'jalebi') {
            points = 150;
            AudioManager.collect();
            this.createCollectVFX(item.x, item.y);
            this.addScorePopup(item.x, item.y, '+150', '#FFA000');
            feedbackText = 'Mitha!';
        } else if (subtype === 'paan') {
            points = 75;
            G.chaiBoostTimer = Math.max(G.chaiBoostTimer, 2000);
            AudioManager.powerUp();
            this.createSparkleVFX(item.x, item.y, 0x00E676, 10);
            this.addScorePopup(item.x, item.y, 'SPEED BOOST!', '#00E676');
        } else if (subtype === 'tulsi') {
            points = 100;
            this.pState.invulnTimer = Math.max(this.pState.invulnTimer, 3000);
            AudioManager.powerUp();
            this.createSparkleVFX(item.x, item.y, 0x4CAF50, 12);
            this.addScorePopup(item.x, item.y, 'SHIELD!', '#4CAF50');
        } else if (subtype === 'mango') {
            points = 50;
            this.pState.scoreMultiplier = 2;
            this.pState.scoreMultTimer = 5000;
            AudioManager.powerUp();
            this.createSparkleVFX(item.x, item.y, 0xFFC107, 15);
            this.addScorePopup(item.x, item.y, '2x SCORE!', '#FFC107');
        } else if (subtype === 'coconut') {
            points = 50;
            G.lives = Math.min(G.lives + 1, 9);
            AudioManager.powerUp();
            this.createSparkleVFX(item.x, item.y, 0x8D6E63, 12);
            this.addScorePopup(item.x, item.y, '+1 LIFE!', '#8D6E63');
        } else if (subtype === 'feather') {
            points = 50;
            this.pState.hasDoubleJumpPower = true;
            this.pState.doubleJumpTimer = 10000;
            AudioManager.powerUp();
            this.createSparkleVFX(item.x, item.y, 0xFF9800, 15);
            this.addScorePopup(item.x, item.y, 'DOUBLE JUMP!', '#FF9800');
        } else if (subtype === 'wire_fruit') {
            points = item.getData('points') || 250;
            AudioManager.collect();
            this.createCollectVFX(item.x, item.y);
            this.addScorePopup(item.x, item.y, `+${points}`, '#FFD700');
        } else {
            AudioManager.collect();
            this.createCollectVFX(item.x, item.y);
            this.addScorePopup(item.x, item.y, `+${points}`, '#FFD700');
            if (Math.random() < 0.2) feedbackText = ['Mast!', 'Gazab!', 'Crispy!'][Math.floor(Math.random() * 3)];
        }

        const finalPoints = Math.floor(points * this.pState.scoreMultiplier);
        G.score += finalPoints;
        if (feedbackText && Math.random() < 0.3) {
            this.addScorePopup(item.x, item.y - 40, feedbackText, '#FFD700');
        }

        // Power-up: brief time-slow effect for big items
        if (subtype !== 'food' && subtype !== 'wire_fruit') {
            this.cameras.main.zoomTo(1.02, 100, 'Sine.easeOut', true);
            this.time.delayedCall(100, () => this.cameras.main.zoomTo(1, 150, 'Sine.easeIn', true));
        }

        // Destroy glow
        const glow = item.getData('glow');
        if (glow) glow.destroy();
        item.destroy();
        this.updateHUD();
    }

    onHazardContact(player, hazard) {
        if (!hazard.active) return;
        const ps = this.pState;

        // Dash through
        if (ps.invulnTimer > 0 && ps.isDashing) {
            this.createSparkleVFX(hazard.x, hazard.y, 0xFF9800, 15);
            AudioManager.stomp();
            G.score += 75;
            this.addScorePopup(hazard.x, hazard.y, '+75 DASH!', '#FF9800');
            hazard.destroy();
            this.updateHUD();
            return;
        }

        const type = hazard.getData('type');
        // Stomp
        if ((type === EMOJI.rickshaw || type === EMOJI.cow) &&
            player.body.velocity.y > 0 && player.body.bottom < hazard.body.top + 40) {
            player.body.setVelocityY(-840);
            this.pState.scaleX = 1.3;
            this.pState.scaleY = 0.7;
            this.createSparkleVFX(hazard.x, hazard.y, 0xFF4081, 20);
            this.cameras.main.shake(80, 0.008);
            AudioManager.stomp();
            G.comboCount++;
            G.comboTimer = 2000;
            const bonus = 50 * G.comboCount;
            G.score += bonus;
            this.addScorePopup(hazard.x, hazard.y, `+${bonus} x${G.comboCount}`, '#FF4081');
            hazard.destroy();
            this.updateHUD();
            return;
        }

        // Take damage
        if (ps.invulnTimer <= 0) {
            G.lives--;
            G.comboCount = 0;
            this.createHitVFX(player.x, player.y - PLAYER_H / 2);
            AudioManager.hit();
            player.body.setVelocityY(-600);
            player.body.setVelocityX(-900);
            ps.invulnTimer = 1000;
            hazard.destroy();
            this.updateHUD();
            if (G.lives <= 0) this.endGame(false);
        }
    }

    onProjectileHit(player, proj) {
        if (this.pState.invulnTimer > 0) {
            this.createSparkleVFX(proj.x, proj.y, 0xFF9800, 5);
            proj.destroy();
            return;
        }
        G.lives--;
        G.comboCount = 0;
        this.createHitVFX(player.x, player.y - PLAYER_H / 2);
        AudioManager.hit();
        player.body.setVelocityY(-360);
        player.body.setVelocityX(-600);
        this.pState.invulnTimer = 1000;
        proj.destroy();
        this.updateHUD();
        if (G.lives <= 0) this.endGame(false);
    }

    // ─── VFX ────────────────────────────────────────────────
    createDustVFX(x, y, color, count) {
        const emitter = this.add.particles(x, y, 'particle', {
            speed: { min: 30, max: 120 },
            angle: { min: 200, max: 340 },
            lifespan: 350,
            scale: { start: 0.8, end: 0 },
            tint: color || 0xA0866B,
            gravityY: 100,
            emitting: false,
        });
        emitter.explode(count);
        this.time.delayedCall(500, () => emitter.destroy());
    }

    createSparkleVFX(x, y, color, count) {
        const emitter = this.add.particles(x, y, 'particle', {
            speed: { min: 60, max: 250 },
            lifespan: 500,
            scale: { start: 1.2, end: 0 },
            tint: color,
            emitting: false,
        });
        emitter.explode(count);
        this.time.delayedCall(600, () => emitter.destroy());
    }

    createCollectVFX(x, y) {
        // Burst of gold sparkles
        this.createSparkleVFX(x, y, 0xFFD700, 10);
        // Expanding ring effect
        const ring = this.add.circle(x, y, 5, 0xFFD700, 0.5).setDepth(50);
        this.tweens.add({
            targets: ring,
            radius: 40,
            alpha: 0,
            duration: 300,
            ease: 'Cubic.Out',
            onComplete: () => ring.destroy()
        });
    }

    createHitVFX(x, y) {
        this.createSparkleVFX(x, y, 0xFF1744, 18);
        this.cameras.main.shake(200, 0.02);
        this.cameras.main.flash(150, 255, 0, 0, true);
    }

    createSplashVFX(x, y) {
        const emitter = this.add.particles(x, y, 'particle', {
            speed: { min: 40, max: 180 },
            angle: { min: 220, max: 320 },
            lifespan: 400,
            scale: { start: 0.8, end: 0 },
            tint: 0x4FC3F7,
            gravityY: 200,
            emitting: false,
        });
        emitter.explode(12);
        this.time.delayedCall(500, () => emitter.destroy());
    }

    createSpeedLines(x, y) {
        for (let i = 0; i < 2; i++) {
            const line = this.add.rectangle(
                x - 20, y + Phaser.Math.Between(-30, 30),
                Phaser.Math.Between(15, 30), 2,
                0xFFEB3B, 0.6
            ).setDepth(9);
            this.tweens.add({
                targets: line,
                x: x - 80,
                alpha: 0,
                duration: 200,
                onComplete: () => line.destroy()
            });
        }
    }

    addScorePopup(x, y, text, color) {
        const isCombo = G.comboCount > 1;
        const fontSize = isCombo ? Math.min(36, 24 + G.comboCount * 3) : 24;
        const popup = this.add.text(x, y, text, {
            fontSize: fontSize + 'px', fontFamily: 'Poppins', fontStyle: 'bold',
            color: color, stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(50).setScale(1.4);

        this.tweens.add({
            targets: popup,
            y: y - 70,
            alpha: 0,
            scaleX: 0.8,
            scaleY: 0.8,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => popup.destroy()
        });
    }

    // ─── HUD ────────────────────────────────────────────────
    showHUD() {
        document.getElementById('gameHUD').classList.remove('hidden');
        document.getElementById('abilityBar').classList.remove('hidden');
        this.updateHUD();
    }

    updateHUD() {
        document.getElementById('scoreDisplay').innerText = G.score;
        document.getElementById('livesDisplay').innerText = G.lives;
        document.getElementById('distDisplay').innerText = Math.floor(this.player.x / 10);

        const dashEl = document.getElementById('dashCooldownOverlay');
        if (dashEl) {
            const pct = Math.max(0, this.pState.dashCooldown / this.pState.dashCooldownMax);
            dashEl.style.height = (pct * 100) + '%';
        }

        const boostBar = document.getElementById('chaiBoostBar');
        if (boostBar) {
            if (G.chaiBoostTimer > 0) {
                boostBar.classList.remove('hidden');
                document.getElementById('chaiBoostFill').style.width = Math.min(100, G.chaiBoostTimer / 5000 * 100) + '%';
            } else {
                boostBar.classList.add('hidden');
            }
        }

        const djIcon = document.getElementById('doubleJumpIcon');
        if (djIcon) djIcon.style.opacity = this.pState.hasDoubleJumpPower ? '1' : '0.3';

        const multBar = document.getElementById('scoreMultBar');
        if (multBar) {
            if (this.pState.scoreMultiplier > 1) multBar.classList.remove('hidden');
            else multBar.classList.add('hidden');
        }
    }

    // ─── FINISH LINE ────────────────────────────────────────
    drawFinishLine() {
        if (!this.finishGfx) {
            this.finishGfx = this.add.graphics().setDepth(3);
        }
        const fx = this.levelWidth - 10;
        const t = this.time.now / 500;
        const alpha = 0.3 + Math.sin(t) * 0.15;

        this.finishGfx.clear();
        this.finishGfx.fillStyle(0x4CAF50, alpha);
        this.finishGfx.fillRect(fx - 10, 0, 32, GAME_H);
        this.finishGfx.fillStyle(0x4CAF50, 1);
        this.finishGfx.fillRect(fx, 0, 12, GAME_H);

        if (!this.finishText) {
            this.finishText = this.add.text(fx + 60, GROUND_Y - 150, '🏁 FINISH', {
                fontSize: '36px', fontFamily: 'Poppins', fontStyle: 'bold',
                color: '#FFFFFF', stroke: '#2E7D32', strokeThickness: 3
            }).setOrigin(0.5).setDepth(4);
        }
    }

    // ─── TOUCH CONTROLS ─────────────────────────────────────
    bindTouchControls() {
        const bind = (id, action) => {
            const el = document.getElementById(id);
            if (!el) return;
            const onDown = (e) => {
                e.preventDefault();
                if (action === 'left') this.touchLeft = true;
                if (action === 'right') this.touchRight = true;
                if (action === 'jump') this.jumpJustPressed = true;
                if (action === 'slide') this.slideJustPressed = true;
                if (action === 'dash') this.dashJustPressed = true;
            };
            const onUp = (e) => {
                e.preventDefault();
                if (action === 'left') this.touchLeft = false;
                if (action === 'right') this.touchRight = false;
            };
            el.addEventListener('touchstart', onDown);
            el.addEventListener('touchend', onUp);
            el.addEventListener('mousedown', onDown);
            el.addEventListener('mouseup', onUp);
        };
        this.touchLeft = false;
        this.touchRight = false;
        bind('leftBtn', 'left');
        bind('rightBtn', 'right');
        bind('jumpBtn', 'jump');
        bind('slideBtn', 'slide');
        bind('dashBtn', 'dash');
    }

    // ─── GAME END ───────────────────────────────────────────
    endGame(win) {
        if (this._ended) return;
        this._ended = true;

        AudioManager.stopMusic();
        document.getElementById('gameHUD').classList.add('hidden');
        document.getElementById('abilityBar').classList.add('hidden');

        if (win) {
            G.totalDist += Math.floor(this.player.x / 10);
            AudioManager.levelComplete();
            this.cameras.main.flash(300, 255, 215, 0);

            if (G.level === 4) {
                // Final victory
                saveHighScore(G.score + 1000);
                document.getElementById('finalTotalDist').innerText = G.totalDist + 'm';
                document.getElementById('finalTotalScore').innerText = G.score + 1000;
                document.getElementById('finalScreen').classList.remove('hidden');
            } else {
                document.getElementById('winScreen').classList.remove('hidden');
            }
        } else {
            document.getElementById('gameOverScreen').classList.remove('hidden');
            document.getElementById('failScore').innerText = Math.floor(this.player.x / 10) + 'm';
            saveHighScore(G.score);
            AudioManager.gameOver();
            this.cameras.main.shake(200, 0.02);
        }

        this.scene.pause();
    }

    // ─── KITE STRING VISUAL ─────────────────────────────────
    drawKiteStrings() {
        if (!this.kiteStringGfx) {
            this.kiteStringGfx = this.add.graphics().setDepth(7);
        }
        this.kiteStringGfx.clear();

        this.pits.forEach(pit => {
            if (!pit.hasKiteString) return;
            const ksX = pit.x + pit.w / 2;
            const swingAngle = Math.sin(this.time.now / 1200 + pit.kitePhase) * 0.3;
            const anchorY = GROUND_Y - 180;
            const endX = ksX + Math.sin(swingAngle) * 120;
            const endY = anchorY + Math.cos(swingAngle) * 120;

            // Kite at top
            this.kiteStringGfx.fillStyle(0xFF9800, 1);
            this.kiteStringGfx.fillTriangle(ksX - 10, anchorY - 10, ksX + 10, anchorY - 10, ksX, anchorY - 30);

            // String
            this.kiteStringGfx.lineStyle(2, 0xFFFFFF, 0.8);
            this.kiteStringGfx.lineBetween(ksX, anchorY, endX, endY);

            // Grab point
            const glowAlpha = 0.3 + Math.sin(this.time.now / 300) * 0.2;
            this.kiteStringGfx.fillStyle(0xFF9800, glowAlpha);
            this.kiteStringGfx.fillCircle(endX, endY, 12);
            this.kiteStringGfx.fillStyle(0xFF9800, 1);
            this.kiteStringGfx.fillCircle(endX, endY, 6);
        });
    }

    // ─── MAIN UPDATE ────────────────────────────────────────
    update(time, delta) {
        this.updatePlayer(delta);
        this.updateEntities(delta);
        this.updateBoss(delta);
        this.drawDynamicBackground();
        this.drawKiteStrings();

        // Finish line visual
        if (G.level < 4 || (G.level === 4 && this.bossDefeated)) {
            this.drawFinishLine();
        }

        // Boss warning
        if (G.level === 4 && this.bossWarningText && !this.bossDefeated) {
            const wdx = this.bossWarningX - this.cameras.main.scrollX;
            if (wdx < GAME_W * 0.7 && !this.bossWarningShown) {
                this.bossWarningShown = true;
                this.cameras.main.flash(150, 255, 23, 68, true);
            }
        }

        // Chai boost tint overlay (drawn on camera, auto-fades)
        if (!this.chaiTintGfx) {
            this.chaiTintGfx = this.add.graphics().setScrollFactor(0).setDepth(99);
        }
        this.chaiTintGfx.clear();
        if (G.chaiBoostTimer > 0) {
            this.chaiTintGfx.fillStyle(0xFF9800, 0.04);
            this.chaiTintGfx.fillRect(0, 0, GAME_W, GAME_H);
        }
    }
}

// ─── LEADERBOARD & RATING ───────────────────────────────────
function saveHighScore(score) {
    const KEY = 'cch_scores_v2';
    let scores = JSON.parse(localStorage.getItem(KEY)) || [];
    const now = new Date();
    const recent = scores.find(s => s.name === G.playerName && s.score === score && (now - new Date(s.date)) < 5000);
    if (recent) return;
    scores.push({ name: G.playerName, score, date: now.toISOString() });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 10);
    localStorage.setItem(KEY, JSON.stringify(scores));
    updateLeaderboardUI(scores);
}

function updateLeaderboardUI(scores) {
    const rows = scores.map((s, i) => `
        <tr class="border-b border-white/5">
            <td class="py-1 text-yellow-500/80">${i + 1}.</td>
            <td class="py-1 font-bold text-white/90 truncate max-w-[120px]">${s.name}</td>
            <td class="py-1 text-right text-yellow-400">${s.score}</td>
        </tr>
    `).join('');
    const failBody = document.getElementById('leaderboardBodyFail');
    const winBody = document.getElementById('leaderboardBodyWin');
    if (failBody) failBody.innerHTML = rows;
    if (winBody) winBody.innerHTML = rows;
}

function setupRatingUI() {
    const handleRate = (e) => {
        if (e.target.tagName === 'SPAN') {
            const val = e.target.getAttribute('data-val');
            const parent = e.target.parentElement;
            Array.from(parent.children).forEach((child, idx) => {
                child.style.opacity = (idx < val) ? '1' : '0.3';
                child.style.transform = (idx < val) ? 'scale(1.2)' : 'scale(1)';
            });
            localStorage.setItem('cch_rating', val);
            const wrapper = parent.parentElement;
            wrapper.innerHTML = `
                <div class="animate-pulse text-center">
                    <p class="text-yellow-400 font-bold text-lg mb-1">Thank you for playing! ❤️</p>
                    <p class="text-stone-400 text-sm mb-2">Global Rating: <span class="text-yellow-500 font-bold">4.9/5</span> ⭐</p>
                    <a href="https://x.com/shubhamg_" target="_blank"
                       class="inline-block mt-2 bg-black text-white px-4 py-2 rounded-full text-sm font-bold border border-stone-600 hover:bg-stone-900 transition">
                       Follow @shubhamg_ on 𝕏
                    </a>
                </div>
            `;
        }
    };
    const failC = document.getElementById('ratingContainerFail');
    const winC = document.getElementById('ratingContainerWin');
    if (failC) failC.addEventListener('click', handleRate);
    if (winC) winC.addEventListener('click', handleRate);
}

// ─── DOM EVENT WIRING ───────────────────────────────────────
function showLevelIntro(lvlIdx) {
    const config = LEVEL_CONFIG[lvlIdx];
    document.getElementById('levelTitle').innerText = `LEVEL ${lvlIdx + 1}`;
    document.getElementById('levelName').innerText = config.name;
    document.getElementById('levelDesc').innerText = `"${config.desc}"`;
    const intro = document.getElementById('levelIntroScreen');
    intro.classList.remove('hidden');
    const dismiss = () => {
        intro.classList.add('hidden');
        intro.removeEventListener('click', dismiss);
        startLevel(lvlIdx);
    };
    setTimeout(() => intro.addEventListener('click', dismiss), 200);
}

function startLevel(lvlIdx) {
    G.level = lvlIdx;
    if (lvlIdx === 0) {
        G.score = 0;
        G.lives = 5;
        G.totalDist = 0;
    }
    G.chaiBoostTimer = 0;
    G.comboCount = 0;
    G.comboTimer = 0;

    // Hide all overlays
    ['startScreen', 'gameOverScreen', 'winScreen', 'finalScreen', 'levelIntroScreen'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });

    // Start or restart the Phaser game scene
    const game = window.__phaserGame;
    if (game) {
        if (game.scene.isActive('Game') || game.scene.isPaused('Game')) {
            const scene = game.scene.getScene('Game');
            scene._ended = false;
            scene.scene.restart();
        } else {
            game.scene.start('Game');
        }
    }
}

// Start button
document.getElementById('startBtn').addEventListener('click', () => {
    const nameInput = document.getElementById('playerNameInput');
    if (nameInput && nameInput.value.trim() !== '') {
        G.playerName = nameInput.value.trim();
    }
    AudioManager.init();
    AudioManager.resume();
    showLevelIntro(0);
});

// Name input validation
const nameInput = document.getElementById('playerNameInput');
const startBtn = document.getElementById('startBtn');
if (nameInput && startBtn) {
    nameInput.addEventListener('input', (e) => {
        startBtn.disabled = e.target.value.trim() === '';
    });
}

// Restart button
document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('gameOverScreen').classList.add('hidden');
    G.lives = 5;
    showLevelIntro(G.level);
});

// Next level button
document.getElementById('nextLevelBtn').addEventListener('click', () => {
    document.getElementById('winScreen').classList.add('hidden');
    if (G.level < 4) {
        showLevelIntro(G.level + 1);
    }
});

setupRatingUI();

// ─── PHASER GAME CONFIG ─────────────────────────────────────
const config = {
    type: Phaser.AUTO,
    width: GAME_W,
    height: GAME_H,
    parent: 'phaser-container',
    backgroundColor: '#87CEEB',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 2880 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, GameScene],
    audio: { disableWebAudio: true }, // We use our own AudioManager
};

window.__phaserGame = new Phaser.Game(config);
