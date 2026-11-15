import {useMemo, useState} from "react";
import {CheckIcon, MagnifyingGlassIcon} from "@heroicons/react/20/solid";
import Sheet from "./Sheet.tsx";
import {MissPhoto} from "./ui.tsx";
import {Miss} from "../lib/game.ts";

interface Props {
    open: boolean;
    onClose: () => void;
    title: string;
    misses: Miss[];
    selectedId?: string;
    // Miss déjà placées dans les autres cases de la phase.
    takenIds: string[];
    onPick: (miss: Miss) => void;
}

const MissPicker = ({open, onClose, title, misses, selectedId, takenIds, onPick}: Props) => {
    const [search, setSearch] = useState("");

    const shown = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return misses;
        return misses.filter((m) => [m.region, m.name].some((v) => v.toLowerCase().includes(term)));
    }, [misses, search]);

    return (
        <Sheet open={open} onClose={onClose} title={title} subtitle={`${misses.length} candidates en lice`}>
            <label className="relative block">
                <span className="sr-only">Chercher une miss</span>
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-wine-700/50"/>
                <input type="search" placeholder="Région ou nom" value={search}
                       onChange={(e) => setSearch(e.currentTarget.value)} className="field pl-10"/>
            </label>
            <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {shown.map((miss) => {
                    const taken = takenIds.includes(miss.id);
                    const selected = miss.id === selectedId;
                    return (
                        <li key={miss.id}>
                            <button type="button" disabled={taken} aria-pressed={selected}
                                    onClick={() => onPick(miss)}
                                    className={"group relative block w-full overflow-hidden rounded-xl text-left ring-2 transition "
                                        + (selected ? "ring-gold-500" : "ring-transparent")
                                        + (taken ? " opacity-40" : " active:scale-95")}>
                                <MissPhoto miss={miss} className="aspect-[3/4] w-full"/>
                                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-wine-950/90 to-transparent px-2 pb-1.5 pt-6 text-xs font-semibold leading-tight text-white">
                                    {miss.region}
                                </span>
                                {selected && <span className="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-gold-400 text-wine-950">
                                    <CheckIcon className="size-4"/>
                                </span>}
                                {taken && <span className="absolute inset-x-0 top-1.5 text-center text-[11px] font-bold uppercase text-wine-900">
                                    <span className="rounded-full bg-white/90 px-2 py-0.5">Déjà choisie</span>
                                </span>}
                            </button>
                        </li>
                    );
                })}
            </ul>
            {shown.length === 0 && <p className="py-8 text-center text-sm text-ink/60">Aucune miss ne correspond.</p>}
        </Sheet>
    );
}

export default MissPicker;
