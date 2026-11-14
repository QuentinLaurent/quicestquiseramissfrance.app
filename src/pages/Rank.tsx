import {useEffect, useMemo, useState} from "react";
import {computeRanking, editionOf, FINISHED_PHASE, Miss, PHASES, Votant, VoteRecord} from "../lib/game.ts";

interface Props {
    show: boolean;
    phase: number;
    edition: string;
    users: Votant[];
    who?: Votant;
    misses: Miss[];
    allVotes: VoteRecord[];
}

const Rank = ({show, phase, edition, users, who, misses, allVotes}: Props) => {
    const [selectedEdition, setSelectedEdition] = useState(edition);

    useEffect(() => {
        setSelectedEdition(edition)
    }, [edition]);

    const editions = useMemo(() => {
        const all = new Set([edition, ...allVotes.map(editionOf)]);
        return [...all].sort().reverse();
    }, [edition, allVotes]);

    const ranking = useMemo(() => {
        const isCurrent = selectedEdition === edition;
        const votes = allVotes.filter((v) => editionOf(v) === selectedEdition);
        // Une édition passée n'affiche que les joueurs qui y ont participé.
        const players = isCurrent ? users : users.filter((u) => votes.some((v) => v.votant === u.id));
        return computeRanking(players, votes, misses, isCurrent ? phase : FINISHED_PHASE);
    }, [selectedEdition, edition, allVotes, users, misses, phase]);

    const closedPhases = PHASES.filter((p) => selectedEdition !== edition || p.number < phase);

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
                    <li key={line.votant.id}
                        className={"flex items-center gap-3 border-b border-b-gray-500 p-2 " + (line.votant.id === who?.id ? "bg-rose-50" : "")}>
                        <span className="w-8 text-right font-bold tabular-nums text-[#9c272e]">{line.rank}.</span>
                        <span className="flex-1">
                            <span className="block font-bold">{line.votant.nom}</span>
                            {closedPhases.length > 0 && <span className="block text-xs text-gray-500">
                                {closedPhases.map((p) => `Phase ${p.number} : ${line.byPhase[p.number] || 0}`).join(" · ")}
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
