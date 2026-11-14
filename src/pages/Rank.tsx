import {useEffect, useMemo, useState} from "react";
import {Miss, PHASES, Player, RankingRow} from "../lib/game.ts";
import {supabase} from "../lib/supabase.ts";

interface Props {
    show: boolean;
    phase: number;
    edition: string;
    editions: string[];
    who?: Player;
    // Les résultats sont saisis sur les miss : tout changement recalcule le classement.
    misses: Miss[];
}

const Rank = ({show, phase, edition, editions, who, misses}: Props) => {
    const [selectedEdition, setSelectedEdition] = useState(edition);
    const [rows, setRows] = useState<RankingRow[]>([]);

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
        const sorted = [...rows].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "fr"));
        const ranks: number[] = [];
        sorted.forEach((row, i) => ranks.push(i > 0 && sorted[i - 1].total === row.total ? ranks[i - 1] : i + 1));
        return sorted.map((row, i) => ({...row, rank: ranks[i]}));
    }, [rows]);

    const closedPhases = PHASES.filter((p) => selectedEdition !== edition || p.number < phase);
    const pointsOf = (row: RankingRow, number: number) => [row.p1, row.p2, row.p3, row.p4][number - 1];

    return (
        <div className={!show ? 'hidden' : ''}>
            <p className="text-center uppercase mt-4 text-pretty text-lg font-medium text-gray-900 sm:text-xl/8">
                Classement !
            </p>
            {editions.length > 1 && <div className="mt-4 flex flex-wrap justify-center gap-2">
                {editions.map((e) => (
                    <button key={e} onClick={() => setSelectedEdition(e)}
                            className={"rounded px-3 py-1 text-sm font-bold " + (e === selectedEdition ? "bg-[#9c272e] text-white" : "bg-gray-200")}>
                        Miss France {e}
                    </button>
                ))}
            </div>}
            {closedPhases.length === 0 && <p className="mt-4 text-center text-sm text-gray-600">
                Les points arrivent à la clôture de la 1ère phase.
            </p>}
            <ol className="m-auto max-w-[500px] my-10">
                {ranking.map((line) => (
                    <li key={line.player_id}
                        className={"flex items-center gap-3 border-b border-b-gray-500 p-2 " + (line.player_id === who?.id ? "bg-rose-50" : "")}>
                        <span className="w-8 text-right font-bold tabular-nums text-[#9c272e]">{line.rank}.</span>
                        <span className="flex-1">
                            <span className="block font-bold">{line.name}</span>
                            {closedPhases.length > 0 && <span className="block text-xs text-gray-500">
                                {closedPhases.map((p) => `Phase ${p.number} : ${pointsOf(line, p.number)}`).join(" · ")}
                                {line.tierce && " · tiercé dans l'ordre"}
                            </span>}
                        </span>
                        <span className="font-bold tabular-nums">{line.total} {line.total > 1 ? "points" : "point"}</span>
                    </li>
                ))}
            </ol>
        </div>
    );
}

export default Rank;
