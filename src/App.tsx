import './App.css'
import logo from './assets/logo.svg'
import logoLight from './assets/logo-light.svg'
import {useCallback, useEffect, useMemo, useState} from "react";
import {Bars3Icon} from "@heroicons/react/20/solid";
import {Dialog, DialogPanel} from "@headlessui/react";
import {XMarkIcon} from "@heroicons/react/16/solid";
import PocketBase from "pocketbase";
import Home from "./pages/Home.tsx";
import Vote from "./pages/Vote.tsx";
import Rank from "./pages/Rank.tsx";
import SelectWho from "./pages/SelectWho.tsx";
import {editionOf, LEGACY_EDITION, Miss, Votant, VoteRecord} from "./lib/game.ts";


const baseUrl = import.meta.env.VITE_PB_URL || "https://quicestquiseramissfrance.fr";
const WHO_STORAGE_KEY = "qcqsmf.votant";

const client = new PocketBase(baseUrl);
client.autoCancellation(false);

const storedWhoId = () => {
    try {
        return localStorage.getItem(WHO_STORAGE_KEY);
    } catch {
        return null;
    }
}

const storeWhoId = (id: string | null) => {
    try {
        if (id) localStorage.setItem(WHO_STORAGE_KEY, id);
        else localStorage.removeItem(WHO_STORAGE_KEY);
    } catch {
        // stockage indisponible (navigation privée) : on redemandera au prochain chargement
    }
}

function App() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [page, setPage] = useState("")
    const [phase, setPhase] = useState(1);
    // Édition en cours. Tant que la clé EDITION n'existe pas dans `gestion`, tout appartient à l'édition historique.
    const [edition, setEdition] = useState(LEGACY_EDITION);
    const [editionEnabled, setEditionEnabled] = useState(false);
    const [allMisses, setAllMisses] = useState<Miss[]>([]);
    const [who, setWhoState] = useState<Votant>();
    const [allVotes, setAllVotes] = useState<VoteRecord[]>([]);
    const [users, setUsers] = useState<Votant[]>([]);

    const setWho = (user?: Votant) => {
        storeWhoId(user ? user.id : null);
        setWhoState(user);
        setPage(user ? "home" : "");
    }

    const loadGestion = useCallback(async () => {
        const items = await client.collection('gestion').getFullList<{ key: string, value: string }>();
        const value = (key: string) => items.find((item) => item.key === key)?.value?.trim();
        setPhase(parseInt(value("PHASE") || "") || 1);
        setEdition(value("EDITION") || LEGACY_EDITION);
        setEditionEnabled(!!value("EDITION"));
    }, []);

    const loadMisses = useCallback(async () => {
        const items = await client.collection("miss").getFullList<Miss>();
        setAllMisses(items.map((item) => ({
            ...item,
            photoUrl: item.photo ? `${baseUrl}/api/files/miss/${item.id}/${item.photo}` : undefined,
        })));
    }, []);

    // Le paramètre `votant` permet au serveur de renvoyer aussi mes votes de la phase en cours
    // (voir pocketbase/README.md) ; ceux des autres n'arrivent qu'à la clôture de la phase.
    const loadVotes = useCallback(async (votantId?: string) => {
        const items = await client.collection('vote').getFullList<VoteRecord>(votantId ? {query: {votant: votantId}} : {});
        setAllVotes(items);
    }, []);

    useEffect(() => {
        loadGestion().catch(console.error);
        loadMisses().catch(console.error);
        client.collection('votant').getFullList<Votant>({sort: 'nom'}).then((response) => {
            setUsers(response);
            const stored = response.find((u) => u.id === storedWhoId());
            if (stored) {
                setWhoState(stored);
                setPage("home");
            }
        }).catch(console.error);

        client.collection('gestion').subscribe('*', () => loadGestion().catch(console.error)).catch(console.error);
        // Les résultats sont saisis sur les miss : le classement suit en direct.
        client.collection('miss').subscribe('*', () => loadMisses().catch(console.error)).catch(console.error);
        return () => {
            client.collection('gestion').unsubscribe('*').catch(() => {});
            client.collection('miss').unsubscribe('*').catch(() => {});
        }
    }, [loadGestion, loadMisses]);

    // À chaque changement de joueur, de phase ou d'édition : les votes visibles changent.
    useEffect(() => {
        loadVotes(who?.id).catch(console.error);
    }, [who, phase, edition, loadVotes]);

    const misses = useMemo(() => allMisses.filter((m) => editionOf(m) === edition), [allMisses, edition]);
    const votes = useMemo(
        () => allVotes.filter((v) => v.votant === who?.id && editionOf(v) === edition),
        [allVotes, who, edition],
    );

    const saveVote = async (step: number, number: number, miss: Miss) => {
        if (!who) throw new Error("Aucun votant sélectionné");
        if (step !== phase) throw new Error("Cette phase de vote est fermée");
        const existing = votes.find((v) => parseInt(v.phase) === step && v.voteNumber === number);
        try {
            if (existing) {
                await client.collection('vote').update(existing.id, {miss: miss.id});
            } else {
                await client.collection('vote').create({
                    phase: step.toString(),
                    votant: who.id,
                    miss: miss.id,
                    voteNumber: number,
                    ...(editionEnabled ? {edition} : {}),
                });
            }
        } finally {
            await loadVotes(who.id).catch(console.error);
        }
    }

  return (
    <div className="bg-white">
        <header className="absolute inset-x-0 top-0 z-50">
            <nav aria-label="Global" className="flex items-center justify-between p-6 lg:px-8">
                <div className="flex lg:flex-1 lg:flex-col">
                    {who && <span>
                        <span>Votant:&nbsp;</span><span className="font-bold">{who.nom}</span>
                        <button type="button" onClick={() => setWho(undefined)} className="ml-2 text-sm text-gray-500 underline">Changer</button>
                    </span>}
                </div>
                <div className="flex lg:hidden">
                <button
                        type="button"
                        onClick={() => setMobileMenuOpen(true)}
                        className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
                    >
                        <span className="sr-only">Ouvrir le menu</span>
                        <Bars3Icon aria-hidden="true" className="size-6"/>
                    </button>
                </div>
                <div className="hidden lg:flex lg:gap-x-12">
                        <a onClick={() => setPage("home")} className="cursor-pointer text-sm/6 font-semibold text-gray-900">
                            Les Miss
                        </a>
                        <a onClick={() => setPage("my-vote")} className="cursor-pointer text-sm/6 font-semibold text-gray-900">
                            Mes votes
                        </a>
                        <a onClick={() => setPage("rank")} className="cursor-pointer text-sm/6 font-semibold text-gray-900">
                            Le classement
                        </a>
                </div>
                <div className="hidden lg:flex lg:flex-col lg:flex-1 lg:items-end">

                </div>
            </nav>
            <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
                <div className="fixed inset-0 z-50"/>
                <DialogPanel
                    className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
                    <div className="flex items-center justify-between">
                        <a href="#" className="-m-1.5 p-1.5">
                            <img
                                alt=""
                                src={logoLight}
                                className="h-8 w-auto"
                            />
                        </a>
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(false)}
                            className="-m-2.5 rounded-md p-2.5 text-gray-700"
                        >
                            <span className="sr-only">Fermer menu</span>
                            <XMarkIcon aria-hidden="true" className="size-6"/>
                        </button>
                    </div>
                    <div className="mt-6 flow-root">
                        <div className="-my-6 divide-y divide-gray-500/10">
                            <div className="space-y-2 py-6">
                                <a onClick={() => {setMobileMenuOpen(false);setPage("home")}} className="cursor-pointer -mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50">
                                    Les Miss
                                </a>
                                <a onClick={() => {setMobileMenuOpen(false);setPage("my-vote")}} className="cursor-pointer -mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50">
                                    Mes votes
                                </a>
                                <a onClick={() => {setMobileMenuOpen(false);setPage("rank")}} className="cursor-pointer -mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50">
                                    Le classement
                                </a>
                            </div>
                        </div>
                    </div>
                </DialogPanel>
            </Dialog>
        </header>

        <div className="relative isolate px-6 pt-14 lg:px-8">
            <div
                aria-hidden="true"
                className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
            >
                <div
                    style={{
                        clipPath:
                            'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                    }}
                    className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                />
            </div>
            <div className="mx-auto max-w-2xl py-4 sm:py-6 lg:py-8">

                <div className="text-center">
                    <div className="flex justify-center">
                        <img
                            alt=""
                            src={logo}
                            className="h-40 w-auto"
                        />
                    </div>
                </div>
            </div>

            <SelectWho show={page === ""} users={users} setWho={setWho}></SelectWho>
            <Home show={page === "home"} misses={misses}></Home>
            {who
                ? <Vote show={page === "my-vote"} phase={phase} misses={misses} votes={votes} saveVote={saveVote}></Vote>
                : page === "my-vote" && <p className="p-6 text-center">
                    <button type="button" onClick={() => setPage("")} className="underline">Choisissez d'abord qui vous êtes</button>
                </p>}
            <Rank show={page === "rank"} phase={phase} edition={edition} users={users} who={who} misses={allMisses} allVotes={allVotes}></Rank>


        </div>
    </div>
  )
}

export default App
