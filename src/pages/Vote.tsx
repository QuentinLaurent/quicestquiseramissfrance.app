import {useRef, useState} from "react";
import SelectVote from "../componnents/SelectVote.tsx";
import {candidatesFor, FINISHED_PHASE, Miss, PhaseConfig, PHASES, VoteRecord} from "../lib/game.ts";

interface Props {
    phase: number;
    misses: Miss[];
    votes: VoteRecord[];
    saveVote: (step: number, number: number, miss: Miss) => Promise<void>;
    show: boolean;
}

const Vote = ({phase, misses, votes, saveVote, show}: Props) => {
    // Un seul enregistrement à la fois : le suivant s'appuie sur la liste de votes rechargée.
    const saving = useRef(false);
    const [status, setStatus] = useState<{ ok: boolean, text: string } | null>(null);

    const vote = async (step: number, number: number, miss: Miss) => {
        if (saving.current) return;
        saving.current = true;
        try {
            await saveVote(step, number, miss);
            setStatus({ok: true, text: `Vote enregistré : Miss ${miss.region}`});
        } catch (error) {
            console.error('Erreur lors du traitement du vote:', error);
            setStatus({ok: false, text: "Le vote n'a pas été enregistré. Vérifiez que la phase est encore ouverte et réessayez."});
        } finally {
            saving.current = false;
        }
    }

    const selectedMissAtStep = (step: number, number: number): Miss | null => {
        const vote = votes.find((v) => parseInt(v.phase) === step && v.voteNumber === number);
        return (vote && misses.find((m) => m.id === vote.miss)) || null;
    }

    const renderPhase = (config: PhaseConfig) => {
        if (phase < config.number) return null;
        const open = phase === config.number;
        const selected = config.slots.map((_, i) => selectedMissAtStep(config.number, i + 1));
        return (
            <div key={config.number}>
                <div className="text-center mt-6 font-bold uppercase">
                    {config.title} {!open && <small className="underline">Terminé</small>}
                </div>
                {open && <p className="text-center">{config.intro}<br/><span className="underline">{config.rules}</span></p>}
                {open && <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
                    {config.slots.map((title, i) => (
                        <SelectVote key={i}
                                    title={title}
                                    misses={candidatesFor(config, misses)}
                                    selectedMiss={selected[i]}
                                    takenIds={selected.filter((m, j) => m && j !== i).map((m) => m!.id)}
                                    setVote={(miss) => vote(config.number, i + 1, miss)}></SelectVote>
                    ))}
                </div>}
                {!open && <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 pt-1">
                    {config.slots.map((title, i) => (
                        <div key={i} className="z-10 bg-[#9c272e] text-white shadow text-center leading-1 px-2 py-1 rounded">
                            {config.number === 4 ? title : selected[i]?.region || 'Non sélectionnée'}
                            <br/>
                            <small>{config.number === 4 ? selected[i]?.region || 'Non sélectionnée' : selected[i]?.name}</small>
                        </div>
                    ))}
                </div>}
            </div>
        );
    }

    return (
        <div className={(!show ? 'hidden' : '') + " mb-80"}>
            <p className="text-center uppercase mt-4 text-pretty text-lg font-medium text-gray-900 sm:text-xl/8">
                Mes votes
            </p>

            {status && <p role="status"
                          className={"mx-auto mt-4 max-w-md rounded px-3 py-2 text-center text-sm " + (status.ok ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900")}>
                {status.text}
            </p>}

            {PHASES.map(renderPhase)}

            {phase >= FINISHED_PHASE && <div className="text-center mt-6 font-bold uppercase">Les votes sont terminés</div>}
        </div>
    );
}

export default Vote;
