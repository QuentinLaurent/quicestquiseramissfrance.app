import {useEffect, useMemo, useState} from "react";
import {ChevronDownIcon} from "@heroicons/react/20/solid";
import {Avatar, EmptyState} from "../components/ui.tsx";
import {Miss, PHASES, RankingRow} from "../lib/game.ts";
import {supabase} from "../lib/supabase.ts";

interface Props {
    phase: number;
    edition: string;
    editions: string[];
    who?: { id: string };
    // Les résultats sont saisis sur les miss : tout changement recalcule le classement.
    misses: Miss[];
}

const MEDALS = [
    "bg-gradient-to-br from-gold-300 to-gold-500 text-wine-950",
    "bg-gradient-to-br from-zinc-200 to-zinc-400 text-zinc-900",
    "bg-gradient-to-br from-amber-600 to-amber-800 text-white",
];

const Rank = ({phase, edition, editions, who, misses}: Props) => {
    const [selectedEdition, setSelectedEdition] = useState(edition);
    const [rows, setRows] = useState<RankingRow[] | null>(null);

    useEffect(() => {
        setSelectedEdition(edition)
    }, [edition]);

    useEffect(() => {
        if (!selectedEdition) return;
        let cancelled = false;
        supabase.rpc('mf_ranking', {p_edition: selectedEdition}).then(({data, error}) => {
            if (error) console.error(error);
            else if (!cancelled) setRows(data);
        });
        return () => {
            cancelled = true;
        }
    }, [selectedEdition, phase, misses]);

    const ranking = useMemo(() => {
        const sorted = [...(rows ?? [])].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "fr"));
        const ranks: number[] = [];
        sorted.forEach((row, i) => ranks.push(i > 0 && sorted[i - 1].total === row.total ? ranks[i - 1] : i + 1));
        return sorted.map((row, i) => ({...row, rank: ranks[i]}));
    }, [rows]);

    const closedPhases = PHASES.filter((p) => selectedEdition !== edition || p.number < phase);
    const pointsOf = (row: RankingRow, number: number) => [row.p1, row.p2, row.p3, row.p4][number - 1];
    const scored = closedPhases.length > 0;

    return (
        <section>
            <h1 className="page-title">Classement</h1>
            <p className="text-sm text-ink/60">Miss France {selectedEdition}</p>

            {editions.length > 1 && <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Édition">
                {editions.map((e) => (
                    <button key={e} type="button" role="tab" aria-selected={e === selectedEdition} onClick={() => setSelectedEdition(e)}
                            className={"min-h-9 rounded-full px-4 text-sm font-semibold " + (e === selectedEdition ? "bg-wine-600 text-white" : "bg-white text-wine-700 ring-1 ring-wine-200")}>
                        {e}
                    </button>
                ))}
            </div>}

            {!scored && <p className="mt-4 rounded-2xl bg-gold-100 px-4 py-3 text-sm text-wine-900">
                Les points arrivent à la clôture de la 1ère phase de vote.
            </p>}

            {rows !== null && ranking.length === 0 && <div className="mt-6">
                <EmptyState title="Personne n'est encore inscrit">Le classement se remplira avec les premiers joueurs.</EmptyState>
            </div>}

            <ol className="mt-5 space-y-2">
                {ranking.map((line) => {
                    const me = line.player_id === who?.id;
                    return (
                        <li key={line.player_id}
                            className={"flex items-center gap-3 rounded-2xl px-3 py-3 sm:px-4 " + (me ? "bg-wine-900 text-white shadow-md" : "card")}>
                            <span className={"inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums "
                                + (scored && line.rank <= 3 && line.total > 0 ? MEDALS[line.rank - 1] : me ? "bg-white/15 text-white" : "bg-wine-50 text-wine-700")}>
                                {line.rank}
                            </span>
                            <Avatar name={line.name} className="hidden sm:inline-flex"/>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold">{line.name}{me && <span className="ml-2 text-xs font-normal text-gold-300">vous</span>}</span>
                                {scored && <span className={"block truncate text-xs " + (me ? "text-white/70" : "text-ink/50")}>
                                    {closedPhases.map((p) => `P${p.number} : ${pointsOf(line, p.number)}`).join(" · ")}
                                    {line.tierce && " · tiercé dans l'ordre"}
                                </span>}
                            </span>
                            <span className="text-right">
                                <span className="block font-display text-xl font-bold tabular-nums leading-none">{line.total}</span>
                                <span className={"text-[11px] " + (me ? "text-white/70" : "text-ink/50")}>{line.total > 1 ? "points" : "point"}</span>
                            </span>
                        </li>
                    );
                })}
            </ol>

            <details className="card group mt-6" open={!scored}>
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold text-wine-900 sm:px-5 [&::-webkit-details-marker]:hidden">
                    Comment sont comptés les points ?
                    <ChevronDownIcon className="size-5 shrink-0 transition group-open:rotate-180"/>
                </summary>
                <div className="space-y-4 border-t border-wine-100 px-4 py-4 text-sm sm:px-5">
                    <p className="text-ink/70">
                        Quatre phases de vote se succèdent pendant la soirée. Chaque bon pronostic rapporte des points,
                        ajoutés au classement dès que la phase est clôturée.
                    </p>
                    <ol className="grid gap-3 sm:grid-cols-2">
                        {PHASES.map((p) => (
                            <li key={p.number} className="rounded-xl bg-wine-50 p-3">
                                <p className="font-display text-base font-bold text-wine-900">{p.title}</p>
                                <p className="text-xs text-ink/60">{p.intro}</p>
                                <ul className="mt-2 space-y-1">
                                    {p.scoring.map((rule) => (
                                        <li key={rule.label} className="flex items-baseline justify-between gap-3">
                                            <span>{rule.label}</span>
                                            <span className="shrink-0 font-bold tabular-nums text-wine-700">+{rule.points} {rule.points > 1 ? "pts" : "pt"}</span>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ol>
                    <ul className="list-disc space-y-1 pl-5 text-ink/70">
                        <li>Une même miss ne peut être choisie qu'une fois par phase.</li>
                        <li>Vos choix restent modifiables tant que la phase est ouverte.</li>
                        <li>Dans le tiercé, une miss du podium rapporte ses points même placée dans la mauvaise case ; le bonus demande l'ordre exact.</li>
                        <li>En cas d'égalité, les joueurs partagent le même rang.</li>
                    </ul>
                </div>
            </details>
        </section>
    );
}

export default Rank;
