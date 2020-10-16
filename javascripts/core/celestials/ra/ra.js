"use strict";

class RaPetState {
  /**
   * @abstract
   */
  get data() { throw new NotImplementedError(); }

  /**
   * @abstract
   */
  get name() { throw new NotImplementedError(); }

  /**
   * @abstract
   */
  get requiredUnlock() { throw new NotImplementedError(); }

  get isUnlocked() {
    return this.requiredUnlock === undefined || Ra.has(this.requiredUnlock);
  }

  get level() {
    return this.data.level;
  }

  set level(value) {
    this.data.level = value;
  }

  get memories() {
    return this.data.memories;
  }

  set memories(value) {
    this.data.memories = value;
  }

  get memoryChunks() {
    return this.data.memoryChunks;
  }

  set memoryChunks(value) {
    this.data.memoryChunks = value;
  }

  get requiredMemories() {
    return Ra.requiredMemoriesForLevel(this.level);
  }

  /**
   * @abstract
   */
  get rawMemoryChunksPerSecond() { throw new NotImplementedError(); }

  /**
   * @abstract
   */
  get color() { throw new NotImplementedError(); }

  get memoryChunksPerSecond() {
    let res = this.canGetMemoryChunks ? this.rawMemoryChunksPerSecond : 0;
    res *= RA_UNLOCKS.TT_BOOST.effect.memoryChunks();
    res *= this.chunkUpgradeCurrentMult;
    if (this.hasRecollection) res *= RA_UNLOCKS.RA_RECOLLECTION_UNLOCK.effect;
    return res;
  }

  get canGetMemoryChunks() {
    return this.isUnlocked && Ra.isRunning;
  }

  get hasRecollection() {
    return Ra.petWithRecollection === this.name;
  }

  get memoryUpgradeCurrentMult() {
    return Math.pow(1.3, this.data.memoryUpgrades);
  }

  get chunkUpgradeCurrentMult() {
    return Math.pow(1.5, this.data.chunkUpgrades);

  }

  get memoryUpgradeCost() {
    return 1000 * Math.pow(5, this.data.memoryUpgrades);
  }

  get chunkUpgradeCost() {
    return 5000 * Math.pow(25, this.data.chunkUpgrades);
  }

  get canBuyMemoryUpgrade() {
    return this.memoryUpgradeCost <= this.memories;
  }

  get canBuyChunkUpgrade() {
    return this.chunkUpgradeCost <= this.memories;
  }

  get memoryUpgradeCapped() {
    return this.memoryUpgradeCost >= 0.5 * Ra.requiredMemoriesForLevel(24);
  }

  get chunkUpgradeCapped() {
    return this.chunkUpgradeCost >= 0.5 * Ra.requiredMemoriesForLevel(24);
  }

  purchaseMemoryUpgrade() {
    if (!this.canBuyMemoryUpgrade || this.memoryUpgradeCapped) return;

    this.memories -= this.memoryUpgradeCost;
    this.data.memoryUpgrades++;
  }

  purchaseChunkUpgrade() {
    if (!this.canBuyChunkUpgrade || this.chunkUpgradeCapped) return;

    this.memories -= this.chunkUpgradeCost;
    this.data.chunkUpgrades++;
  }

  levelUp() {
    if (this.memories < this.requiredMemories) return;

    this.memories -= this.requiredMemories;
    this.level++;
    Ra.checkForUnlocks();
  }

  tick(realDiff, generateChunks) {
    const seconds = realDiff / 1000;
    const newMemoryChunks = generateChunks
      ? seconds * this.memoryChunksPerSecond
      : 0;
    // Adding memories from half of the gained chunks this tick results in the best mathematical behavior
    // for very long simulated ticks
    const newMemories = seconds * (this.memoryChunks + newMemoryChunks / 2) * Ra.productionPerMemoryChunk() *
      this.memoryUpgradeCurrentMult;
    this.memoryChunks += newMemoryChunks;
    this.memories += newMemories;
  }

  reset() {
    this.data.level = 1;
    this.data.memories = 0;
    this.data.memoryChunks = 0;
    this.data.memoryUpgrades = 0;
    this.data.chunkUpgrades = 0;
  }
}

const Ra = {
  pets: {
    teresa: new class TeresaRaPetState extends RaPetState {
      get name() { return "Teresa"; }
      get data() { return player.celestials.ra.pets.teresa; }
      get requiredUnlock() { return undefined; }
      get rawMemoryChunksPerSecond() { return 4 * Math.pow(player.eternityPoints.pLog10() / 1e4, 3); }
      get color() { return "#8596ea"; }
      get memoryProductionMultiplier() {
        return Ra.has(RA_UNLOCKS.TERESA_XP)
          ? 1 + Math.pow(player.reality.realityMachines.pLog10() / 100, 0.5)
          : 1;
      }
    }(),
    effarig: new class EffarigRaPetState extends RaPetState {
      get name() { return "Effarig"; }
      get data() { return player.celestials.ra.pets.effarig; }
      get requiredUnlock() { return RA_UNLOCKS.EFFARIG_UNLOCK; }
      get rawMemoryChunksPerSecond() { return 4 * Math.pow(Effarig.shardsGained, 0.1); }
      get color() { return "#ea8585"; }
      get memoryProductionMultiplier() {
        return Ra.has(RA_UNLOCKS.EFFARIG_XP)
          ? 1 + player.records.bestReality.glyphLevel / 7000
          : 1;
      }
    }(),
    enslaved: new class EnslavedRaPetState extends RaPetState {
      get name() { return "Enslaved"; }
      get data() { return player.celestials.ra.pets.enslaved; }
      get requiredUnlock() { return RA_UNLOCKS.ENSLAVED_UNLOCK; }
      get rawMemoryChunksPerSecond() { return 4 * Math.pow(player.timeShards.pLog10() / 3e5, 2); }
      get color() { return "#f1aa7f"; }
      get memoryProductionMultiplier() {
        return Ra.has(RA_UNLOCKS.ENSLAVED_XP)
          ? 1 + Math.log10(player.records.totalTimePlayed) / 200
          : 1;
      }
    }(),
    v: new class VRaPetState extends RaPetState {
      get name() { return "V"; }
      get data() { return player.celestials.ra.pets.v; }
      get requiredUnlock() { return RA_UNLOCKS.V_UNLOCK; }
      get rawMemoryChunksPerSecond() { return 4 * Math.pow(player.infinityPower.pLog10() / 1e7, 1.5); }
      get color() { return "#ead584"; }
      get memoryProductionMultiplier() {
        return Ra.has(RA_UNLOCKS.V_XP)
          ? 1 + Ra.totalPetLevel / 50
          : 1;
      }
    }(),
  },
  // Dev/debug function for easier testing
  reset() {
    const data = player.celestials.ra;
    data.unlockBits = 0;
    data.run = false;
    data.charged = new Set();
    data.disCharge = false;
    data.peakGamespeed = 1;
    for (const pet of Ra.pets.all) pet.reset();
  },
  // Scans through all glyphs and fills base resources to the maximum allowed by the cap
  // TODO update/delete this function when we get back to alchemy, it's outdated since it's not linear any more
  fillAlchemyResources() {
    for (const resource of AlchemyResources.base) {
      resource.amount = Math.min(this.alchemyResourceCap, player.records.bestReality.glyphLevel);
    }
  },
  memoryTick(realDiff, generateChunks) {
    for (const pet of Ra.pets.all) pet.tick(realDiff, generateChunks);
  },
  productionPerMemoryChunk() {
    let res = RA_UNLOCKS.TT_BOOST.effect.memories() * Achievement(168).effectOrDefault(1);
    for (const pet of Ra.pets.all) {
      if (pet.isUnlocked) res *= pet.memoryProductionMultiplier;
    }
    return res;
  },
  // This is the exp required ON "level" in order to reach "level + 1"
  requiredMemoriesForLevel(level) {
    if (level >= 25) return Infinity;
    const adjustedLevel = level + Math.pow(level, 2) / 10;
    const post15Scaling = Math.pow(1.5, Math.max(0, level - 15));
    return Math.floor(Math.pow(adjustedLevel, 5.52) * post15Scaling * 1e6);
  },
  // Calculates the cumulative exp needed to REACH a level starting from nothing.
  // TODO mathematically optimize this once Ra exp curves and balancing are finalized
  totalExpForLevel(maxLevel) {
    let runningTotal = 0;
    for (let lv = 1; lv < maxLevel; lv++) runningTotal += this.requiredMemoriesForLevel(lv);
    return runningTotal;
  },
  get totalPetLevel() {
    return this.pets.all.map(pet => (pet.isUnlocked ? pet.level : 0)).sum();
  },
  checkForUnlocks() {
    if (!V.has(V_UNLOCKS.RA_UNLOCK)) return;
    for (const unl of Object.values(RA_UNLOCKS)) {
      const isUnlockable = unl.totalLevels === undefined
        ? unl.pet.isUnlocked && unl.pet.level >= unl.level
        : this.totalPetLevel >= unl.totalLevels;
      if (isUnlockable && !this.has(unl)) {
        // eslint-disable-next-line no-bitwise
        player.celestials.ra.unlockBits |= (1 << unl.id);
        if (unl.id === RA_UNLOCKS.ALWAYS_GAMESPEED.id) {
          const allGlyphs = player.reality.glyphs.active
            .concat(player.reality.glyphs.inventory);
          for (const glyph of allGlyphs) {
            Glyphs.applyGamespeed(glyph);
          }
        }
      }
    }
  },
  has(info) {
    // eslint-disable-next-line no-bitwise
    return Boolean(player.celestials.ra.unlockBits & (1 << info.id));
  },
  initializeRun() {
    clearCelestialRuns();
    player.celestials.ra.run = true;
  },
  toggleMode() {
    player.celestials.ra.activeMode = !player.celestials.ra.activeMode;
  },
  gamespeedDTMult() {
    if (!Ra.has(RA_UNLOCKS.PEAK_GAMESPEED)) return 1;
    return Math.max(Math.pow(Math.log10(player.celestials.ra.peakGamespeed) - 90, 3), 1);
  },
  // This gets widely used in lots of places since the relevant upgrade is "all forms of continuous non-dimension
  // production", which in this case is infinities, eternities, replicanti, dilated time, and time theorem generation.
  // It also includes the 1% IP time study, Teresa's 1% EP upgrade, and the charged RM generation upgrade. Note that
  // removing the hardcap of 10 may cause runaways.
  theoremBoostFactor() {
    if (!Ra.has(RA_UNLOCKS.TT_BOOST)) return 0;
    return Math.min(10, Math.max(0, player.timestudy.theorem.pLog10() - 350) / 50);
  },
  get isRunning() {
    return player.celestials.ra.run;
  },
  get totalCharges() {
    return Math.min(12, Math.floor(Ra.pets.teresa.level / 2));
  },
  get chargesLeft() {
    return this.totalCharges - player.celestials.ra.charged.size;
  },
  get chargeUnlocked() {
    return V.has(V_UNLOCKS.RA_UNLOCK) && Ra.pets.teresa.level > 1;
  },
  get petWithRecollection() {
    return player.celestials.ra.petWithRecollection;
  },
  set petWithRecollection(name) {
    player.celestials.ra.petWithRecollection = name;
  },
  applyAlchemyReactions() {
    if (!Ra.has(RA_UNLOCKS.EFFARIG_UNLOCK)) return;
    const sortedReactions = AlchemyReactions.all
      .compact()
      .sort((r1, r2) => r2.priority - r1.priority);
    for (const reaction of sortedReactions) {
      reaction.combineReagents();
    }
  },
  updateAlchemyFlow() {
    const expAvgFactor = player.options.updateRate / 1000;
    for (const resource of AlchemyResources.all) {
      resource.flow = (1 - expAvgFactor) * resource.flow + expAvgFactor * (resource.amount - resource.before);
      resource.before = resource.amount;
    }
  },
  get alchemyResourceCap() {
    return 25000;
  },
  get momentumValue() {
    const hoursFromUnlock = TimeSpan.fromMilliseconds(player.celestials.ra.momentumTime).totalHours;
    return Math.clampMax(1 + 0.002 * hoursFromUnlock, AlchemyResource.momentum.effectValue);
  }
};

const GlyphAlteration = {
  // Adding a secondary effect to some effects
  get additionThreshold() {
    return 1e36;
  },
  // One-time massive boost of a single effect
  get empowermentThreshold() {
    return 1e43;
  },
  // Scaling boost from sacrifice quantity
  get boostingThreshold() {
    return 1e60;
  },
  getSacrificePower(type) {
    const sacPower = player.reality.glyphs.sac[type];
    if (sacPower === undefined) {
      throw new Error("Unknown sacrifice type");
    }
    return sacPower;
  },
  get isUnlocked() {
    return Ra.has(RA_UNLOCKS.ALTERED_GLYPHS);
  },
  isAdded(type) {
    return this.isUnlocked && this.getSacrificePower(type) >= this.additionThreshold;
  },
  isEmpowered(type) {
    return this.isUnlocked && this.getSacrificePower(type) >= this.empowermentThreshold;
  },
  isBoosted(type) {
    return this.isUnlocked && this.getSacrificePower(type) >= this.boostingThreshold;
  },
  sacrificeBoost(type) {
    return Math.log10(Math.max(this.getSacrificePower(type) / this.boostingThreshold, 1)) / 2;
  },
  getAdditionColor(type) {
    return this.isAdded(type)
      ? "#CCCCCC"
      : undefined;
  },
  getEmpowermentColor(type) {
    return this.isEmpowered(type)
      ? "#EEEE30"
      : undefined;
  },
  getBoostColor(type) {
    return this.isBoosted(type)
      ? "#60DDDD"
      : undefined;
  },
};

/**
 * @type {RaPetState[]}
 */
Ra.pets.all = [Ra.pets.teresa, Ra.pets.effarig, Ra.pets.enslaved, Ra.pets.v];

const RA_UNLOCKS = {
  AUTO_TP: {
    id: 0,
    description: "Unlock Teresa",
    reward: "Tachyon Particles are given immediately when Time Dilation is active",
    pet: Ra.pets.teresa,
    level: 1,
    displayIcon: `<span class="fas fa-atom"></span>`
  },
  CHARGE: {
    id: 1,
    description: "Get Teresa to level 2",
    reward: () => `Unlock Charged Infinity Upgrades. You get one more maximum
      Charged Infinity Upgrade every ${formatInt(2)} levels`,
    pet: Ra.pets.teresa,
    level: 2,
    displayIcon: `<span class="fas fa-infinity"></span>`
  },
  TERESA_XP: {
    id: 2,
    description: "Get Teresa to level 5",
    reward: "All Memory Chunks produce more Memories based on Reality Machines",
    pet: Ra.pets.teresa,
    level: 5,
    displayIcon: `Δ`
  },
  ALTERED_GLYPHS: {
    id: 3,
    description: "Get Teresa to level 8",
    reward: "Unlock Altered Glyphs, which grant new effects to glyphs based on Glyph Sacrifice",
    pet: Ra.pets.teresa,
    level: 10,
    displayIcon: `<span class="fas fa-bolt"></span>`
  },
  EFFARIG_UNLOCK: {
    id: 4,
    description: "Get Teresa to level 10",
    reward: "Unlock Effarig's Memories",
    pet: Ra.pets.teresa,
    level: 8,
    displayIcon: `Ϙ`
  },
  PERK_SHOP_INCREASE: {
    id: 5,
    description: "Get Teresa to level 15",
    reward: "Perk shop caps are raised",
    pet: Ra.pets.teresa,
    level: 15,
    displayIcon: `<span class="fas fa-project-diagram"></span>`
  },
  START_TP: {
    id: 6,
    description: "Get Teresa to level 25",
    reward: `When unlocking Time Dilation in non-celestial Realities, gain Tachyon Particles as if you reached
      the square root of your total antimatter in Dilation`,
    effect: () => player.records.totalAntimatter.pow(0.5),
    pet: Ra.pets.teresa,
    level: 25,
    displayIcon: `<i class="far fa-dot-circle"></i>`
  },
  EXTRA_CHOICES_AND_RELIC_SHARD_RARITY_ALWAYS_MAX: {
    id: 7,
    description: "Unlock Effarig",
    reward: () => `Get ${formatX(2)} glyph choices and the bonus to glyph rarity from Relic Shards
      is always its maximum value`,
    pet: Ra.pets.effarig,
    level: 1,
    displayIcon: `<i class="fas fa-grip-horizontal"></i>`
  },
  GLYPH_ALCHEMY: {
    id: 8,
    description: "Get Effarig to level 2",
    reward: `Unlock Glyph Alchemy, which adds alchemical resources you can increase
    by refining glyphs, and unlocking more resources through Effarig levels (unlocks a new Reality tab)`,
    pet: Ra.pets.effarig,
    level: 2,
    displayIcon: `<span class="fas fa-vial"></span>`
  },
  EFFARIG_XP: {
    id: 9,
    description: "Get Effarig to level 5",
    reward: "All Memory Chunks produce more Memories based on highest glyph level",
    pet: Ra.pets.effarig,
    level: 5,
    displayIcon: `<span class="fas fa-clone"></span>`
  },
  GLYPH_EFFECT_COUNT: {
    id: 10,
    description: "Get Effarig to level 8",
    reward: () => `Glyphs always have ${formatInt(4)} effects, and Effarig glyphs can now have up to ${formatInt(7)}`,
    pet: Ra.pets.effarig,
    level: 10,
    displayIcon: `<span class="fas fa-braille"></span>`
  },
  ENSLAVED_UNLOCK: {
    id: 11,
    description: "Get Effarig to level 10",
    reward: "Unlock Enslaved's Memories",
    pet: Ra.pets.effarig,
    level: 8,
    displayIcon: `<span class="fas fa-link"></span>`
  },
  SHARD_LEVEL_BOOST: {
    id: 12,
    description: "Get Effarig to level 15",
    reward: "Glyph level is increased based on Relic Shards gained",
    effect: () => 100 * Math.pow(Math.log10(Math.max(Effarig.shardsGained, 1)), 2),
    pet: Ra.pets.effarig,
    level: 15,
    displayIcon: `<span class="fas fa-fire"></span>`
  },
  MAX_RARITY_AND_SHARD_SACRIFICE_BOOST: {
    id: 13,
    description: "Get Effarig to level 25",
    reward: () => `Glyphs are always generated with ${formatPercents(1)} rarity and ` +
      `Glyph Sacrifice gain is raised to a power based on Relic Shards`,
    pet: Ra.pets.effarig,
    level: 25,
    displayIcon: `<i class="fas fa-ankh"></i>`
  },
  AUTO_BLACK_HOLE_POWER: {
    id: 14,
    description: "Unlock Enslaved",
    reward: "Black Hole power upgrades are bought automatically",
    pet: Ra.pets.enslaved,
    level: 1,
    displayIcon: `<span class="fas fa-circle"></span>`
  },
  IMPROVED_STORED_TIME: {
    id: 15,
    description: "Get Enslaved to level 2",
    reward: "Stored game time is amplified and you can store more real time, increasing with Enslaved levels",
    effect: {
      gameTimeAmplification: () => 1 + Math.clampMax(Ra.pets.enslaved.level, 25) / 100,
      realTimeCap: () => 1000 * 3600 * Ra.pets.enslaved.level,
    },
    pet: Ra.pets.enslaved,
    level: 2,
    displayIcon: `<span class="fas fa-history"></span>`
  },
  ENSLAVED_XP: {
    id: 16,
    description: "Get Enslaved to level 5",
    reward: "All Memory Chunks produce more Memories based on total time played",
    pet: Ra.pets.enslaved,
    level: 5,
    displayIcon: `<span class="fas fa-stopwatch"></span>`
  },
  ADJUSTABLE_STORED_TIME: {
    id: 17,
    description: "Get Enslaved to level 8",
    reward: () => `Black Hole charging can be done at an adjustable rate and automatically
      pulsed every ${formatInt(5)} ticks (new features in The Enslaved Ones' tab)`,
    pet: Ra.pets.enslaved,
    level: 10,
    displayIcon: `<span class="fas fa-expand-arrows-alt"></span>`
  },
  V_UNLOCK: {
    id: 18,
    description: "Get Enslaved to level 10",
    reward: "Unlock V's Memories",
    pet: Ra.pets.enslaved,
    level: 8,
    displayIcon: `⌬`
  },
  PEAK_GAMESPEED: {
    id: 19,
    description: "Get Enslaved to level 15",
    reward: "Gain more Dilated Time based on peak game speed in each Reality",
    pet: Ra.pets.enslaved,
    level: 15,
    displayIcon: `<span class="fas fa-tachometer-alt"></span>`
  },
  ALWAYS_GAMESPEED: {
    id: 20,
    description: "Get Enslaved to level 25",
    reward: `All basic glyphs gain the increased game speed effect from time glyphs,
      and time glyphs gain an additional effect`,
    pet: Ra.pets.enslaved,
    level: 25,
    displayIcon: `<span class="fas fa-clock"></span>`
  },
  AUTO_REALITY_UPGRADES: {
    id: 21,
    description: "Unlock V",
    reward: "The rebuyable Reality upgrades are bought automatically",
    pet: Ra.pets.v,
    level: 1,
    displayIcon: `<span class="fas fa-sync-alt"></span>`
  },
  INSTANT_AUTOEC: {
    id: 22,
    description: "Get V to level 2",
    reward: () => `Auto-Eternity Challenges happen instantly and Time Dilation is unlocked automatically
      at ${formatInt(17000)} Time Theorems`,
    pet: Ra.pets.v,
    level: 2,
    displayIcon: `<span class="fas fa-fast-forward"></span>`
  },
  V_XP: {
    id: 23,
    description: "Get V to level 5",
    reward: () => `All Memory Chunks produce more Memories based on total Celestial levels,
      and unlock a Triad Study every ${formatInt(5)} levels (see bottom of the Time Studies page)`,
    pet: Ra.pets.v,
    level: 5,
    displayIcon: `<span class="fas fa-book"></span>`
  },
  HARD_V: {
    id: 24,
    description: "Get V to level 8",
    reward: "Unlock Hard V-Achievements",
    pet: Ra.pets.v,
    level: 8,
    displayIcon: `<span class="fas fa-trophy"></span>`
  },
  TT_BOOST: {
    id: 25,
    description: "Get V to level 10",
    reward: "Time Theorems boost all forms of continuous non-dimension production",
    effect: {
      ttGen: () => Math.pow(10, 5 * Ra.theoremBoostFactor()),
      eternity: () => Math.pow(10, 2 * Ra.theoremBoostFactor()),
      infinity: () => Math.pow(10, 15 * Ra.theoremBoostFactor()),
      replicanti: () => Math.pow(10, 20 * Ra.theoremBoostFactor()),
      dilatedTime: () => Math.pow(10, 3 * Ra.theoremBoostFactor()),
      memories: () => 1 + Ra.theoremBoostFactor() / 50,
      memoryChunks: () => 1 + Ra.theoremBoostFactor() / 50,
      autoPrestige: () => 1 + 2.4 * Ra.theoremBoostFactor()
    },
    pet: Ra.pets.v,
    level: 10,
    displayIcon: `<span class="fas fa-university"></span>`
  },
  TT_ACHIEVEMENT: {
    id: 26,
    description: "Get V to level 15",
    reward: "Achievement multiplier applies to Time Theorem generation",
    effect: () => Achievements.power,
    pet: Ra.pets.v,
    level: 15,
    displayIcon: `<span class="fas fa-graduation-cap"></span>`
  },
  ACHIEVEMENT_POW: {
    id: 27,
    description: "Get V to level 25",
    reward: () => `Achievement multiplier is raised ${formatPow(1.5, 1, 1)}`,
    pet: Ra.pets.v,
    level: 25,
    displayIcon: `<i class="fab fa-buffer"></i>`
  },
  RA_RECOLLECTION_UNLOCK: {
    id: 28,
    description: "Get 20 total Celestial Memory levels",
    reward: "Unlock Recollection",
    effect: 3,
    totalLevels: 20,
  }
};
