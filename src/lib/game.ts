// Règles du jeu : types, candidates par phase et barème affiché aux joueurs.
// Le calcul des scores est fait côté base (fonction mf_ranking, voir supabase/migrations) :
// toute modification du barème doit être reportée aux deux endroits.

export interface Miss {
    id: string;
    edition: string;
    name: string;
    region: string;
    // Résultat saisi pendant l'émission ("Top 15", "Miss France"…), vide sinon.
    field: string;
    age: number | null;
    work: string;
    photoUrl?: string;
}

export interface Player {
    id: string;
    name: string;
    has_code: boolean;
}

export interface VoteRecord {
    phase: number;
    slot: number;
    miss_id: string;
}

export interface RankingRow {
    player_id: string;
    name: string;
    p1: number;
    p2: number;
    p3: number;
    p4: number;
    tierce: boolean;
    total: number;
}

// Niveau atteint par une miss, déduit du résultat saisi dans Supabase.
export const LEVEL = {NONE: 0, TOP15: 1, TOP5: 2, SECOND_DAUPHINE: 3, FIRST_DAUPHINE: 4, MISS_FRANCE: 5} as const;

export const levelOf = (miss?: Miss): number => {
    const field = (miss?.field || "").trim().toLowerCase();
    if (field === "miss france") return LEVEL.MISS_FRANCE;
    if (/^1\s*(e|è)re dauphine/.test(field)) return LEVEL.FIRST_DAUPHINE;
    if (/^2\s*(e|è)me dauphine/.test(field)) return LEVEL.SECOND_DAUPHINE;
    if (field === "top 5" || field.includes("dauphine")) return LEVEL.TOP5;
    if (field === "top 15") return LEVEL.TOP15;
    return LEVEL.NONE;
};

export interface PhaseConfig {
    number: number;
    title: string;
    intro: string;
    rules: string;
    slots: string[];
    // Barème détaillé, affiché dans le classement.
    scoring: { label: string, points: number }[];
    // Niveau minimum pour être proposée au vote (les éliminées disparaissent).
    minLevel: number;
}

const FIVE_SLOTS = [1, 2, 3, 4, 5].map((i) => `Miss numéro ${i}`);

// Barème dégressif : plus on parie tôt, plus un bon pronostic rapporte.
// Le calcul réel est fait par la fonction mf_ranking (supabase/migrations) : garder les deux alignés.
const phase = (config: Omit<PhaseConfig, "rules">): PhaseConfig => ({
    ...config,
    rules: config.scoring.map((rule) => `${rule.label} : +${rule.points}`).join(" · "),
});

export const PHASES: PhaseConfig[] = [
    phase({
        number: 1,
        title: "1ère phase de vote",
        intro: "Avant l'émission, choisir 5 miss sur photo.",
        slots: FIVE_SLOTS,
        scoring: [
            {label: "Miss France", points: 10},
            {label: "Autre finaliste du Top 5", points: 4},
            {label: "Demi-finaliste du Top 15", points: 1},
        ],
        minLevel: LEVEL.NONE,
    }),
    phase({
        number: 2,
        title: "2ème phase de vote",
        intro: "Avant le vote des 15, choisir 5 miss.",
        slots: FIVE_SLOTS,
        scoring: [
            {label: "Miss France", points: 8},
            {label: "Autre finaliste du Top 5", points: 3},
            {label: "Demi-finaliste du Top 15", points: 1},
        ],
        minLevel: LEVEL.NONE,
    }),
    phase({
        number: 3,
        title: "3ème phase de vote",
        intro: "Avant le vote des 5 dernières, choisir 5 miss.",
        slots: FIVE_SLOTS,
        scoring: [
            {label: "Miss France", points: 6},
            {label: "1ère ou 2ème dauphine", points: 3},
            {label: "Autre finaliste du Top 5", points: 1},
        ],
        minLevel: LEVEL.TOP15,
    }),
    phase({
        number: 4,
        title: "4ème phase de vote",
        intro: "Le tiercé gagnant.",
        slots: ["Miss France", "1ère dauphine", "2ème dauphine"],
        scoring: [
            {label: "Miss France", points: 4},
            {label: "1ère dauphine", points: 2},
            {label: "2ème dauphine", points: 2},
            {label: "Bonus tiercé dans l'ordre", points: 4},
        ],
        minLevel: LEVEL.TOP5,
    }),
];

export const FINISHED_PHASE = PHASES.length + 1;

// Miss encore en course pour une phase. Tant que les résultats de l'étape
// précédente ne sont pas saisis dans l'admin, on propose toute la liste.
export const candidatesFor = (phase: PhaseConfig, misses: Miss[]): Miss[] => {
    if (phase.minLevel === LEVEL.NONE) return misses;
    const remaining = misses.filter((m) => levelOf(m) >= phase.minLevel);
    return remaining.length >= phase.slots.length ? remaining : misses;
};
