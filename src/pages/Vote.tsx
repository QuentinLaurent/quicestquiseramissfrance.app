import {useState} from "react";
import {CheckIcon, PlusIcon} from "@heroicons/react/20/solid";
import MissPicker from "../components/MissPicker.tsx";
import {EmptyState, MissPhoto, ResultBadge} from "../components/ui.tsx";
import {candidatesFor, FINISHED_PHASE, Miss, PhaseConfig, PHASES, VoteRecord} from "../lib/game.ts";

interface Props {
    phase: number;
    misses: Miss[];
    votes: VoteRecord[];
    loggedIn: boolean;
    vote: (step: number, slot: number, miss: Miss) => Promise<boolean>;
    goLogin: () => void;
    goRank: () => void;
}

const Vote = ({phase, misses, votes, loggedIn, vote, goLogin, goRank}: Props) => {
    const [pickerSlot, setPickerSlot] = useState<number | null>(null);

    if (!loggedIn) {
        return (
            <section>
                <h1 className="page-title">Mes votes</h1>
                <div className="mt-6">
                    <EmptyState title="Connectez-vous pour voter">
                        <p>Vos pronostics sont enregistrés sur votre compte.</p>
                        <button type="button" onClick={goLogin} className="btn-primary mt-4">Se connecter</button>
                    </EmptyState>
                </div>
            </section>
        );
    }

    const selectedAt = (step: number, slot: number): Miss | null => {
        const vote = votes.find((v) => v.phase === step && v.slot === slot);
        return (vote && misses.find((m) => m.id === vote.miss_id)) || null;
    }

    const current = PHASES.find((p) => p.number === phase);
    const currentPicks = current ? current.slots.map((_, i) => selectedAt(current.number, i + 1)) : [];
    const done = currentPicks.filter(Boolean).length;

    const pick = async (miss: Miss) => {
        if (!current || pickerSlot === null) return;
        const slot = pickerSlot;
        setPickerSlot(null);
        await vote(current.number, slot, miss);
    }

    const renderClosed = (config: PhaseConfig) => {
        const picks = config.slots.map((_, i) => selectedAt(config.number, i + 1));
        return (
            <div key={config.number} className="card p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="font-display text-lg font-bold text-wine-900">{config.title}</h2>
                    <span className="rounded-full bg-wine-50 px-3 py-1 text-xs font-semibold text-wine-700">Terminée</span>
                </div>
                <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
                    {config.slots.map((title, i) => {
                        const miss = picks[i];
                        return (
                            <li key={i} className="w-20 shrink-0 text-center">
                                {miss
                                    ? <MissPhoto miss={miss} className="aspect-[3/4] w-full rounded-xl"/>
                                    : <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl border-2 border-dashed border-wine-200 text-xs text-ink/40">Vide</div>}
                                <p className="mt-1 truncate text-xs font-semibold">{miss?.region || "Aucun choix"}</p>
                                {config.number === 4 && <p className="truncate text-[11px] text-ink/50">{title}</p>}
                                {miss?.field && <ResultBadge result={miss.field} className="mt-1 !px-1.5 !text-[10px]"/>}
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    }

    return (
        <section>
            <h1 className="page-title">Mes votes</h1>

            <ol className="mt-4 flex items-center" aria-label="Avancement des phases">
                {PHASES.map((p, i) => {
                    const state = phase > p.number ? "done" : phase === p.number ? "open" : "upcoming";
                    return (
                        <li key={p.number} className={"flex items-center " + (i > 0 ? "flex-1" : "")}>
                            {i > 0 && <span className={"mx-2 h-0.5 flex-1 rounded " + (phase >= p.number ? "bg-gold-400" : "bg-wine-100")}/>}
                            <span aria-current={state === "open" ? "step" : undefined}
                                  className={"inline-flex size-9 items-center justify-center rounded-full text-sm font-bold "
                                      + (state === "done" ? "bg-gold-400 text-wine-950"
                                          : state === "open" ? "bg-wine-600 text-white ring-4 ring-gold-300"
                                              : "bg-wine-100 text-wine-700/60")}>
                                {state === "done" ? <CheckIcon className="size-5"/> : p.number}
                                <span className="sr-only">{p.title}{state === "done" ? ", terminée" : state === "open" ? ", en cours" : ", à venir"}</span>
                            </span>
                        </li>
                    );
                })}
            </ol>

            {current && <div className="card mt-5 overflow-hidden">
                <div className="bg-gradient-to-br from-wine-800 to-wine-950 px-5 py-4 text-white">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="font-display text-xl font-bold">{current.title}</h2>
                        <span className="rounded-full bg-gold-400 px-3 py-1 text-xs font-bold text-wine-950">{done}/{current.slots.length}</span>
                    </div>
                    <p className="mt-1 text-sm text-white/85">{current.intro}</p>
                    <p className="mt-2 text-xs text-gold-300">{current.rules}</p>
                </div>
                <ul className={"grid gap-3 p-4 sm:p-5 " + (current.slots.length === 3 ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-5")}>
                    {current.slots.map((title, i) => {
                        const miss = currentPicks[i];
                        return (
                            <li key={i}>
                                <button type="button" onClick={() => setPickerSlot(i + 1)}
                                        aria-label={miss ? `${title} : Miss ${miss.region}. Changer` : `${title} : choisir une miss`}
                                        className={"relative block aspect-[3/4] w-full overflow-hidden rounded-2xl text-left transition active:scale-[0.98] "
                                            + (miss ? "shadow-sm ring-1 ring-black/5" : "border-2 border-dashed border-wine-200 bg-wine-50 hover:border-gold-500")}>
                                    {miss
                                        ? <>
                                            <MissPhoto miss={miss} className="size-full"/>
                                            <span className="absolute inset-x-0 bottom-0 block bg-gradient-to-t from-wine-950/95 via-wine-950/60 to-transparent px-2 pb-2 pt-10 text-white sm:px-3">
                                                <span className="block break-words font-display text-[13px] font-bold leading-tight sm:text-base">{miss.region}</span>
                                                <span className="block text-[11px] text-gold-300">Changer</span>
                                            </span>
                                        </>
                                        : <span className="flex size-full flex-col items-center justify-center gap-2 text-wine-700">
                                            <span className="inline-flex size-10 items-center justify-center rounded-full bg-white shadow-sm"><PlusIcon className="size-6"/></span>
                                            <span className="text-xs font-semibold">Choisir</span>
                                        </span>}
                                    <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-bold text-wine-800 shadow-sm">
                                        {current.slots.length === 3 ? title : i + 1}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>}

            {phase >= FINISHED_PHASE && <div className="card mt-5 bg-gradient-to-br from-wine-800 to-wine-950 px-5 py-6 text-center text-white">
                <p className="font-display text-xl font-bold">Les votes sont terminés</p>
                <button type="button" onClick={goRank} className="btn-gold mt-4">Voir le classement</button>
            </div>}

            <div className="mt-5 space-y-4">
                {PHASES.filter((p) => p.number < phase).reverse().map(renderClosed)}
            </div>

            {PHASES.some((p) => p.number > phase) && <ul className="mt-5 space-y-2">
                {PHASES.filter((p) => p.number > phase).map((p) => (
                    <li key={p.number} className="flex items-center justify-between rounded-2xl border border-dashed border-wine-200 px-4 py-3 text-sm text-ink/60">
                        <span className="font-semibold">{p.title}</span>
                        <span>À venir</span>
                    </li>
                ))}
            </ul>}

            {current && <MissPicker open={pickerSlot !== null} onClose={() => setPickerSlot(null)}
                                    title={pickerSlot !== null ? current.slots[pickerSlot - 1] : ""}
                                    misses={candidatesFor(current, misses)}
                                    selectedId={pickerSlot !== null ? currentPicks[pickerSlot - 1]?.id : undefined}
                                    takenIds={currentPicks.filter((m, j) => m && j !== (pickerSlot ?? 0) - 1).map((m) => m!.id)}
                                    onPick={pick}/>}
        </section>
    );
}

export default Vote;
