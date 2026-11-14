// Règles du jeu : types, éditions, candidates par phase et barème.
// Le texte affiché aux joueurs et le calcul des scores partent des mêmes constantes.

export interface Miss {
    id: string;
    name: string;
    region: string;
    field: string;
    age: number;
    work: string;
    photo?: string;
    photoUrl?: string;
    edition?: string;
}

export interface Votant {
    id: string;
    nom: string;
}

export interface VoteRecord {
    id: string;
    phase: string;
    votant: string;
    miss: string;
    voteNumber: number;
    edition?: string;
}

// Les données saisies avant l'ajout du champ `edition` appartiennent à cette édition.
export const LEGACY_EDITION = "2025";

export const editionOf = (record: { edition?: string }) => record.edition || LEGACY_EDITION;

// Niveau atteint par une miss, déduit du champ `field` saisi dans l'admin.
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

const pointsFor = (phase: number, level: number): number => {
    if (level === LEVEL.MISS_FRANCE) return POINTS.missFrance;
    if (phase === 1) return level >= LEVEL.TOP5 ? POINTS.top5 : 0;
    if (phase === 2) return level >= LEVEL.TOP5 ? POINTS.top5 : level === LEVEL.TOP15 ? POINTS.top15 : 0;
    if (phase === 3) {
        if (level === LEVEL.FIRST_DAUPHINE) return POINTS.phase3First;
        return level === LEVEL.SECOND_DAUPHINE ? POINTS.phase3Second : 0;
    }
    if (phase === 4) {
        if (level === LEVEL.FIRST_DAUPHINE) return POINTS.phase4First;
        return level === LEVEL.SECOND_DAUPHINE ? POINTS.phase4Second : 0;
    }
    return 0;
};

export interface ScoreLine {
    votant: Votant;
    total: number;
    byPhase: Record<number, number>;
    tierce: boolean;
    rank: number;
}

// Classement d'une édition. Seules les phases clôturées (numéro < currentPhase) comptent,
// et une même miss ne rapporte qu'une fois par phase.
export const computeRanking = (
    votants: Votant[],
    votes: VoteRecord[],
    misses: Miss[],
    currentPhase: number,
): ScoreLine[] => {
    const missById = new Map(misses.map((m) => [m.id, m]));
    const lines = votants.map((votant) => {
        const byPhase: Record<number, number> = {};
        const seen = new Set<string>();
        const exact = new Set<number>();
        const mine = votes
            .filter((v) => v.votant === votant.id)
            .sort((a, b) => a.voteNumber - b.voteNumber);
        for (const vote of mine) {
            const phase = parseInt(vote.phase);
            if (!(phase >= 1 && phase < currentPhase)) continue;
            const key = `${phase}:${vote.miss}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const level = levelOf(missById.get(vote.miss));
            byPhase[phase] = (byPhase[phase] || 0) + pointsFor(phase, level);
            if (phase === 4) {
                const expected = [LEVEL.MISS_FRANCE, LEVEL.FIRST_DAUPHINE, LEVEL.SECOND_DAUPHINE][vote.voteNumber - 1];
                if (expected === level) exact.add(vote.voteNumber);
            }
        }
        const tierce = exact.size === 3;
        if (tierce) byPhase[4] = (byPhase[4] || 0) + POINTS.tierceBonus;
        const total = Object.values(byPhase).reduce((a, b) => a + b, 0);
        return {votant, total, byPhase, tierce, rank: 0};
    });
    lines.sort((a, b) => b.total - a.total || a.votant.nom.localeCompare(b.votant.nom, "fr"));
    lines.forEach((line, i) => {
        line.rank = i > 0 && lines[i - 1].total === line.total ? lines[i - 1].rank : i + 1;
    });
    return lines;
};
