// Fetch card data from Limitless and store it in PokemonTCG.io format
// this program is very hacky and is only intended to get existing data initially

class LimitlessCard {
    data_id: number;
    set: string;
    number: string;
    rarity: number;
    card_type: string; // supertype
    type: string; // energy type OR subtype (for trainer cards)
    hp: number | null;
    stage: string | null;
    special: string | null;
    a1_cost: string | null;
    a1_dmg: string | null;
    a2_cost: string | null;
    a2_dmg: string | null;
    weakness: string | null; // "none" if none, null if not applicable
    retreat: number | null;
    dex_number: number | null;
    language: string;
    name: string;
    ability_name: string | null;
    ability_effect: string | null;
    a1_name: string | null;
    a1_effect: string | null;
    a2_name: string | null;
    a2_effect: string | null;
    effect: string | null;
    illustrator: string;

    constructor(obj: object) {
        for (let k of Object.keys(obj)) {
            this[k] = obj[k];
        }
    }
}
interface Ability {
    type: AbilityType;
    name: string;
    text: string;
}

enum AbilityType {
    ABILITY = "Ability",
}

interface Attack {
    cost: Color[];
    name: string;
    damage: string;
    text: string;
    convertedEnergyCost: number;
}

enum Color {
    COLORLESS = "Colorless",
    DARKNESS = "Darkness",
    FIGHTING = "Fighting",
    FIRE = "Fire",
    GRASS = "Grass",
    LIGHTNING = "Lightning",
    METAL = "Metal",
    PSYCHIC = "Psychic",
    WATER = "Water",
    DRAGON = "Dragon",
}

interface Images {
    small: string;
    large: string;
}

interface Legalities {
    standard: Legality;
}

enum Legality {
    LEGAL = "Legal",
}

enum Rarity {
    ONE_DIAMOND = "Single Diamond",
    TWO_DIAMONDS = "Double Diamond",
    THREE_DIAMONDS = "Triple Diamond",
    FOUR_DIAMONDS = "Quadruple Diamond",
    ONE_STAR = "One Star",
    TWO_STARS = "Two Stars",
    THREE_STARS = "Three Stars",
    CROWN = "Crown",
    PROMO = "Promo",
}

interface Weakness {
    type: Color;
    value: string;
}

enum Subtype {
    BASIC = "Basic",
    STAGE1 = "Stage 1",
    STAGE2 = "Stage 2",
    EX = "ex",
    ITEM = "Item",
    SUPPORTER = "Supporter",
}

enum Supertype {
    POKEMON = "Pokémon",
    TRAINER = "Trainer",
}

class PTCGioCard {
    id: string;//
    name: string;//
    supertype: Supertype;//
    subtypes: Subtype[];//
    hp?: string;//
    types?: Color[];//
    attacks?: Attack[];//
    weaknesses?: Weakness[];//
    retreatCost?: Color[];//
    convertedRetreatCost?: number;//
    number: string;//
    artist?: string;//
    rarity: Rarity;//
    nationalPokedexNumbers?: number[];//
    legalities: Legalities;//
    images: Images;//
    flavorText?: string;// not in limitless data
    evolvesFrom?: string;//
    abilities?: Ability[];//
    rules?: string[];

    static async fromLimitless(lc: LimitlessCard): Promise<PTCGioCard> {
        const ret = new PTCGioCard();
        const promises: Promise<any>[] = []; // list of promises to await at the end

        const ENERGY_TYPE_LOOKUP = {
            "colorless": Color.COLORLESS,
            "darkness": Color.DARKNESS,
            "fighting": Color.FIGHTING,
            "fire": Color.FIRE,
            "grass": Color.GRASS,
            "lightning": Color.LIGHTNING,
            "metal": Color.METAL,
            "psychic": Color.PSYCHIC,
            "water": Color.WATER,
            "dragon": Color.DRAGON,
        }

        const replaceColorInText = (text: string) => {
            return text
            .replaceAll("[C]", "Colorless")
            .replaceAll("[D]", "Darkness")
            .replaceAll("[F]", "Fighting")
            .replaceAll("[R]", "Fire")
            .replaceAll("[G]", "Grass")
            .replaceAll("[L]", "Lightning")
            .replaceAll("[M]", "Metal")
            .replaceAll("[P]", "Psychic")
            .replaceAll("[W]", "Water")
            .replaceAll("[N]", "Dragon");
        };

        // simple conversions
        ret.id = `${lc.set}-${lc.number}`;
        ret.number = lc.number;
        ret.name = lc.name;
        ret.artist = lc.illustrator;

        // rarity (different names)
        const RARITY_LOOKUP = {
            0: Rarity.PROMO,
            1: Rarity.ONE_DIAMOND,
            2: Rarity.TWO_DIAMONDS,
            3: Rarity.THREE_DIAMONDS,
            4: Rarity.FOUR_DIAMONDS,
            5: Rarity.ONE_STAR,
            6: Rarity.TWO_STARS,
            7: Rarity.THREE_STARS,
            8: Rarity.CROWN,
        };
        ret.rarity = RARITY_LOOKUP[lc.rarity ?? 0];

        // supertype
        const CARD_TYPE_LOOKUP = {
            "pokemon": Supertype.POKEMON,
            "trainer": Supertype.TRAINER,
        };
        ret.supertype = CARD_TYPE_LOOKUP[lc.card_type];

        // conditional conversions
        if (ret.supertype == Supertype.POKEMON) ret.types = [ENERGY_TYPE_LOOKUP[lc.type]];
        if (lc.hp) ret.hp = String(lc.hp);
        if (lc.ability_name) ret.abilities = [{ name: lc.ability_name, text: replaceColorInText(lc.ability_effect ?? ""), type: AbilityType.ABILITY }];
        if (lc.retreat !== null) {
            ret.convertedRetreatCost = lc.retreat;
            ret.retreatCost = new Array(ret.convertedRetreatCost).fill(Color.COLORLESS);
        }
        if (lc.weakness && lc.weakness !== "none") ret.weaknesses = [{ type: ENERGY_TYPE_LOOKUP[lc.weakness], value: "+20" }];
        if (lc.dex_number) ret.nationalPokedexNumbers = [lc.dex_number];

        // images
        // just hotlink limitless for now (sorry robin)
        const limitlessImage = `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/${lc.set}/${lc.set}_${lc.number.padStart(3, "0")}_EN.webp`;
        ret.images = {
            large: limitlessImage,
            small: limitlessImage,
        };

        // subtypes (structurally different)
        ret.subtypes = [];
        const TRAINER_TYPE_LOOKUP = {
            "item": Subtype.ITEM,
            "supporter": Subtype.SUPPORTER,
        };
        if (ret.supertype == Supertype.TRAINER) ret.subtypes.push(TRAINER_TYPE_LOOKUP[lc.type]);
        const STAGE_LOOKUP = {
            "basic": Subtype.BASIC,
            "stage1": Subtype.STAGE1,
            "stage2": Subtype.STAGE2,
        };
        if (lc.stage) ret.subtypes.push(STAGE_LOOKUP[lc.stage]);
        if (lc.special === "ex") ret.subtypes.push(Subtype.EX);

        // add evolvesFrom
        if (ret.subtypes.includes(Subtype.STAGE1) || ret.subtypes.includes(Subtype.STAGE2)) {
            promises.push(queryEvolvesFrom(ret.name.replace(/ ex$/, "")).then(evolvesFrom => { ret.evolvesFrom = evolvesFrom }));
        }

        // handle attacks
        if (lc.a1_name) {
            const ENERGY_INITIALS_LOOKUP = {
                "c": Color.COLORLESS,
                "d": Color.DARKNESS,
                "f": Color.FIGHTING,
                "r": Color.FIRE,
                "g": Color.GRASS,
                "l": Color.LIGHTNING,
                "m": Color.METAL,
                "p": Color.PSYCHIC,
                "w": Color.WATER,
            };
            let a1: Attack = {
                cost: Array.from(lc.a1_cost ?? "").map(t => ENERGY_INITIALS_LOOKUP[t]),
                name: lc.a1_name,
                damage: lc.a1_dmg ?? "",
                text: replaceColorInText(lc.a1_effect ?? ""),
                convertedEnergyCost: -1,
            };
            a1.convertedEnergyCost = a1.cost.length;
            ret.attacks = [a1];
            if (lc.a2_name) {
                let a2: Attack = {
                    cost: Array.from(lc.a2_cost ?? "").map(t => ENERGY_INITIALS_LOOKUP[t]),
                    name: lc.a2_name,
                    damage: lc.a2_dmg ?? "",
                    text: replaceColorInText(lc.a2_effect ?? ""),
                    convertedEnergyCost: -1,
                };
                a2.convertedEnergyCost = a2.cost.length;
                ret.attacks.push(a2);
            }
        }

        // rules
        const rules: string[] = [];
        if (lc.effect) rules.push(replaceColorInText(lc.effect));
        if (ret.subtypes.includes(Subtype.ITEM)) rules.push("You may play any number of Item cards during your turn.");
        if (ret.subtypes.includes(Subtype.SUPPORTER)) rules.push("You may play only 1 Supporter card during your turn.");
        if (ret.subtypes.includes(Subtype.EX)) rules.push("ex rule: When your Pokémon ex is Knocked Out, your opponent gets 2 points.");
        if (rules.length) ret.rules = rules;

        // declare everything as legal for now
        ret.legalities = { standard: Legality.LEGAL };

        await Promise.all(promises);
        return ret;
    }
}

async function fetchLimitlessCardByQuery(query: string): Promise<LimitlessCard> {
    const sp = new URLSearchParams();
    sp.append("q", query);
    sp.append("lang", "en");
    const promise = fetch("https://pocket.limitlesstcg.com/api/dm/cards?" + sp)
        .then(resp => resp.json())
        .then(obj => new LimitlessCard(obj[0]));
    promise.catch(e => console.error(e));
    return promise;
}

async function queryEvolvesFrom(species: string): Promise<string> {
    const url = "https://pokeapi.co/api/v2/pokemon-species/" + species.toLowerCase();
    const promise = fetch(url)
        .then(resp => resp.json())
        .then(obj => obj["evolves_from_species"])
        .then(efs => efs? efs["name"].capitalizeFirstLetters() : "{{ERROR}}");
    promise.catch(e => console.error(e));
    return promise;
}

// extend String with capitalizeFirstLetters
declare global {
    interface String {
        capitalizeFirstLetters(): string;
    }
}
// capitalize each letter after a space and at the beginning of the string
String.prototype.capitalizeFirstLetters = function(this: string) {
    if (this.length === 0) return this;
    return this.split(" ").map(word => word.length === 0? word : word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

import { scheduler } from 'timers/promises';
import * as fs from 'fs/promises';

// just iterate through the sets

// A1 (Genetic Apex)
const cardsA1: PTCGioCard[] = [];
for (let i = 1; i <= 286; i++) {
    const lc = await fetchLimitlessCardByQuery(`A1~${i}`);
    const c = await PTCGioCard.fromLimitless(lc);
    cardsA1.push(c);
    scheduler.wait(1000);
}
fs.writeFile("cards/en/A1.json", JSON.stringify(cardsA1, null, 2));

// A1a (Mythical Island)
const cardsA1a: PTCGioCard[] = [];
for (let i = 1; i <= 86; i++) {
    const lc = await fetchLimitlessCardByQuery(`A1a~${i}`);
    const c = await PTCGioCard.fromLimitless(lc);
    cardsA1a.push(c);
    scheduler.wait(1000);
}
fs.writeFile("cards/en/A1a.json", JSON.stringify(cardsA1a, null, 2));

// P-A (Promo-A)
const cardsP_A: PTCGioCard[] = [];
for (let i = 1; i <= 33; i++) {
    const lc = await fetchLimitlessCardByQuery(`P-A~${i}`);
    const c = await PTCGioCard.fromLimitless(lc);
    cardsP_A.push(c);
    scheduler.wait(1000);
}
fs.writeFile("cards/en/P-A.json", JSON.stringify(cardsP_A, null, 2));
