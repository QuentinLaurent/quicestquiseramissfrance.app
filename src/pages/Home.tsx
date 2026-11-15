import {useMemo, useState} from "react";
import {HeartIcon, MagnifyingGlassIcon} from "@heroicons/react/20/solid";
import Sheet from "../components/Sheet.tsx";
import {EmptyState, MissPhoto, ResultBadge} from "../components/ui.tsx";
import {Miss} from "../lib/game.ts";

// Ce que le joueur peut faire d'une miss depuis sa fiche, pour la phase en cours.
export type PickState =
    | { kind: "picked", slot: string }
    | { kind: "available" }
    | { kind: "full" }
    | { kind: "eliminated" }
    | { kind: "closed" }
    | { kind: "anonymous" };

interface Props {
    misses: Miss[];
    loading: boolean;
    pickStateOf: (miss: Miss) => PickState;
    onPick: (miss: Miss) => Promise<boolean>;
    goVotes: () => void;
    goLogin: () => void;
}

const Home = ({misses, loading, pickStateOf, onPick, goVotes, goLogin}: Props) => {
    const [search, setSearch] = useState("");
    const [openId, setOpenId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const shown = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return misses;
        return misses.filter((m) =>
            [m.name, m.work, m.region, m.field, m.age].some((value) => String(value ?? "").toLowerCase().includes(term))
        );
    }, [misses, search]);

    const opened = misses.find((m) => m.id === openId);
    const openedState = opened ? pickStateOf(opened) : null;

    const pick = async (miss: Miss) => {
        setBusy(true);
        await onPick(miss);
        setBusy(false);
    }

    return (
        <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="page-title">Les candidates</h1>
                    <p className="text-sm text-ink/60">{misses.length} miss régionales en lice</p>
                </div>
                <label className="relative block w-full sm:w-72">
                    <span className="sr-only">Filtrer les miss</span>
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-wine-700/50"/>
                    <input type="search" placeholder="Région, nom, âge…" value={search}
                           onChange={(e) => setSearch(e.currentTarget.value)} className="field pl-10"/>
                </label>
            </div>

            {loading && <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4" aria-hidden="true">
                {Array.from({length: 8}, (_, i) => <li key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-wine-100"/>)}
            </ul>}

            {!loading && shown.length === 0 && <div className="mt-8">
                <EmptyState title={misses.length ? "Aucune miss ne correspond" : "Les candidates arrivent bientôt"}>
                    {misses.length ? "Essayez un autre mot-clé." : "La liste sera publiée avant l'émission."}
                </EmptyState>
            </div>}

            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
                {shown.map((m) => {
                    const state = pickStateOf(m);
                    return (
                        <li key={m.id}>
                            <button type="button" onClick={() => setOpenId(m.id)}
                                    className="group relative block w-full overflow-hidden rounded-2xl bg-wine-100 text-left shadow-sm ring-1 ring-black/5 transition active:scale-[0.98]">
                                <MissPhoto miss={m} className="aspect-[3/4] w-full transition duration-300 group-hover:scale-105"/>
                                <span className="absolute inset-x-0 bottom-0 block bg-gradient-to-t from-wine-950/95 via-wine-950/60 to-transparent px-3 pb-3 pt-12 text-white">
                                    <span className="block font-display text-base font-bold leading-tight sm:text-lg">Miss {m.region}</span>
                                    <span className="block truncate text-xs text-white/80">{m.name}{m.age ? `, ${m.age} ans` : ""}</span>
                                </span>
                                {m.field && <ResultBadge result={m.field} className="absolute left-2 top-2"/>}
                                {state.kind === "picked" && <span title="Dans vos choix"
                                    className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-white text-wine-600 shadow">
                                    <HeartIcon className="size-4"/>
                                    <span className="sr-only">Dans vos choix</span>
                                </span>}
                            </button>
                        </li>
                    );
                })}
            </ul>

            <Sheet open={!!opened} onClose={() => setOpenId(null)}
                   title={opened ? `Miss ${opened.region}` : ""}
                   subtitle={opened ? `${opened.name}${opened.age ? `, ${opened.age} ans` : ""}` : undefined}>
                {opened && openedState && <div className="grid gap-5 sm:grid-cols-2">
                    <MissPhoto miss={opened} className="aspect-[3/4] w-full rounded-2xl"/>
                    <div className="flex flex-col gap-4">
                        {opened.field && <div><ResultBadge result={opened.field}/></div>}
                        {opened.work && <p className="text-ink/80">{opened.work}</p>}
                        <div className="mt-auto flex flex-col gap-2">
                            {openedState.kind === "picked" && <p className="rounded-xl bg-wine-50 px-4 py-3 text-sm text-wine-800">
                                Dans vos choix de la phase en cours ({openedState.slot}).
                            </p>}
                            {openedState.kind === "available" && <button type="button" disabled={busy} onClick={() => pick(opened)} className="btn-primary">
                                <HeartIcon className="size-5"/> Ajouter à mes choix
                            </button>}
                            {openedState.kind === "full" && <p className="rounded-xl bg-wine-50 px-4 py-3 text-sm text-wine-800">
                                Vos choix de la phase sont complets. Remplacez une miss depuis « Mes votes ».
                            </p>}
                            {openedState.kind === "eliminated" && <p className="rounded-xl bg-wine-50 px-4 py-3 text-sm text-wine-800">
                                Cette miss n'est plus en course pour la phase en cours.
                            </p>}
                            {openedState.kind === "anonymous" && <button type="button" onClick={goLogin} className="btn-primary">
                                Se connecter pour voter
                            </button>}
                            {(openedState.kind === "picked" || openedState.kind === "full") && <button type="button" onClick={goVotes} className="btn-ghost">
                                Voir mes votes
                            </button>}
                        </div>
                    </div>
                </div>}
            </Sheet>
        </section>
    );
}

export default Home;
