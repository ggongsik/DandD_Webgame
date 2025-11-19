// ⭐️ Firebase import 구문 모두 삭제
// import { initializeApp } from "...";
// import { getAuth, ... } from "...";
// import { getFirestore, ... } from "...";

// ⭐️ Firebase 초기화 로직 모두 삭제
// const appId = ...
// let db, auth, userId;
// try { ... } catch (e) { ... }

const d = (sides) => Math.floor(Math.random() * sides) + 1;
        
const sanitizeFirebaseKey = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return 'img_' + hash.toString(16).replace('-', 'N');
};

class Item { constructor(name, price, description) { this.name = name; this.price = price; this.description = description; } applyEffect(player) {} }
class StatUpgradeItem extends Item { constructor(name, price, description, stat, value) { super(name, price, description); this.stat = stat; this.value = value; } applyEffect(player) { player.changeStat(this.stat, this.value); } }
class EquipmentItem extends Item { constructor(name, price, description, effects) { super(name, price, description); this.effects = effects; } applyEffect(player) { this.effects.forEach(effect => { if (effect.stat === 'maxHp') { player.maxHp += effect.value; player.changeStat('hp', effect.value); } else { player.changeStat(effect.stat, effect.value); } }); } }
class ConsumableItem extends Item {
    constructor(name, price, description, stat, value) { super(name, price, description); this.stat = stat; this.value = value; }
    applyEffect(player) { if (this.stat === 'hp') { player.stats.hp = Math.min(player.maxHp, player.stats.hp + this.value); } else if (this.stat === 'mp') { player.stats.mp += this.value; } }
}
class SpellScrollItem extends Item {
    constructor(name, price, description, spellName) { super(name, price, description); this.spellName = spellName; }
    applyEffect(player) { if (!player.spells.includes(this.spellName)) { player.spells.push(this.spellName); } }
}

// ( ... Spell, Unit, Player, Enemy, GameEvent 등 모든 클래스 정의 ... )
// ( ... 코드가 너무 길어 생략 ... 원본 코드의 모든 클래스를 여기에 붙여넣으세요 ...)

class Spell { constructor(name, manaCost, description) { this.name = name; this.manaCost = manaCost; this.description = description; } cast(caster, target) {} }
class DamageSpell extends Spell {
    constructor(name, manaCost, description, options) { super(name, manaCost, description); this.options = options; }
    cast(caster, target) {
        const { diceSides, stat, divisor, applyStatus, statusDifficulty } = this.options; const diceRoll = d(diceSides);
        const statBonus = Math.round(caster.stats[stat] / divisor); let damage = diceRoll + statBonus;
        const isCritical = diceRoll === diceSides; if (isCritical) { damage = Math.floor(damage * 1.5); game.triggerScreenShake(); }
        target.stats.hp -= damage;
        let logMessage = `${caster.name}의 ${this.name}! ${target.name}에게 <span class="text-purple-400">${damage}</span>의 마법 피해를 입혔다!`;
        if (isCritical) { logMessage = `<span class="text-yellow-400 font-bold animate-pulse">✨ 마법 크리티컬!</span> ${logMessage}`; }
        game.addCombatLog(logMessage);
        if (applyStatus === 'burn' && d(20) >= statusDifficulty) { target.burn = 1; target.burnDamageCounter = 1; game.addCombatLog(`<span class="text-orange-400">화상 효과가 적용되었습니다!</span>`); }
    }
}
class BuffSpell extends Spell {
    constructor(name, manaCost, description, options) { super(name, manaCost, description); this.options = options; }
    cast(caster, target) {
        const { effectType, stat, value, duration, nextAttackEffect } = this.options;
        switch (effectType) {
            case 'stat': caster.applyBuff({ name: this.name, stat, value, turnsLeft: duration + 1 }); game.addCombatLog(`${caster.name}이(가) ${this.name}으로 ${duration}턴간 ${stat}을(를) ${value}만큼 강화합니다!`); break;
            case 'nextAttack': caster.nextAttackEffect = { name: this.name, type: nextAttackEffect }; game.addCombatLog(`${caster.name}이(가) ${this.name}을(를) 시전하여 다음 공격을 강화합니다.`); break;
            case 'combined': caster.applyBuff({ name: this.name, stat, value, turnsLeft: 2 }); caster.nextAttackEffect = { name: this.name, type: nextAttackEffect }; game.addCombatLog(`${caster.name}이(가) ${this.name}으로 정신을 집중합니다. (1턴간 재주+${value}, 다음 공격 필중)`); break;
        }
    }
}
 class CometSpell extends Spell {
    constructor(name, manaCost, description) {
        super(name, manaCost, description);
    }
    cast(caster, target) {
        target.cometTurns = 2; 
        target.cometCasterStats = { ...caster.stats }; 
        game.addCombatLog(`${caster.name}이(가) ${target.name}의 머리 위에 불길한 혜성을 소환합니다! (1턴 후 충돌)`);
    }
}
class MultiHitSpell extends Spell {
    constructor(name, manaCost, description) { super(name, manaCost, description); }
    async cast(caster, target) {
        game.addCombatLog(`<span class="text-red-600 font-bold">${caster.name}이(가) 초절맹호살격난참을 시전합니다!</span>`);
        let totalDamage = 0;
        for (let i = 0; i < 5; i++) {
            if (!target.isAlive()) break;
            const hitRoll = d(20) + caster.stats.dex;
            const evadeRoll = target.stats.dex + d(20);
            if (hitRoll > evadeRoll) {
                let baseDamage = d(20) + Math.floor(caster.stats.str / 2);
                let bonusDamage = 0;
                let multiplier = 1.0;
                let hitLog = ``;
                let detailLog = '';

                switch(i) {
                    case 0: bonusDamage = Math.floor(caster.stats.str / 10); multiplier = 1.1; hitLog=`1타!`; break;
                    case 1: bonusDamage = Math.floor(caster.stats.str / 10); multiplier = 1.2; hitLog=`2타!`; break;
                    case 2: bonusDamage = Math.floor(caster.stats.str / 7); multiplier = 1.3; target.burn = 1; target.burnDamageCounter = 1; hitLog=`3타! (화상!)`; break;
                    case 3: bonusDamage = Math.floor(caster.stats.str / 7); multiplier = 1.8; if (target.burn <= 0) { target.burn = 1; target.burnDamageCounter = 1; hitLog=`4타! (화상!)`; } else {hitLog=`4타!`}; break;
                    case 4: 
                        bonusDamage = Math.floor(caster.stats.str / 5); multiplier = 2.5; 
                        target.stats.dex = Math.floor(target.stats.dex / 2);
                        target.stats.luk = Math.floor(target.stats.luk / 2);
                        if(target.burn > 0) {
                            const burnBonus = caster.stats.int + caster.stats.luk;
                            baseDamage += burnBonus;
                            hitLog=`5타! (약점 간파! 민첩/재주 약화!)`;
                        } else {
                            target.burn = 1;
                            target.burnDamageCounter = 1;
                            hitLog=`5타! (화상! 민첩/재주 약화!)`;
                        }
                        break;
                }
                const finalDamage = Math.floor((baseDamage + bonusDamage) * multiplier);
                totalDamage += finalDamage;
                detailLog = `<small>계산: (기본 ${baseDamage} + 보너스 ${bonusDamage}) * ${multiplier} = ${finalDamage}</small>`;
                target.stats.hp -= finalDamage;
                game.addCombatLog(`${hitLog} <span class="text-red-400">${finalDamage}</span>의 피해! ${detailLog}`);
            } else {
                game.addCombatLog(`${i + 1}타... 빗나갔다!`);
            }
             await new Promise(res => setTimeout(res, 500));
        }
    }
}

class Unit {
    constructor(name, stats) {
        this.name = name; this.stats = stats; this.maxHp = stats.hp; this.shield = 0; this.evasionTurns = 0; this.bleed = 0;
        this.burn = 0; this.burnDamageCounter = 1; this.hasRobberKnife = false; this.isStunned = false; this.buffs = []; this.nextAttackEffect = null;
        this.cometTurns = 0; this.cometCasterStats = null;
    }
    isAlive() { return this.stats.hp > 0; }
    async startTurn() {
        this.shield = 0;
        if (this.evasionTurns > 0) this.evasionTurns--;
        this.updateBuffs();
        if (this.bleed > 0) { this.stats.hp -= this.bleed; game.addCombatLog(`<span class="text-red-500">${this.name}이(가) 출혈로 ${this.bleed}의 피해를 입었습니다!</span>`, false); }
        if (this.burn > 0) { const burnDmg = this.burnDamageCounter; this.stats.hp -= burnDmg; game.addCombatLog(`<span class="text-orange-500">${this.name}이(가) 화상으로 ${burnDmg}의 피해를 입었습니다!</span>`, false); this.burnDamageCounter += 2; }
         if (this.cometTurns > 0) {
            this.cometTurns--;
            await game.checkAndTriggerComet(this);
        }
    }
    applyBuff(buff) { this.buffs.push(buff); if (buff.stat) { this.stats[buff.stat] += buff.value; } }
    updateBuffs() {
        const expiredBuffs = [];
        this.buffs.forEach(buff => {
            buff.turnsLeft--;
            if (buff.turnsLeft <= 0) { expiredBuffs.push(buff); }
        });
        expiredBuffs.forEach(buff => {
            if (buff.stat) { this.stats[buff.stat] -= buff.value; }
            this.buffs = this.buffs.filter(b => b !== buff);
            game.addCombatLog(`${this.name}의 ${buff.name} 효과가 사라졌습니다.`, false);
        });
    }
}

class Player extends Unit {
    constructor() {
        super('플레이어', { hp: 100, mp: 50, str: 12, int: 14, dex: 10, luk: 8 });
        this.gold = 1000; this.inventory = []; this.hasRobberKnife = false; this.spells = ['불태우기']; 
        this.hasExcalibur = false; this.hasCometAxe = false; this.hasYamato = false; this.hasCheontweseongdo = false;
        this.level = 1; this.xp = 0; this.xpToNextLevel = 5; this.statPoints = 0; this.maxMp = 50;
    }
    toPlainObject() { return { name: this.name, stats: this.stats, maxHp: this.maxHp, gold: this.gold, inventory: this.inventory, hasRobberKnife: this.hasRobberKnife, spells: this.spells, level: this.level, xp: this.xp, xpToNextLevel: this.xpToNextLevel, statPoints: this.statPoints, maxMp: this.maxMp, hasExcalibur: this.hasExcalibur, hasCometAxe: this.hasCometAxe, hasYamato: this.hasYamato, hasCheontweseongdo: this.hasCheontweseongdo }; }
    static fromPlainObject(obj) {
        const player = new Player(); player.name = obj.name; player.stats = obj.stats; player.maxHp = obj.maxHp; player.gold = obj.gold; player.inventory = obj.inventory; player.hasRobberKnife = obj.hasRobberKnife || false; player.spells = obj.spells || ['불태우기'];
        player.level = obj.level || 1; player.xp = obj.xp || 0; player.xpToNextLevel = obj.xpToNextLevel || 5; player.statPoints = obj.statPoints || 0; player.maxMp = obj.maxMp || 50; 
        player.hasExcalibur = obj.hasExcalibur || false; 
        player.hasCometAxe = obj.hasCometAxe || false;
        player.hasYamato = obj.hasYamato || false;
        player.hasCheontweseongdo = obj.hasCheontweseongdo || false;
        return player;
    }
    changeStat(stat, value) { if (this.stats.hasOwnProperty(stat)) { this.stats[stat] += value; if (stat === 'hp' && this.stats.hp > this.maxHp) this.stats.hp = this.maxHp; if (this.stats[stat] < 0) this.stats[stat] = 0; } }
    spendGold(amount) { if (this.gold >= amount) { this.gold -= amount; return true; } return false; }
    addItem(item) {
        const fullItem = game.shopItems.find(i => i.name === item.name);
        if (fullItem instanceof SpellScrollItem) { if (!this.inventory.includes(item.name)) this.inventory.push(item.name); }
        if (fullItem) fullItem.applyEffect(this);
    }
    gainXp(amount) {
        this.xp += amount;
        let leveledUp = false;
        while (this.xp >= this.xpToNextLevel) {
            leveledUp = true;
            this.xp -= this.xpToNextLevel;
            this.level++;
            this.xpToNextLevel = this.level * 5;
            this.maxHp += 5;
            this.changeStat('hp', 5);
            this.statPoints += 3;
        }
        if (leveledUp) { game.showStatDistribution(); }
    }
}

class Enemy extends Unit {
    constructor(name, stats, xpReward) { super(name, stats); this.xpReward = xpReward; }
    chooseAction() { const actions = ['attack', 'defend', 'evade']; return actions[Math.floor(Math.random() * actions.length)]; }
}
class BossEnemy extends Enemy {
    constructor(name, stats, xpReward) {
        super(name, stats, xpReward);
        this.isRaged = false;
        this.isVulnerable = false;
    }
    chooseAction() {
        if (this.isRaged) {
             return 'chojeolmaenghosalgyeoknancham';
        }
        const actions = ['attack', 'attack', 'attack', 'defend', 'evade', 'chojeolmaenghosalgyeoknancham'];
        return actions[Math.floor(Math.random() * actions.length)];
    }
}

class GameEvent { constructor(id, text, choices, imagePrompt) { this.id = id; this.text = text; this.choices = choices; this.imagePrompt = imagePrompt; } }
class Choice { constructor(text, result) { this.text = text; this.result = result; } }
class StatCheckChoice extends Choice { constructor(text, stat, difficulty, success, failure) { super(text, () => this.performCheck()); this.stat = stat; this.difficulty = difficulty; this.success = success; this.failure = failure; } performCheck() { const diceRoll = d(20); const statBonus = Math.floor(game.player.stats[this.stat] / 10); const total = diceRoll + statBonus; const isSuccess = total >= this.difficulty; let resultText = `[${this.stat.toUpperCase()}] 판정: <strong>${total}</strong> (목표: ${this.difficulty})<br><small>주사위 ${diceRoll} + 보너스 ${statBonus}</small><br><br>`; if (isSuccess) { resultText += `<span class="text-green-400">성공!</span> ${this.success.message}`; this.success.action(); } else { resultText += `<span class="text-red-400">실패!</span> ${this.failure.message}`; this.failure.action(); } game.showDiceRollResult(resultText); } }


const game = {
    player: null, events: [], currentEvent: null, shopItems: [], knownSpells: [], currentEnemy: null, isPlayerTurn: true,
    playerStatsBeforeCombat: null, isStatModalOpen: false, imageCache: {},
    isSpecialCombat: false, playerTurnCount: 0, totalDamageDealt: 0,

    async start() {
        this.initializeItems(); this.initializeSpells(); this.initializeEvents();
        
        // ⭐️ loadGame()이 Flask API를 호출하도록 변경
        await this.loadGame(); 
        
        this.updateStatsDisplay();
        document.getElementById('loading-overlay').classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        document.querySelectorAll('.combat-action-btn').forEach(btn => btn.addEventListener('click', (e) => this.handlePlayerAction(e.currentTarget.dataset.action)));
        
        if (this.player.statPoints > 0) { this.showStatDistribution(); } 
        else { this.nextEvent(false); }
    },

    async restart() {
        // ⭐️ '새 게임'을 위해 서버의 캐릭터 정보를 리셋합니다.
        this.player = new Player(); 
        this.imageCache = {};
        sessionStorage.removeItem('dnd-adventure-imageCache'); // 로컬 이미지 캐시 삭제
        
        // ⭐️ 새 Player 정보로 서버 덮어쓰기
        await this.saveGame(); 
        
        window.location.reload(); 
    },

    async saveGame() { 
        // ⭐️ Firebase 대신 Flask API 호출
        try { 
            const playerState = this.player.toPlainObject();
            const response = await fetch('/api/game_state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(playerState)
            });
            if (!response.ok) {
                console.error("게임 저장 실패:", await response.json());
            }
        } catch(e) { 
            console.error("게임 저장 실패:", e);
        } 
    },

    saveImageCache() {
        // ⭐️ userId가 없으므로 로컬 스토리지 키를 단순화합니다.
        try {
            sessionStorage.setItem('dnd-adventure-imageCache', JSON.stringify(this.imageCache));
        } catch(e) {
             if (e.name === 'QuotaExceededError') {
                console.warn("sessionStorage quota exceeded. Image cache not saved.");
             } else {
                console.error("이미지 캐시 저장 실패:", e);
             }
        }
    },

    async loadGame() { 
        // ⭐️ Firebase 대신 Flask API 호출
        try { 
            const response = await fetch('/api/game_state');
            if (response.ok) {
                const playerState = await response.json();
                this.player = Player.fromPlainObject(playerState);
                console.log("게임 상태 불러오기 성공:", playerState);
            } else {
                // 404 (캐릭터 없음) 등 예외 처리
                console.error("게임 상태 불러오기 실패. 새 게임을 시작합니다.");
                this.player = new Player(); 
                await this.saveGame(); // 백엔드에 새 캐릭터 생성/저장
            }
            
            // ⭐️ 이미지 캐시 로드 (userId 키 제거)
            const cachedImages = sessionStorage.getItem('dnd-adventure-imageCache');
            if (cachedImages) {
                this.imageCache = JSON.parse(cachedImages);
            }
        } catch(e) { 
            console.error("불러오기 실패:", e); 
            this.player = new Player(); 
        } 
    },

    //
    // ⭐️ ... updateStatsDisplay() 부터 ... ⭐️
    // ⭐️ ... initializeEvents() 까지 ... ⭐️
    //
    // (이 사이의 모든 game 객체 함수들 (약 20개)을 
    //  원본 코드에서 그대로 복사하여 여기에 붙여넣으세요)
    //
    // ( ... 코드 너무 길어 생략 ... )
    // ( ... updateStatsDisplay, nextEvent, displayCurrentEvent, loadEventImage, ... )
    // ( ... showDiceRollResult, closeDiceModal, endGame, startCombat, combatLoop, ... )
    // ( ... endCombat, handlePlayerAction, handleEnemyAction, executeAction, ... )
    // ( ... updateCombatUI, addCombatLog, toggleCombatActions, showCombatCutscene, ... )
    // ( ... showCriticalRoll, displaySpellList, displayShop, showStatDistribution, ... )
    // ( ... triggerScreenShake, checkAndTriggerComet, generateImage, ... )
    // ( ... initializeItems, initializeSpells, initializeEvents ... )
    //
    // ⬇️ 여기부터가 복사/붙여넣기 할 코드입니다 ⬇️
    updateStatsDisplay() {
        document.getElementById('player-level').textContent = this.player.level;
        document.getElementById('player-xp').textContent = this.player.xp;
        document.getElementById('player-xp-next').textContent = this.player.xpToNextLevel;
        document.getElementById('xp-bar').style.width = `${(this.player.xp / this.player.xpToNextLevel) * 100}%`;
        document.getElementById('stat-points-display').classList.toggle('hidden', this.player.statPoints <= 0);
        Object.keys(this.player.stats).forEach(stat => { document.getElementById(`stat-${stat}`).textContent = this.player.stats[stat]; });
        document.getElementById('stat-gold').textContent = this.player.gold;
        const inventoryEl = document.getElementById('inventory-list');
        inventoryEl.innerHTML = this.player.inventory.length > 0 ? this.player.inventory.map(item => `<li class="bg-gray-600 px-2 py-1 rounded text-xs shadow">${item}</li>`).join('') : '<li class="text-gray-500 text-xs">비어있음</li>';
    },
    async nextEvent(earnXp = true) {
        if (this.isStatModalOpen) return;
        if (!this.player.isAlive()) { this.endGame("체력이 다해 쓰러졌습니다."); return; }
        if (earnXp) { this.player.gold += 100; this.player.maxMp += 1; this.player.changeStat('mp', 1); this.player.gainXp(1); }
        this.updateStatsDisplay(); await this.saveGame();
        if (this.player.statPoints > 0) return;
        
        let availableEvents = [...this.events];
        if (this.player.hasCometAxe) availableEvents = availableEvents.filter(e => e.id !== 'cometAxeEvent');
        if (this.player.hasYamato) availableEvents = availableEvents.filter(e => e.id !== 'yamatoEvent');
        if (this.player.hasCheontweseongdo) availableEvents = availableEvents.filter(e => e.id !== 'noehoengEvent');

        const hasLegendary = this.player.hasExcalibur || this.player.hasCometAxe || this.player.hasYamato;
        if (!hasLegendary) {
            availableEvents = availableEvents.filter(e => e.id !== 'noehoengEvent');
        }

        const eventIndex = Math.floor(Math.random() * availableEvents.length);
        this.currentEvent = availableEvents[eventIndex];
        this.displayCurrentEvent();
    },
    displayCurrentEvent() {
        if (!this.currentEvent) return;
        document.getElementById('event-text').innerHTML = this.currentEvent.text;
        const choicesContainer = document.getElementById('choices-container');
        choicesContainer.innerHTML = '';
        this.currentEvent.choices.forEach(choice => {
            const button = document.createElement('button');
            button.innerHTML = choice.text;
            button.className = "w-full bg-gray-700 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105";
            button.onclick = () => { choice.result(); };
            choicesContainer.appendChild(button);
        });

        this.loadEventImage(this.currentEvent);
    },
    async loadEventImage(event) {
        const eventImageEl = document.getElementById('event-image');
        if (event && event.imagePrompt) {
            eventImageEl.src = `https://placehold.co/800x400/1a202c/9ca3af?text=이미지+로드+중...`;
            eventImageEl.classList.remove('hidden');

            const promptKey = sanitizeFirebaseKey(event.imagePrompt);
            if (this.imageCache[promptKey]) {
                eventImageEl.src = this.imageCache[promptKey];
                return;
            }

            try {
                const generatedImageUrl = await this.generateImage(event.imagePrompt);
                if (generatedImageUrl) {
                    this.imageCache[promptKey] = generatedImageUrl;
                    eventImageEl.src = generatedImageUrl;
                    this.saveImageCache();
                } else {
                    eventImageEl.src = `https://placehold.co/800x400/1a202c/9ca3af?text=이미지+생성+실패`;
                }
            } catch (error) {
                 eventImageEl.src = `https://placehold.co/800x400/1a202c/9ca3af?text=이미지+생성+오류`;
            }
        } else {
            eventImageEl.classList.add('hidden');
        }
    },
    showDiceRollResult(resultText) { document.getElementById('dice-roll-result-text').innerHTML = resultText; document.getElementById('dice-roll-modal').classList.remove('hidden'); },
    closeDiceModal() { document.getElementById('dice-roll-modal').classList.add('hidden'); this.updateStatsDisplay(); this.nextEvent(); },
    endGame(message) { document.getElementById('main-content').classList.add('hidden'); const gameOverScreen = document.getElementById('game-over'); document.getElementById('game-over-message').textContent = message; gameOverScreen.classList.remove('hidden'); },
    
    startCombat(enemy, isSpecial = false) {
        this.isSpecialCombat = isSpecial;
        if (isSpecial) {
            this.playerTurnCount = 0;
            this.totalDamageDealt = 0;
        }

        document.getElementById('combat-actions').classList.remove('hidden');
        const victoryActions = document.getElementById('victory-actions');
        victoryActions.classList.add('hidden');
        victoryActions.innerHTML = '';

        this.playerStatsBeforeCombat = JSON.parse(JSON.stringify(this.player.stats));
        this.player.bleed = 0; this.player.burn = 0; this.player.burnDamageCounter = 1; this.player.isStunned = false; this.player.buffs = []; this.player.nextAttackEffect = null;
        enemy.bleed = 0; enemy.burn = 0; enemy.burnDamageCounter = 1; enemy.isStunned = false; enemy.buffs = []; enemy.nextAttackEffect = null;
        this.currentEnemy = enemy;
        document.getElementById('event-view').classList.add('hidden'); document.getElementById('combat-view').classList.remove('hidden'); document.getElementById('combat-log').innerHTML = '';
        this.addCombatLog(`야생의 ${enemy.name}이(가) 나타났다!`);
        this.updateCombatUI();
        this.isPlayerTurn = this.player.stats.dex >= this.currentEnemy.stats.dex;
        this.combatLoop();
    },
    async combatLoop() {
        if (!this.currentEnemy || this.isStatModalOpen) return;
        this.updateCombatUI();
        if (!this.player.isAlive()) { await this.endCombat(false); return; }
        if (!this.currentEnemy.isAlive()) { await this.endCombat(true); return; }

        if (this.isPlayerTurn) { 
            await this.player.startTurn(); 
            if (!this.currentEnemy.isAlive()) { await this.endCombat(true); return; }
            this.addCombatLog("플레이어의 턴입니다."); 
            this.toggleCombatActions(true); 
            document.getElementById('combat-actions').classList.remove('hidden'); 
            document.getElementById('magic-view').classList.add('hidden'); 
        }
        else { 
            this.toggleCombatActions(false); 
            setTimeout(() => this.handleEnemyAction(), 1000); 
        }
    },
    async endCombat(playerWon) {
        const finalHp = this.player.stats.hp; const finalMp = this.player.stats.mp;
        if (this.playerStatsBeforeCombat) {
            this.player.stats = this.playerStatsBeforeCombat;
            this.player.stats.hp = finalHp; this.player.stats.mp = finalMp;
            this.playerStatsBeforeCombat = null;
        }
        
        if (playerWon) {
            if (this.isSpecialCombat) {
                let goldWon = 0;
                if (!this.currentEnemy.isAlive()) {
                    goldWon = 1500;
                } else if (this.totalDamageDealt > 400) {
                    goldWon = 300 + Math.floor(this.totalDamageDealt / 10);
                } else if (this.totalDamageDealt > 300) {
                    goldWon = 300;
                } else if (this.totalDamageDealt > 200) {
                    goldWon = 200;
                } else if (this.totalDamageDealt > 100) {
                    goldWon = 100;
                } else if (this.totalDamageDealt > 70) {
                    goldWon = 50;
                }
                this.player.gold += goldWon;
                const resultMessage = goldWon > 0 ? `총 ${this.totalDamageDealt}의 피해를 입혀 ${goldWon} 골드를 획득했습니다!` : `총 ${this.totalDamageDealt}의 피해... 아쉽지만 보상은 없습니다.`;
                this.currentEvent = new GameEvent('shipChallengeEnd', resultMessage, [new Choice("계속 탐험한다", () => this.nextEvent(false))]);
                
                this.isSpecialCombat = false;
                this.currentEnemy = null;
                this.player.bleed = 0;
                this.player.burn = 0;
                this.player.burnDamageCounter = 1;

                document.getElementById('combat-view').classList.add('hidden');
                document.getElementById('event-view').classList.remove('hidden');

                this.displayCurrentEvent();
                return;
            }

            this.addCombatLog("<span class='text-green-400 font-bold'>승리했습니다!</span>");
            
            document.getElementById('combat-actions').classList.add('hidden');
            const victoryActions = document.getElementById('victory-actions');
            victoryActions.classList.remove('hidden');
            victoryActions.innerHTML = '';
            
            const victoryButton = document.createElement('button');
            victoryButton.textContent = '전리품 확인';
            victoryButton.className = "w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300";
            
            victoryButton.onclick = () => {
                document.getElementById('combat-view').classList.add('hidden');
                document.getElementById('event-view').classList.remove('hidden');

                this.player.gainXp(this.currentEnemy.xpReward);
                const goldWon = d(50) + 50; this.player.gold += goldWon;
                
                let lootMessage = `치열한 싸움 끝에 ${this.currentEnemy.name}을(를) 쓰러뜨렸습니다! 전리품으로 ${goldWon} 골드와 경험치 ${this.currentEnemy.xpReward}를 얻었습니다.`;
                if (this.currentEnemy.name === '노상강도' && this.currentEnemy.hasRobberKnife) { 
                    this.player.hasRobberKnife = true; 
                    if (!this.player.inventory.includes('노상강도의 칼')) this.player.inventory.push('노상강도의 칼'); 
                    lootMessage += "<br><span class='text-yellow-400'>아이템 획득: 노상강도의 칼</span>"; 
                }
                if (this.currentEnemy.name === '뇌횡') {
                     this.player.hasCheontweseongdo = true;
                     this.player.changeStat('str', 30);
                     if (!this.player.inventory.includes('천퇴성도')) this.player.inventory.push('천퇴성도');
                     if (!this.player.spells.includes('초절맹호살격난참')) this.player.spells.push('초절맹호살격난참');
                     lootMessage += "<br><span class='text-yellow-400'>아이템 획득: 천퇴성도</span><br><span class='text-purple-400'>마법 습득: 초절맹호살격난참</span>";
                }

                this.currentEvent = new GameEvent('victoryLoot', lootMessage, [new Choice("계속 탐험한다", () => this.nextEvent(false))], 'A triumphant adventurer standing over a defeated foe, treasure scattered around, epic fantasy art');
                
                this.currentEnemy = null;
                this.displayCurrentEvent();
                
                if (this.player.statPoints > 0) {
                    this.showStatDistribution();
                }
            };
            
            victoryActions.appendChild(victoryButton);

        } else if (this.player.isAlive()) { // Flee case
            this.currentEvent = new GameEvent('fleeSuccess', "성공적으로 도망쳤습니다.", [new Choice("계속 탐험한다", () => this.nextEvent(false))]);
            this.currentEnemy = null;
            document.getElementById('combat-view').classList.add('hidden');
            document.getElementById('event-view').classList.remove('hidden');
            this.displayCurrentEvent();
        } else { // Player died
            this.endGame(`${this.currentEnemy.name}에게 패배했습니다...`);
        }

        this.player.bleed = 0;
        this.player.burn = 0;
        this.player.burnDamageCounter = 1;
        
        if (this.player.statPoints === 0 && this.player.isAlive() && !playerWon) {
            this.displayCurrentEvent();
        }
    },
    async handlePlayerAction(action) { 
        this.playerTurnCount++;
        this.toggleCombatActions(false); 
        if (action === 'magic') { this.displaySpellList(); return; } 
        await this.executeAction(this.player, this.currentEnemy, action);
        this.isPlayerTurn = false; 
        setTimeout(() => this.combatLoop(), 1000); 
    },
    async handleEnemyAction() {
        await this.currentEnemy.startTurn();
        if (!this.player.isAlive()) { await this.endCombat(false); return; }

        if (this.currentEnemy.isStunned) { 
            this.addCombatLog(`${this.currentEnemy.name}은(는) 기절하여, 이번 턴을 쉽니다!`); 
            this.currentEnemy.isStunned = false; 
            this.isPlayerTurn = true; 
            setTimeout(() => this.combatLoop(), 1000); 
            return; 
        }
        const action = this.currentEnemy.chooseAction(); 
        this.addCombatLog(`${this.currentEnemy.name}의 턴입니다.`);
        await this.executeAction(this.currentEnemy, this.player, action); 
        
        if (this.isSpecialCombat && this.playerTurnCount >= 3) {
             this.addCombatLog("도전 시간이 만료되었습니다!");
             await this.endCombat(true); // Player "wins" (survives)
             return;
         }
        
        this.isPlayerTurn = true; 
        setTimeout(() => this.combatLoop(), 1000);
    },
    async executeAction(attacker, defender, action, payload = null) {
        const isPlayerAction = attacker === this.player;
        const rollPenalty = attacker.bleed > 0 ? 1 : 0;
        if (rollPenalty > 0 && action !== 'magic') this.addCombatLog(`${attacker.name}은(는) 출혈 때문에 집중력이 흐트러집니다! (주사위 -1)`);

        switch (action) {
            case 'attack': {
                let autoHit = attacker.nextAttackEffect && attacker.nextAttackEffect.type === 'autoHit';
                const attackerDiceType = defender.evasionTurns > 0 ? 10 : 20; const attackRoll = Math.max(1, d(attackerDiceType) - rollPenalty);
                if (attackerDiceType === 20 && attackRoll <= 3 && !autoHit) {
                    await this.showCriticalRoll('fail', '대실패!'); this.addCombatLog(`${attacker.name}의 공격이 끔찍하게 빗나갔습니다!`);
                    if (isPlayerAction) { this.addCombatLog('스스로에게 <span class="text-red-400">5</span>의 피해를 입었습니다.'); this.player.changeStat('hp', -5); }
                    else { const penalties = ['stun', 'selfBleed', 'selfDamage']; const penalty = penalties[Math.floor(Math.random() * penalties.length)]; switch (penalty) { case 'stun': attacker.isStunned = true; this.addCombatLog(`${attacker.name}이(가) 비틀거립니다! (다음 턴 기절)`); break; case 'selfBleed': const bleedAmount = d(2); attacker.bleed += bleedAmount; this.addCombatLog(`${attacker.name}이(가) 실수로 자신을 베어 <span class="text-red-500">${bleedAmount}</span>의 출혈을 입었습니다!`); break; case 'selfDamage': const selfDamage = 5; attacker.stats.hp -= selfDamage; this.addCombatLog(`${attacker.name}이(가) 넘어지며 <span class="text-red-400">${selfDamage}</span>의 피해를 입었습니다!`); break; } } return;
                }
                const hitCheckAttacker = attacker.stats.str + attacker.stats.dex + attackRoll; const hitCheckDefender = defender.stats.str + defender.stats.dex + d(20); let hitLog = `명중 판정: <span class="text-yellow-300">${attacker.name} ${hitCheckAttacker}</span> vs <span class="text-blue-300">${defender.name} ${hitCheckDefender}</span>. `;
                if (autoHit || hitCheckAttacker > hitCheckDefender) {
                    if(autoHit) { this.addCombatLog(`집중된 공격이 빈틈을 파고듭니다! <span class="text-green-400">필중!</span>`); }
                    else { if (isPlayerAction) await this.showCombatCutscene('공격!'); this.addCombatLog(hitLog + '<span class="text-green-400">성공!</span>'); }
                    
                    let damage = d(20) + Math.floor(attacker.stats.str / 2); const isCritical = attackerDiceType === 20 && attackRoll >= 18; if (isCritical) { await this.showCriticalRoll('success', '크리티컬!'); damage += 10; this.triggerScreenShake(); } const actualDamage = Math.max(0, damage - defender.shield); defender.stats.hp -= actualDamage; 
                    if(isPlayerAction) this.totalDamageDealt += actualDamage;
                    let logMessage = `${attacker.name}의 공격! ${defender.name}에게 <span class="text-red-400">${actualDamage}</span>의 피해를 입혔다! (방어: ${defender.shield})`; if (isCritical) logMessage = `<span class="text-yellow-400 font-bold">💥 크리티컬 히트!</span> ${logMessage}`; this.addCombatLog(logMessage);
                    
                    if(attacker.nextAttackEffect) {
                        switch(attacker.nextAttackEffect.type) {
                            case 'burn': defender.burn = 1; defender.burnDamageCounter = 1; this.addCombatLog(`공격에 실린 불꽃이 ${defender.name}에게 옮겨붙었습니다! (화상)`); break;
                            case 'bleedMagicSword':
                                if(defender.bleed > 0) { const extraDmg = defender.bleed * 3; defender.stats.hp -= extraDmg; defender.bleed += 3; this.addCombatLog(`기존 출혈을 악화시켜 <span class="text-red-500">${extraDmg}</span>의 추가 피해! 출혈이 3 증가합니다! (총 ${defender.bleed})`); }
                                else { defender.bleed += 3; this.addCombatLog(`깊은 상처를 내어 ${defender.name}에게 3의 출혈을 부여합니다!`); } break;
                        }
                    }
                     if (attacker.hasRobberKnife && d(20) >= 14) { const bleedAmount = Math.round(attacker.stats.luk / 4); if(bleedAmount > 0) { defender.bleed += bleedAmount; this.addCombatLog(`<span class="text-red-600">출혈!</span> 상대에게 ${bleedAmount}의 출혈을 부여했습니다! (총 ${defender.bleed})`); } }
                     attacker.nextAttackEffect = null;
                } else { this.addCombatLog(hitLog + '<span class="text-red-400">실패!</span>'); } break;
            }
            case 'defend': if (isPlayerAction) await this.showCombatCutscene('방어!'); attacker.shield = d(10) + Math.floor((attacker.stats.str + attacker.stats.luk) / 3); this.addCombatLog(`${attacker.name}이(가) 방어 태세를 갖춘다! (<span class="text-blue-400">${attacker.shield}</span>의 피해 흡수)`); break;
            case 'evade': {
                const evadeRoll = Math.max(1, d(20) - rollPenalty); const evadeCheckAttacker = attacker.stats.dex + evadeRoll; const evadeCheckDefender = defender.stats.str + defender.stats.dex + d(20); let evadeLog = `회피 판정: <span class="text-yellow-300">${attacker.name} ${evadeCheckAttacker}</span> vs <span class="text-blue-300">적 공격 ${evadeCheckDefender}</span>. `;
                if (evadeCheckAttacker > evadeCheckDefender) { if (isPlayerAction) await this.showCombatCutscene('회피!'); this.addCombatLog(evadeLog + '<span class="text-green-400">성공!</span>'); attacker.evasionTurns = 3; this.addCombatLog(`${attacker.name}이(가) 회피 자세를 취했다! (3턴간 상대 공격 명중률 감소)`);
                } else { this.addCombatLog(evadeLog + '<span class="text-red-400">실패!</span>'); } break;
            }
            case 'flee': {
                if (this.isSpecialCombat) {
                    this.addCombatLog("이 전투에서는 도주할 수 없습니다!");
                    break;
                }
                const fleeRoll = Math.max(1, d(20) - rollPenalty); const fleeCheck = fleeRoll + this.player.stats.dex - this.currentEnemy.stats.dex; let fleeLog = `도주 판정: ${fleeCheck} (주사위 ${fleeRoll}) (목표: 10). `;
                if (fleeCheck >= 10) { await this.showCombatCutscene('도주!'); this.addCombatLog(fleeLog + '<span class="text-green-400">성공!</span>'); setTimeout(() => this.endCombat(false), 1000);
                } else { this.addCombatLog(fleeLog + '<span class="text-red-400">실패!</span>'); } break;
            }
            case 'magic': {
                const spell = payload; if (!spell || attacker.stats.mp < spell.manaCost) { this.addCombatLog(`${attacker.name}의 마나가 부족합니다!`); return; }
                attacker.stats.mp -= spell.manaCost;
                if (defender.evasionTurns > 0 && !(spell instanceof BuffSpell)) { this.addCombatLog(`${defender.name}이(가) 회피 상태라 마법이 닿지 않았습니다!`); return; }
                await this.showCombatCutscene(spell.name); 
                await spell.cast(attacker, defender); 
                if(isPlayerAction && spell instanceof DamageSpell) {
                    this.totalDamageDealt += (defender.maxHp - defender.stats.hp); // Simplified
                }
                break;
            }
            case 'chojeolmaenghosalgyeoknancham': {
                const spell = this.knownSpells.find(s => s.name === '초절맹호살격난참');
                if (spell) {
                   await spell.cast(attacker, defender);
                }
                break;
            }
        }
    },
    updateCombatUI() {
        if (!this.currentEnemy) return;
        document.getElementById('enemy-name').textContent = this.currentEnemy.name;
        const enemyHpPercent = Math.max(0, (this.currentEnemy.stats.hp / this.currentEnemy.maxHp) * 100);
        document.getElementById('enemy-hp-bar').style.width = `${enemyHpPercent}%`;
        document.getElementById('enemy-hp-text').textContent = `체력: ${this.currentEnemy.stats.hp} / ${this.currentEnemy.maxHp}`;
        const renderIcons = (unit, container) => {
            container.innerHTML = '';
            if(unit.shield > 0) container.innerHTML += `<span class="bg-blue-800 px-2 py-1 text-xs rounded" title="보호막: ${unit.shield}">방어</span>`;
            if(unit.evasionTurns > 0) container.innerHTML += `<span class="bg-green-800 px-2 py-1 text-xs rounded" title="${unit.evasionTurns}턴 남음">회피</span>`;
            if(unit.bleed > 0) container.innerHTML += `<span class="bg-red-800 px-2 py-1 text-xs rounded" title="턴마다 ${unit.bleed} 피해">출혈(${unit.bleed})</span>`;
            if(unit.burn > 0) container.innerHTML += `<span class="bg-orange-800 px-2 py-1 text-xs rounded" title="다음 턴 ${unit.burnDamageCounter} 피해">화상</span>`;
            if(unit.isStunned) container.innerHTML += `<span class="bg-purple-800 px-2 py-1 text-xs rounded">기절</span>`;
            if(unit.cometTurns > 0) container.innerHTML += `<span class="bg-yellow-800 px-2 py-1 text-xs rounded" title="${unit.cometTurns}턴 남음">혜성</span>`;
            unit.buffs.forEach(b => container.innerHTML += `<span class="bg-indigo-800 px-2 py-1 text-xs rounded" title="${b.name}: ${b.turnsLeft-1}턴 남음">${b.stat.toUpperCase()}+</span>`);
            if(unit.nextAttackEffect) container.innerHTML += `<span class="bg-yellow-800 px-2 py-1 text-xs rounded" title="${unit.nextAttackEffect.name}">강화</span>`;
        };
        renderIcons(this.currentEnemy, document.getElementById('enemy-status-icons'));
        renderIcons(this.player, document.getElementById('player-status-icons'));
        this.updateStatsDisplay();
    },
    addCombatLog(message, checkBleed = true) {
        const logEl = document.getElementById('combat-log'); const li = document.createElement('li'); let finalMessage = message;
        if (checkBleed && this.player && this.player.bleed > 0) { finalMessage = `<span class="text-red-500 font-bold animate-pulse">(!출혈)</span> ${message}`; }
        li.innerHTML = finalMessage; li.className = 'text-sm mb-1'; logEl.appendChild(li); logEl.parentElement.scrollTop = logEl.parentElement.scrollHeight;
    },
    toggleCombatActions(enabled) { document.querySelectorAll('.combat-action-btn').forEach(btn => btn.disabled = !enabled); },
    async showCombatCutscene(action) {
        const overlay = document.getElementById('cutscene-overlay'); const textEl = document.getElementById('cutscene-text');
        const actionText = { '공격!': '공격!', '방어!': '방어!', '회피!': '회피!', '도주!': '도주!' }[action] || action;
        textEl.textContent = actionText; overlay.classList.remove('hidden'); textEl.classList.add('cutscene-animate');
        return new Promise(resolve => { setTimeout(() => { overlay.classList.add('hidden'); textEl.classList.remove('cutscene-animate'); resolve(); }, 1500); });
    },
    async showCriticalRoll(type, text) { const overlay = document.getElementById('critical-roll-overlay'); const textEl = document.getElementById('critical-roll-text'); textEl.textContent = text; textEl.className = type === 'success' ? 'critical-hit-animate' : 'critical-fail-animate'; overlay.classList.remove('hidden'); return new Promise(resolve => { setTimeout(() => { overlay.classList.add('hidden'); textEl.className = ''; resolve(); }, 1200); }); },
    displaySpellList() {
        document.getElementById('combat-actions').classList.add('hidden');
        const magicContainer = document.getElementById('magic-view');
        magicContainer.classList.remove('hidden');
        magicContainer.innerHTML = `<div id="spell-grid" class="grid grid-cols-2 gap-4 mb-4"></div><button id="back-to-actions" class="w-full bg-gray-600 hover:bg-gray-700 p-4 rounded-lg">뒤로가기</button>`;
        const spellGrid = document.getElementById('spell-grid');
        this.player.spells.forEach(spellName => {
            const spell = this.knownSpells.find(s => s.name === spellName);
            if (spell) {
                const canCast = this.player.stats.mp >= spell.manaCost;
                const button = document.createElement('button');
                button.innerHTML = `${spell.name}<br><small class="text-blue-300">${spell.manaCost} MP</small>`;
                button.className = `w-full ${canCast ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-500 opacity-50'} p-4 rounded-lg transition duration-300`;
                button.disabled = !canCast;
                button.onclick = async () => {
                    document.getElementById('magic-view').classList.add('hidden');
                    await this.executeAction(this.player, this.currentEnemy, 'magic', spell);
                    this.isPlayerTurn = false;
                    setTimeout(() => this.combatLoop(), 1000);
                };
                spellGrid.appendChild(button);
            }
        });
        document.getElementById('back-to-actions').onclick = () => { magicContainer.classList.add('hidden'); document.getElementById('combat-actions').classList.remove('hidden'); this.toggleCombatActions(true); };
    },
    displayShop() {
        document.getElementById('event-view').classList.add('hidden');
        const shopContainer = document.getElementById('shop-container');
        shopContainer.classList.remove('hidden');
        let purchasedInThisVisit = new Set();
        const renderShopItems = () => {
            shopContainer.innerHTML = `<h2 class="text-2xl font-bold mb-2 text-yellow-400">상점</h2><p class="text-gray-300 mb-6">진귀한 물건들이 있습니다. 마음에 드는 것이 있나요?</p><div id="shop-items-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"></div><button id="leave-shop-btn" class="w-full bg-gray-700 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300">상점을 나선다</button>`;
            const itemsGrid = document.getElementById('shop-items-grid');
            this.shopItems.forEach(item => {
                const isSpellScroll = item instanceof SpellScrollItem;
                const alreadyKnown = isSpellScroll && this.player.spells.includes(item.spellName);
                const canAfford = this.player.gold >= item.price;
                const isPurchased = purchasedInThisVisit.has(item.name);
                const disabled = isPurchased || !canAfford || alreadyKnown;

                const itemCard = document.createElement('div');
                itemCard.className = `bg-gray-900/50 p-4 rounded-lg border border-gray-600 flex justify-between items-center ${disabled ? 'opacity-60' : ''}`;
                let buttonText = `${item.price} G`;
                if(alreadyKnown) buttonText = '습득 완료';
                else if(isPurchased) buttonText = '구매 완료';

                itemCard.innerHTML = `<div><h4 class="font-bold">${item.name}</h4><p class="text-sm text-gray-400">${item.description}</p></div><button data-item-name="${item.name}" class="buy-btn ml-4 flex-shrink-0 text-white font-bold py-2 px-3 rounded-lg transition duration-300 ${disabled ? 'bg-gray-500' : (canAfford ? 'bg-green-600 hover:bg-green-700' : 'bg-red-800')}" ${disabled ? 'disabled' : ''}>${buttonText}</button>`;
                itemsGrid.appendChild(itemCard);
            });
            document.querySelectorAll('.buy-btn').forEach(button => {
                button.onclick = async (e) => {
                    const itemName = e.target.getAttribute('data-item-name');
                    const item = this.shopItems.find(i => i.name === itemName);
                    if (item && this.player.spendGold(item.price)) {
                        this.player.addItem(item);
                        if(!(item instanceof ConsumableItem)) { purchasedInThisVisit.add(item.name); }
                        this.updateStatsDisplay(); await this.saveGame(); renderShopItems();
                    }
                };
            });
            document.getElementById('leave-shop-btn').onclick = async () => { shopContainer.classList.add('hidden'); document.getElementById('event-view').classList.remove('hidden'); await this.nextEvent(); };
        };
        renderShopItems();
    },
    showStatDistribution() {
        this.isStatModalOpen = true;
        const overlay = document.getElementById('stat-distribution-overlay');
        const pointsDisplay = document.getElementById('points-to-distribute');
        const grid = document.getElementById('stat-allocation-grid');
        const confirmBtn = document.getElementById('confirm-stats-btn');
        
        let pointsToSpend = this.player.statPoints;
        let tempIncreases = { str: 0, int: 0, dex: 0, luk: 0 };
        const statsToAllocate = ['str', 'int', 'dex', 'luk'];
        const statKorean = { str: '근력', int: '지성', dex: '민첩', luk: '재주' };

        const render = () => {
            pointsDisplay.textContent = pointsToSpend;
            grid.innerHTML = '';
            statsToAllocate.forEach(stat => {
                const currentStat = this.player.stats[stat];
                const row = document.createElement('div');
                row.className = 'flex justify-between items-center bg-gray-700 p-3 rounded-lg';
                row.innerHTML = `
                    <span class="font-bold text-lg">${statKorean[stat]}</span>
                    <div class="flex items-center gap-4">
                        <span class="text-xl">${currentStat} <span class="text-green-400 font-bold">+${tempIncreases[stat]}</span></span>
                        <button data-stat="${stat}" class="plus-btn w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-full text-xl font-bold" ${pointsToSpend <= 0 ? 'disabled' : ''}>+</button>
                    </div>
                `;
                grid.appendChild(row);
            });

            document.querySelectorAll('.plus-btn').forEach(btn => btn.onclick = (e) => {
                const stat = e.target.dataset.stat;
                if (pointsToSpend > 0) {
                    pointsToSpend--;
                    tempIncreases[stat]++;
                    render();
                }
            });
            confirmBtn.disabled = pointsToSpend > 0;
        };

        confirmBtn.onclick = async () => {
            Object.keys(tempIncreases).forEach(stat => {
                this.player.changeStat(stat, tempIncreases[stat]);
            });
            this.player.statPoints = 0;
            overlay.classList.add('hidden');
            this.isStatModalOpen = false;
            this.updateStatsDisplay();
            await this.saveGame();
            await this.nextEvent(false); // Continue game flow
        };
        
        render();
        overlay.classList.remove('hidden');
    },
    triggerScreenShake() {
        document.getElementById('game-container').classList.add('shake-effect');
        setTimeout(() => {
            document.getElementById('game-container').classList.remove('shake-effect');
        }, 820);
    },
    async checkAndTriggerComet(target) {
        if (target.cometTurns === 0 && target.cometCasterStats) {
            this.addCombatLog(`<span class="text-yellow-500 font-bold">혜성이 ${target.name}의 머리 위로 떨어집니다!</span>`);
            this.triggerScreenShake();
            
            const casterStats = target.cometCasterStats;
            let totalDamage = 0;
            
            const physicalDamage = d(20) + Math.floor(casterStats.str / 2);
            totalDamage += physicalDamage;
            this.addCombatLog(`물리 충격: <span class="text-red-400">${physicalDamage}</span>의 피해!`);
            
            const magicalDamage = d(20) + Math.floor(casterStats.int / 2);
            totalDamage += magicalDamage;
            this.addCombatLog(`마력 폭발: <span class="text-purple-400">${magicalDamage}</span>의 피해!`);

            const trueDamage = d(10) + Math.floor(casterStats.luk / 3);
            totalDamage += trueDamage;
            this.addCombatLog(`운석 파편: <span class="text-gray-300">${trueDamage}</span>의 고정 피해!`);
            
            target.burn = 1;
            target.burnDamageCounter = 5; 
            this.addCombatLog(`<span class="text-orange-400">지속되는 화염으로 5의 화상을 입습니다!</span>`);

            target.stats.hp -= totalDamage;
            target.cometCasterStats = null; 
            await new Promise(res => setTimeout(res, 500)); 
        }
    },
    async generateImage(prompt) {
        // ⚠️ 이 함수는 실제 작동하는 API 키가 필요합니다.
        // ⚠️ 현재는 API 키가 없으므로 이미지가 생성되지 않습니다.
        // ⚠️ 백엔드에서 API를 호출하도록 변경하는 것이 안전합니다.
        console.warn("Gemini API 키가 설정되지 않았습니다. 이미지 생성을 건너뜁니다.");
        return null; 
    },
    initializeItems() { this.shopItems = [ new ConsumableItem('체력 물약', 80, '체력을 50 회복합니다.', 'hp', 50), new ConsumableItem('마나 물약', 60, '마나를 30 회복합니다.', 'mp', 30), new StatUpgradeItem('근력 물약', 50, '근력을 1 올립니다.', 'str', 1), new StatUpgradeItem('지성 물약', 50, '지성을 1 올립니다.', 'int', 1), new StatUpgradeItem('민첩 물약', 50, '민첩을 1 올립니다.', 'dex', 1), new StatUpgradeItem('재주 물약', 50, '재주를 1 올립니다.', 'luk', 1), new EquipmentItem('튼튼한 가죽 갑옷', 300, '최대 체력 +5, 근력 +1.', [{ stat: 'maxHp', value: 5 }, { stat: 'str', value: 1 }]), new SpellScrollItem('양피지: 발화마검술', 250, '마법 [발화마검술] 습득', '발화마검술'), new SpellScrollItem('양피지: 집중', 200, '마법 [집중] 습득', '집중'), new SpellScrollItem('양피지: 신속의 주문', 300, '마법 [신속의 주문] 습득', '신속의 주문'), new SpellScrollItem('양피지: 출혈마검술', 350, '마법 [출혈마검술] 습득', '출혈마검술'), new SpellScrollItem('양피지: 혜성', 1000, '마법 [혜성] 습득', '혜성'), ]; },
    initializeSpells() { this.knownSpells = [ new DamageSpell('불태우기', 5, '6면체 주사위 + (지력/7) 피해, 확률적 화상', { diceSides: 6, stat: 'int', divisor: 7, applyStatus: 'burn', statusDifficulty: 15 }), new BuffSpell('발화마검술', 10, '다음 공격 적중 시 화상 부여', { effectType: 'nextAttack', nextAttackEffect: 'burn' }), new BuffSpell('집중', 5, '1턴간 재주+30, 다음 공격 필중', { effectType: 'combined', stat: 'luk', value: 30, nextAttackEffect: 'autoHit' }), new BuffSpell('신속의 주문', 5, '5턴간 민첩+5', { effectType: 'stat', stat: 'dex', value: 5, duration: 5 }), new BuffSpell('출혈마검술', 10, '다음 공격에 출혈 효과 부여/강화', { effectType: 'nextAttack', nextAttackEffect: 'bleedMagicSword' }), new CometSpell('혜성', 30, '1턴 후 대상에게 혜성을 떨어뜨려 복합 피해'), new MultiHitSpell('초절맹호살격난참', 50, '적에게 5회의 연속 공격을 가합니다.'), ]; },
    initializeEvents() {
        const createRobber = () => {
            const robber = new Enemy('노상강도', { hp: 70, mp: 20, str: 10, int: 8, dex: 10, luk: 10 }, 25);
            robber.hasRobberKnife = true; return robber;
        };
        const createNoehoeng = () => {
            const boss = new BossEnemy('뇌횡', { hp: 500, mp: 100, str: 30, int: 20, dex: 15, luk: 15 }, 500);
            return boss;
        };
        this.events = [
            new GameEvent('shop', "길가에 수상한 여행 상인이 좌판을 벌이고 있습니다. 그의 눈이 번뜩입니다. ", [ new Choice("상점을 둘러본다.", () => game.displayShop()), new Choice("그냥 지나친다.", () => { game.currentEvent = new GameEvent('passShop', "당신은 상인의 제안을 무시하고 갈 길을 계속 갑니다.", [new Choice("다음으로", () => game.nextEvent())]); game.displayCurrentEvent(); }) ], 'A mysterious merchant with glowing eyes at a roadside stall in a fantasy world, digital painting.'),
            new GameEvent('forest', "어두운 숲 속에서 길을 잃었습니다. 희미한 불빛이 보이는 오두막과, 동굴로 이어지는 듯한 샛길이 보입니다. ", [ new Choice("오두막으로 향한다.", () => { game.currentEvent = new GameEvent('hut', "오두막 안에는 노파가 수프를 끓이고 있습니다. '젊은이, 배고프면 좀 들게나.'", [ new Choice("감사히 먹는다.", () => { game.player.changeStat('hp', 20); game.currentEvent = new GameEvent('soup', "따뜻한 수프 덕분에 기운을 되찾았습니다. (+20 HP)", [new Choice("다음으로", () => game.nextEvent())]); game.displayCurrentEvent(); }), new StatCheckChoice("수상하다. 음식을 살핀다. (지성 12)", 'int', 12, { message: "수프에 수면초가 들어간 것을 발견했습니다! 위기를 모면합니다.", action: () => {} }, { message: "아무것도 발견하지 못하고 수프를 마셨습니다. 정신을 잃고 소량의 골드를 도둑맞습니다.", action: () => { game.player.gold = Math.max(0, game.player.gold - 50); } }) ]); game.displayCurrentEvent(); }), new Choice("동굴로 들어간다.", () => { game.currentEvent = new GameEvent('cave', "동굴 안은 축축하고 고블린 무리가 잠들어 있습니다. ", [ new StatCheckChoice("조심스럽게 지나간다. (민첩 14)", 'dex', 14, { message: "당신은 고블린들을 깨우지 않고 무사히 동굴을 빠져나와 낡은 보물상자를 발견했습니다! (골드 +150)", action: () => { game.player.gold += 150; } }, { message: "발을 헛디뎌 고블린들을 깨우고 말았습니다! 겨우 도망쳤지만 부상을 입었습니다.", action: () => { game.player.changeStat('hp', -15); } }), new Choice("모조리 해치운다.", () => game.startCombat(new Enemy('고블린', { hp: 40, mp: 0, str: 10, int: 3, dex: 7, luk: 8 }, 10))) ], 'A dark, damp cave interior with sleeping goblins, fantasy style.'); game.displayCurrentEvent(); }) ], 'A dark forest at night, a faint light from a hut in the distance, a spooky cave entrance, fantasy painting.'),
            new GameEvent('river', "강을 건너야 합니다. 낡은 밧줄 다리가 위태롭게 걸려있고, 강가에는 작은 뗏목이 있습니다. ", [ new StatCheckChoice("밧줄 다리를 건넌다. (민첩 13)", 'dex', 13, { message: "조심스럽게 균형을 잡아 무사히 다리를 건넜습니다.", action: () => {} }, { message: "다리가 무너져내려 강물에 빠졌습니다! 겨우 헤엄쳐 나왔지만 흠뻑 젖었습니다.", action: () => { game.player.changeStat('hp', -10); } }), new StatCheckChoice("뗏목을 타고 건넌다. (재주 10)", 'luk', 10, { message: "운 좋게도 뗏목은 강 건너편까지 당신을 안전하게 데려다 주었습니다.", action: () => {} }, { message: "거센 물살에 뗏목이 뒤집혔습니다. 간신히 강기슭에 도착했지만 기진맥진합니다.", action: () => { game.player.changeStat('hp', -15); } }) ], 'A rickety rope bridge over a raging river, and a small raft on the riverbank, fantasy landscape.'),
            new GameEvent('robber', "인적이 드문 뒷골목을 지나가다 노상강도를 마주쳤습니다!", [ new StatCheckChoice("경비를 부르고 도주한다. (민첩 12)", 'dex', 12, { message: "당신의 외침을 들은 경비병이 달려오자 노상강도는 혀를 차며 어둠 속으로 사라집니다.", action: () => {} }, { message: "소리를 지르기도 전에 노상강도가 앞을 막아섭니다! '어딜 가시나?'", action: () => game.startCombat(createRobber()) }), new Choice("전투한다.", () => game.startCombat(createRobber())) ], 'A dark back alley in a medieval city, a menacing robber ambushing a hero, fantasy art style.'),
            new GameEvent('cometAxeEvent', "하늘에서 작은 유성이 떨어지는 것을 목격합니다. 당신은 그것이 떨어진 숲 속 공터로 향합니다. 그곳에는 불타는 운석 조각에 도끼 자루가 박혀있습니다.", [
                new Choice("도끼를 뽑아든다.", () => {
                    game.player.hasCometAxe = true;
                    game.player.changeStat('str', 10);
                    game.player.changeStat('int', 10);
                    if (!game.player.inventory.includes('혜성의 도끼')) game.player.inventory.push('혜성의 도끼');
                    if (!game.player.spells.includes('혜성')) game.player.spells.push('혜성');
                    game.currentEvent = new GameEvent('getCometAxe', "당신이 도끼를 잡자, 우주의 기운이 몸에 흘러들어옵니다. <br><span class='text-yellow-400'>아이템 획득: 혜성의 도끼 (근력+10, 지력+10)</span><br><span class='text-purple-400'>마법 습득: 혜성</span>", [new Choice("다음으로", () => game.nextEvent())]);
                    game.displayCurrentEvent();
                }),
                new Choice("위험해 보이니 무시한다.", () => {
                    game.currentEvent = new GameEvent('ignoreCometAxe', "당신은 불길한 기운을 느끼고 자리를 떴습니다.", [new Choice("다음으로", () => game.nextEvent())]);
                    game.displayCurrentEvent();
                })
            ], 'A glowing meteorite chunk embedded in the ground in a forest clearing, with an axe handle sticking out of it, fantasy art.'),
            new GameEvent('yamatoEvent', "버려진 사원 폐허에서, 푸른 빛을 내는 정교한 카타나를 발견합니다. 칼집에는 '야마토'라고 새겨져 있습니다.", [
                new StatCheckChoice("검을 뽑아든다. (근력 15, 민첩 15)", 'str', 15, {
                    message: "검을 뽑자, 당신의 민첩함이 검의 속도를 감당해냅니다! <br><span class='text-yellow-400'>아이템 획득: 야마토 (민첩+20, 재주+10)</span>",
                    action: () => {
                        if (game.player.stats.dex >= 15) {
                            game.player.hasYamato = true;
                            game.player.changeStat('dex', 20);
                            game.player.changeStat('luk', 10);
                            if (!game.player.inventory.includes('야마토')) game.player.inventory.push('야마토');
                        } else {
                            game.player.changeStat('hp', -30);
                            game.currentEvent = new GameEvent('failYamato', "검의 날카로운 기운이 당신을 거부합니다! 깊은 상처를 입었습니다. (-30 HP)", [new Choice("다음으로", () => game.nextEvent())]);
                            game.displayCurrentEvent();
                        }
                    }
                }, {
                    message: "검의 날카로운 기운이 당신을 거부합니다! 깊은 상처를 입었습니다. (-30 HP)",
                    action: () => { game.player.changeStat('hp', -30); }
                })
            ], 'A mystical blue-glowing katana resting on an altar in a ruined temple, fantasy digital art.'),
             new GameEvent('shipChallenge', "항구에 정박한 거대한 갤리선에서 소란이 들립니다. '3턴 안에 이 배의 목제 허수아비를 쓰러뜨리는 자에게 막대한 상금을 주겠다!'", [
                new Choice("도전한다.", () => {
                    const trainingDummy = new Enemy('목제 허수아비', { hp: 1000, mp: 0, str: 0, int: 0, dex: 0, luk: 0 }, 0);
                    game.addCombatLog("<span class='text-yellow-400'>도전 시작! 3턴 안에 최대한의 피해를 입히세요!</span>");
                    game.startCombat(trainingDummy, true); // true for special combat
                }),
                new Choice("관심 없다.", () => {
                    game.currentEvent = new GameEvent('ignoreShipChallenge', "당신은 시끄러운 곳을 뒤로 하고 항구를 떠났습니다.", [new Choice("다음으로", () => game.nextEvent())]);
                    game.displayCurrentEvent();
                })
            ], 'A crowd gathered around a large galley ship in a fantasy port, a large wooden training dummy on the deck.'),
            new GameEvent('noehoengEvent', "전설적인 무기를 소지한 당신의 소문을 듣고, 한 명의 거대한 무인이 당신을 찾아왔습니다. '네놈이 가진 그 물건... 내게 넘겨라. 내 이름은 뇌횡. 힘으로 빼앗을 뿐이다.'", [
                new Choice("결투를 받아들인다.", () => {
                    game.startCombat(createNoehoeng());
                }),
                new Choice("무기를 넘기고 도망친다.", () => {
                    let lostItem = '';
                    if(game.player.hasYamato) { game.player.hasYamato = false; game.player.changeStat('dex', -20); game.player.changeStat('luk', -10); lostItem = '야마토'; }
                    else if(game.player.hasCometAxe) { game.player.hasCometAxe = false; game.player.changeStat('str', -10); game.player.changeStat('int', -10); game.player.spells = game.player.spells.filter(s => s !== '혜성'); lostItem = '혜성의 도끼'; }
                    else if(game.player.hasExcalibur) { game.player.hasExcalibur = false; game.player.changeStat('str', -15); game.player.changeStat('hp', -10); game.player.maxHp -= 10; lostItem = '엑스칼리버'; }
                    game.player.inventory = game.player.inventory.filter(i => i !== lostItem);
                    
                    game.currentEvent = new GameEvent('lostLegendary', `당신은 ${lostItem}을(를) 넘기고 굴욕적으로 도망쳤습니다...`, [new Choice("다음으로", () => game.nextEvent())]);
                    game.displayCurrentEvent();
                })
            ], 'A giant, imposing warrior with a massive weapon confronting the player in a dramatic showdown, fantasy art.')
        ];
    }
    // ⬆️ 여기가 복사/붙여넣기 할 코드의 끝입니다 ⬆️
};

// ⭐️ game.start()를 window.onload로 감싸서 DOM 로드 후 실행 보장
window.onload = () => {
    window.game = game; // ⭐️ 이 줄을 추가하세요!
    game.start();
};