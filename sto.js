(function (canvas) {
    /* Init some variables */
    var w = canvas.width;
    var h = canvas.height;
    var ctx = canvas.getContext("2d");
    var keysDown = {};
    var characters, treasure, boat, player, score, gameOver, level, air;
    var muted = false;
    var audioContext = window.AudioContext || window.webkitAudioContext;

    /* Keyboard handling */
    addEventListener("keydown", function (e) {
        keysDown[e.keyCode] = true;
    }, false);
    addEventListener("keyup", function (e) {
        delete keysDown[e.keyCode];
    }, false);
    //prevent arrow key scrolling
    window.addEventListener("keydown", function(e) {
        // arrow keys
        if([37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
        }
    }, false);

    var playSound = function(sound) {
        if (muted) {return;}
        var sfx = document.querySelector('#' + sound);
        if (audioContext) {
            var context = new audioContext();
            var source = context.createMediaElementSource(sfx);
            source.connect(context.destination);
        }
        sfx.play();
    };
    /* Base objects */
    var Rect = function(x, y, w, h)
    {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    };
    var Character = function (x, y, moveSpeed, sprite, collisionBox, isPlayer) {
        this.posX = x || 0;
        this.posY = y || 0;
        this.moveSpeed = moveSpeed || 0;
        this.sprite = sprite || null;
        this.collisionBox = collisionBox || null;
        this.isPlayer = isPlayer || false;
    };
    Character.prototype.move = function (deltaX, deltaY) {
        this.posX = (this.posX + deltaX + w) % w;
        targetY = this.posY + deltaY;
        if (targetY > h * 0.2 && targetY < h * 0.9 - 16) {
            this.posY = targetY;
        }
    };
    var Item = function(x, y, sprite) {
        this.posX = x || 0;
        this.posY = y || 0;
        this.held = false;
        this.sprite = sprite || null;
    };

    /* Movement handlers */
    var octoMove = function(timePassed) {
        this.move(this.moveSpeed * this.dir * timePassed * 100, 0);
        if (collisionCheck(player, this)) {
            gameOver = true;
        }
    };
    var playerMove = function(timePassed) {
        if (38 in keysDown) { // up
            this.move(0, -this.moveSpeed * timePassed * 125);
        }
        if (40 in keysDown) { // down
            this.move(0, this.moveSpeed * timePassed * 125);
        }
        if (39 in keysDown) { // right
            this.dir = 1;
        }
        if (37 in keysDown) { // left
            this.dir = -1;
        }
        if (player.treasureCount > 0) {
            this.move(0, this.moveSpeed * timePassed * 25 * player.treasureCount);
        }
    };

    /* Init rects */
    var sprites = {
        diver: new Rect(0,0,31,31),
        octo: new Rect(0,32,32,32),
        boat: new Rect(0,64,32,32),
        treasure: new Rect(0,97,32,31),
    };
    var collisionBoxes = {
        diver: new Rect(2,6,26,6),
        octo: new Rect(6,2,16,20),
    };


    /*collision detection (Axis-Aligned Bounding Boxes)*/
    var collisionCheck = function (item1, item2) {
        var box1 = item1.collisionBox;
        var box2 = item2.collisionBox;
        var x1 = box1.x + item1.posX - item1.sprite.w / 2;
        var y1 = box1.y + item1.posY;
        var x2 = box2.x + item2.posX - item2.sprite.w / 2;
        var y2 = box2.y + item2.posY;
        return (x1 < x2 + box2.w &&
                x1 + box1.w > x2 &&
                y1 < y2 + box2.h &&
                box1.h + y1 > y2);
    };

    /* Drawing helpers */
    var drawSprite = function(ctx, sprite, x, y) {
       var sprites = document.getElementById("sprites");
       ctx.drawImage(sprites, sprite.x, sprite.y, sprite.w, sprite.h, x, y, sprite.w, sprite.h);
    };
    var drawGameOver = function(ctx) {
        playSound('die');
        ctx.font = "100px monospace";
        ctx.fillStyle = "white";
        ctx.fillText("GAME OVER", 130, h / 2);
    };

    /* Main init, runs once */
    var initGame = function () {
        characters = [];
        treasure = new Item(w / 2, h * 0.9, sprites.treasure);
        boat = new Item(w / 2, h * 0.2, sprites.boat);
        score = 0;
        gameOver = false;
        level = 1;
    };

    /* Level init, runs each level. */
    var initLevel = function(level) {
        air = 50;
        characters = [];
        treasure.held = false;
        player = new Character(w / 2, h * 0.2, 1, sprites.diver, collisionBoxes.diver, true);
        player.treasureCount = 0;
        player.update = playerMove;
        characters.push(player);
        // More octopuses each level
        for (var i = 0; i <= level * 2; i++) {
            // Can get faster each level, randomized for varied speeds.
            var speed = 1 + Math.random() * (level * 0.15);
            var octopus = new Character(Math.random() * w, Math.random() *  h * 0.56 + (h * 0.25), speed, sprites.octo, collisionBoxes.octo);
            octopus.dir = Math.random()<0.5 ? 1 : -1;
            octopus.update = octoMove;
            characters.push(octopus);
        }
    };

    /* Update game state */
    var update = function (timePassed) {
        if (air <= 0) {
            gameOver = true;
        }
        air -= timePassed;
        characters.forEach(function(character) {
            character.update(timePassed);
        });

        if (!treasure.held && player.posY > 518) {
            playSound('grab');
            player.treasureCount += 1;
            treasure.held = true;
        }
        if (player.treasureCount > 0 && player.posY < 121) {
            playSound('score');
            var levelBonus = 1 + (level - 1) * 0.2;
            score += player.treasureCount * 500 * levelBonus;
            score += Math.ceil(air) * 2 * 5 * levelBonus;
            player.treasureCount = 0;
            level += 1;
            initLevel(level);
        }
    };

    /* Draw graphics to canvas */
    var draw = function() {
        //prepare graphics
        //draw background
        // sky
        ctx.fillStyle = "#0000dd";
        ctx.fillRect(0, 0, w, h);
        // water
        ctx.fillStyle = "#222255";
        ctx.fillRect(0, h * 0.2, w, h * 0.7);
        // sand
        ctx.fillStyle = "#442200";
        ctx.fillRect(0, h * 0.9, w, h * 0.1);
        //draw boat
        drawSprite(ctx, boat.sprite, boat.posX - boat.sprite.w / 2, boat.posY - boat.sprite.h);
        //draw characters
        characters.forEach(function(character) {
            if (character.dir == -1) {
                ctx.save();
                ctx.scale(-1,1);
                drawSprite(ctx, character.sprite, 
                           (character.posX - character.sprite.w / 2) * -1 - character.sprite.w, 
                           character.posY);
                ctx.restore();
            } else {
                drawSprite(ctx, character.sprite, character.posX - character.sprite.w / 2, character.posY);
            }
        });
        //draw treasure
        if (treasure.held) {
            drawSprite(ctx, treasure.sprite, treasure.posX - treasure.sprite.w / 2, player.posY - 26);
        } else {
            drawSprite(ctx, treasure.sprite, treasure.posX - treasure.sprite.w / 2, treasure.posY - treasure.sprite.h);
        }
        //print level
        //print score
        ctx.font = "25px monospace";
        ctx.fillStyle = "white";
        ctx.fillText("LEVEL: " + level, 10, 30);
        ctx.fillText("SCORE: " + score, 10, 60);
        if (air < 10) (ctx.fillStyle = "#ff6666");
        ctx.fillText("AIR: " + Math.ceil(air), 10, 90);
    };

    /* Game loop */
    // Special thanks to http://gafferongames.com/game-physics/fix-your-timestep/ 
    var runTime = 0;
    var timeStep = 1 / 30; 
    var currentTime = Date.now();
    var mainLoop = function () {
            var newTime = Date.now();
            var frameTime = newTime - currentTime;
            currentTime = newTime;
            while (frameTime > 0) {
                var delta = Math.min(frameTime, timeStep);
                update(delta / 1000);
                frameTime -= delta;
                runTime += delta;
            }
        draw();
        if (!gameOver) {
            requestAnimationFrame(mainLoop, canvas);
        }
        else {
            drawGameOver(ctx);
        }
    };

    /* Driver code*/
    initGame();
    initLevel(1);
    mainLoop();
})(canvas);