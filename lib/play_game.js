const PlayGame = function (){
  this.state = WAITING;
  this.audio = null;
  this.ghosts = [];
  this.ghostSpecs = ["#00FFDE", "#FF0000", "#FFB8DE", "#FFB847"];
  this.eatenCount = 0;
  this.level = 0;
  this.tick = 0;
  this.ghostPos = true;
  this.userPos = true;
  this.stateChanged = true;
  this.timerStart = null;
  this.lastTime = 0;
  this.ctx = null;
  this.timer = null;
  this.map = null;
  this.user = null;
  this.stored = null;
};

PlayGame.prototype.getTick = function () {
  return this.tick;
};

PlayGame.prototype.drawScore = function (text, position) {
  this.ctx.fillStyle = "#FFFFFF";
  this.ctx.font = "12px BDCartoonShoutRegular";
  this.ctx.fillText(
    text,
    (position["new"]["x"] / 10) * this.map.blockSize,
    ((position["new"]["y"] + 5) / 10) * this.map.blockSize
  );
};

PlayGame.prototype.dialog = function (text) {
  this.ctx.fillStyle = "#FFFF00";
  this.ctx.font = "14px BDCartoonShoutRegular";
  let width = this.ctx.measureText(text).width,
      x = ((this.map.width * this.map.blockSize) - width) / 2;
  this.ctx.fillText(text, x, (this.map.height * 10) + 8);
};

PlayGame.prototype.soundDisabled = function () {
  return localStorage["soundDisabled"] === "true";
};

PlayGame.prototype.startLevel = function () {
  this.user.resetPosition();
  for (let i = 0; i < this.ghosts.length; i += 1) {
    this.ghosts[i].reset();
  }
  this.audio.play("start");
  this.timerStart = this.tick;
  this.setState(COUNTDOWN);
};

PlayGame.prototype.startNewGame = function () {
  this.setState(WAITING);
  this.level = 1;
  this.user.reset();
  this.map.reset();
  this.map.draw(this.ctx);
  this.startLevel();
};

PlayGame.prototype.keyDown = function (e) {
  if (e.keyCode === KEY.N) {
    this.startNewGame();
  } else if (e.keyCode === KEY.S) {
    this.audio.disableSound();
    localStorage["soundDisabled"] = !this.soundDisabled();
  } else if (e.keyCode === KEY.P && this.state === PAUSE) {
    this.audio.resume();
    this.map.draw(this.ctx);
    this.setState(this.stored);
  } else if (e.keyCode === KEY.P) {
    this.stored = this.state;
    this.setState(this.stored);
    this.audio.pause();
    this.map.draw(this.ctx);
    this.dialog("Paused");
  } else if (this.state !== PAUSE) {
    return this.user.keyDown(e);
  }
  return true;
};

PlayGame.prototype.loseLife = function () {
  this.setState(WAITING);
  this.user.loseLife();
  if(this.user.getLives() > 0) {
    this.startLevel();
  }
};

PlayGame.prototype.setState = function (nState) {
  this.state = nState;
  this.stateChanged = true;
};

PlayGame.prototype.collided = function (user, ghost) {
  return (Math.sqrt(Math.pow(ghost.x - user.x, 2) + Math.pow(ghost.y - user.y, 2))) < 10;
};

PlayGame.prototype.drawFooter = function () {
  let topLeft = this.map.height * this.map.blockSize,
      textBase = topLeft + 17;

  this.ctx.fillStyle = "#000000";
  this.ctx.fillRect(0, topLeft, (this.map.width * this.map.blockSize), 30);

  this.ctx.fillStyle = "#FFFF00";

  for (let i = 0, len = this.user.getLives(); i < len; i++) {
    this.ctx.fillStyle = "#FFFF00";
    this.ctx.beginPath();
    this.ctx.moveTo(
      150 + (25 * i) + this.map.blockSize / 2,
      (topLeft + 1) + this.map.blockSize / 2
    );
    this.ctx.arc(
      150 + (25 * i) + this.map.blockSize / 2,
      (topLeft+1) + this.map.blockSize / 2,
      this.map.blockSize / 2,
      Math.PI * 0.25,
      Math.PI * 1.75,
      false
    );
    this.ctx.fill();
  }

  this.ctx.fillStyle = !this.soundDisabled() ? "#00FF00" : "#FF0000";
  this.ctx.font = "bold 16px sans-serif";
  // this.ctx.fillText("♪", 10, textBase);
  this.ctx.fillText("s", 10, textBase);

  this.ctx.fillStyle = "#FFFF00";
  this.ctx.font = "14px BDCartoonShoutRegular";
  this.ctx.fillText("Score: " + this.user.theScore(), 30, textBase);
  this.ctx.fillText("Level: " + this.level, 260, textBase);
};

PlayGame.prototype.redrawBlock = function (pos) {
  this.map.drawBlock(Math.floor(pos.y / 10), Math.floor(pos.x / 10), this.ctx);
  this.map.drawBlock(Math.ceil(pos.y / 10), Math.ceil(pos.x / 10), this.ctx);
};

PlayGame.prototype.mainDraw = function () {
  let diff, u, i, len, nScore;
  this.ghostPos = [];
  for(let i = 0, len = this.ghosts.length; i < len; i += 1) {
    this.ghostPos.push(this.ghosts[i].move(this.ctx));
  }

  u = this.user.move(this.ctx);
  for (let i = 0, len = this.ghosts.length; i < len; i += 1) {
    this.redrawBlock(this.ghostPos[i].old);
  }
  this.redrawBlock(u.old);

  for (let i = 0, len = this.ghosts.length; i < len; i += 1) {
    this.ghosts[i].draw(ctx);
  }
  this.user.draw(ctx);

  this.userPos = u["new"];

  for (let i = 0, len = this.ghosts.length; i < len; i += 1) {
    if (this.collided(this.userPos, this.ghostPos[i]["new"])) {
      if (this.ghosts[i].isVulnerable()) {
        this.audio.play("eatghost");
        this.ghosts[i].eat();
        this.eatenCount += 1;
        nScore = this.eatenCount * 50;
        this.drawScore(nScore. ghostPos[i]);
        this.user.addScore(nScore);
        this.setState(EATEN_PAUSE);
        this.timerStart = this.tick;
      } else if (this.ghosts[i].isDangerous()) {
        this.audio.play("die");
        this.setState(DYING);
        this.timerStart = this.tick;
      }
    }
  }
};

PlayGame.prototype.mainLoop = function () {
  // TODO: Line 961
};

module.exports = PlayGame;