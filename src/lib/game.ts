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
    // Niveau minimum pour être proposée au vote (les éliminées disparaissent).
    minLevel: number;
}

const FIVE_SLOTS = [1, 2, 3, 4, 5].map((i) => `Miss numéro ${i}`);

export const POINTS = {
    missFrance: 5,
    top5: 2,
    top15: 1,
    phase3First: 2,
    phase3Second: 1,
    phase4First: 3,
    phase4Second: 2,
    tierceBonus: 8,
};

export const PHASES: PhaseConfig[] = [
    {
        number: 1,
        title: "1ère phase de vote",
        intro: "Avant l'émission, choisir 5 miss sur photo.",
        rules: `${POINTS.missFrance} points si vous avez trouvé Miss France, ${POINTS.top5} points pour une miss dans les 5 dernières.`,
        slots: FIVE_SLOTS,
        minLevel: LEVEL.NONE,
    },
    {
        number: 2,
        title: "2ème phase de vote",
        intro: "Avant le vote des 15, choisir 5 miss.",
        rules: `${POINTS.missFrance} points si vous avez trouvé Miss France, ${POINTS.top5} points pour une miss dans les 5 dernières, ${POINTS.top15} point dans les 15 dernières.`,
        slots: FIVE_SLOTS,
        minLevel: LEVEL.NONE,
    },
    {
        number: 3,
        title: "3ème phase de vote",
        intro: "Avant le vote des 5 dernières, choisir 5 miss.",
        rules: `${POINTS.missFrance} points si vous avez trouvé Miss France, ${POINTS.phase3First} points pour la 1ère dauphine, ${POINTS.phase3Second} point pour la 2ème dauphine.`,
        slots: FIVE_SLOTS,
        minLevel: LEVEL.TOP15,
    },
    {
        number: 4,
        title: "4ème phase de vote",
        intro: "Le tiercé gagnant.",
        rules: `${POINTS.missFrance} points si vous avez trouvé Miss France, ${POINTS.phase4First} points pour la 1ère dauphine, ${POINTS.phase4Second} points pour la 2ème dauphine. ${POINTS.tierceBonus} points bonus si le tiercé est dans l'ordre.`,
        slots: ["Miss France", "1ère dauphine", "2ème dauphine"],
        minLevel: LEVEL.TOP5,
    },
];

export const FINISHED_PHASE = PHASES.length + 1;

// Miss encore en course pour une phase. Tant que les résultats de l'étape
// précédente ne sont pas saisis dans l'admin, on propose toute la liste.
export const candidatesFor = (phase: PhaseConfig, misses: Miss[]): Miss[] => {
    if (phase.minLevel === LEVEL.NONE) return misses;
    const remaining = misses.filter((m) => levelOf(m) >= phase.minLevel);
    return remaining.length >= phase.slots.length ? remaining : misses;
};
