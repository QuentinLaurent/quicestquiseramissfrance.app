import './App.css'
import logo from './assets/logo.svg'
import logoLight from './assets/logo-light.svg'
import {useCallback, useEffect, useMemo, useState} from "react";
import {Bars3Icon} from "@heroicons/react/20/solid";
import {Dialog, DialogPanel} from "@headlessui/react";
import {XMarkIcon} from "@heroicons/react/16/solid";
import Home from "./pages/Home.tsx";
import Vote from "./pages/Vote.tsx";
import Rank from "./pages/Rank.tsx";
import Admin from "./pages/Admin.tsx";
import SelectWho from "./pages/SelectWho.tsx";
import {Miss, Player, VoteRecord} from "./lib/game.ts";
import {photoUrl, supabase} from "./lib/supabase.ts";


const SESSION_STORAGE_KEY = "qcqsmf.session";

interface Me {
    id: string;
    name: string;
}

const storedToken = (): string | null => {
    try {
        const session = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "null");
        return typeof session?.token === "string" ? session.token : null;
    } catch {
        return null;
    }
}

const storeToken = (token: string | null) => {
    try {
        if (token) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({token}));
        else localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
        // stockage indisponible (navigation privée) : il faudra se reconnecter au prochain chargement
    }
}

function App() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [page, setPage] = useState("")
    const [phase, setPhase] = useState(1);
    const [edition, setEdition] = useState("");
    const [allMisses, setAllMisses] = useState<Miss[]>([]);
    const [token, setToken] = useState<string | null>(null);
    const [who, setWho] = useState<Me>();
    const [votes, setVotes] = useState<VoteRecord[]>([]);
    const [users, setUsers] = useState<Player[]>([]);

    const loadGame = useCallback(async () => {
        const {data, error} = await supabase.from('mf_game').select('edition, phase').single();
        if (error) throw error;
        setPhase(data.phase);
        setEdition(data.edition);
    }, []);

    const loadMisses = useCallback(async () => {
        const {data, error} = await supabase.from('mf_misses')
            .select('id, edition, region, name, age, work, photo, result').order('region');
        if (error) throw error;
        setAllMisses(data.map((row) => ({
            id: row.id,
            edition: row.edition,
            region: row.region,
            name: row.name,
            age: row.age,
            work: row.work,
            field: row.result ?? "",
            photoUrl: photoUrl(row.photo),
        })));
    }, []);

    const loadPlayers = useCallback(async () => {
        const {data, error} = await supabase.from('mf_players').select('id, name, has_code').order('name');
        if (error) throw error;
        setUsers(data);
    }, []);

    const logout = useCallback((current?: string | null) => {
        if (current) supabase.rpc('mf_sign_out', {p_token: current}).then(() => undefined, () => undefined);
        storeToken(null);
        setToken(null);
        setWho(undefined);
        setVotes([]);
        setPage("");
    }, []);

    const loadVotes = useCallback(async (current: string) => {
        const {data, error} = await supabase.rpc('mf_my_votes', {p_token: current});
        if (error) {
            // Session supprimée côté serveur (mot de passe réinitialisé, joueur supprimé).
            if (error.code === '28000') logout();
            throw error;
        }
        setVotes(data);
    }, [logout]);

    const open = (result: { token: string, id: string, name: string }) => {
        storeToken(result.token);
        setToken(result.token);
        setWho({id: result.id, name: result.name});
        setPage("home");
    }

    // Les deux renvoient un message d'erreur, ou null si la connexion a réussi.
    const signIn = async (name: string, password: string): Promise<string | null> => {
        const {data, error} = await supabase.rpc('mf_sign_in', {p_name: name, p_password: password});
        if (error) return error.message || "Connexion impossible, réessayez.";
        open(data);
        return null;
    }

    const register = async (name: string, password: string, invite: string): Promise<string | null> => {
        const {data, error} = await supabase.rpc('mf_register', {p_name: name, p_password: password, p_invite: invite});
        if (error) return error.message || "Inscription impossible, réessayez.";
        open(data);
        loadPlayers().catch(console.error);
        return null;
    }

    useEffect(() => {
        loadGame().catch(console.error);
        loadMisses().catch(console.error);
        loadPlayers().catch(console.error);

        const stored = storedToken();
        if (stored) {
            supabase.rpc('mf_me', {p_token: stored}).then(({data, error}) => {
                if (data) {
                    setToken(stored);
                    setWho(data);
                    setPage("home");
                } else if (!error) {
                    storeToken(null);
                }
            });
        }

        // L'app suit en direct les changements de phase et la saisie des résultats.
        const channel = supabase.channel('mf')
            .on('postgres_changes', {event: '*', schema: 'public', table: 'mf_game'}, () => loadGame().catch(console.error))
            .on('postgres_changes', {event: '*', schema: 'public', table: 'mf_misses'}, () => loadMisses().catch(console.error))
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        }
    }, [loadGame, loadMisses, loadPlayers]);

    useEffect(() => {
        if (token) loadVotes(token).catch(console.error);
    }, [token, edition, loadVotes]);

    // La liste des joueurs n'est pas suivie en direct : on la rafraîchit à l'ouverture de l'admin.
    useEffect(() => {
        if (page === "admin") loadPlayers().catch(console.error);
    }, [page, loadPlayers]);

    const misses = useMemo(() => allMisses.filter((m) => m.edition === edition), [allMisses, edition]);
    const editions = useMemo(
        () => [...new Set([edition, ...allMisses.map((m) => m.edition)])].filter(Boolean).sort().reverse(),
        [allMisses, edition],
    );

    const saveVote = async (step: number, number: number, miss: Miss) => {
        if (!token) throw new Error("Connectez-vous d'abord.");
        if (step !== phase) throw new Error("Cette phase de vote est fermée");
        const {error} = await supabase.rpc('mf_vote', {p_token: token, p_phase: step, p_slot: number, p_miss: miss.id});
        await loadVotes(token).catch(console.error);
        if (error) throw new Error(error.message);
    }

  return (
    <div className="bg-white">
        <header className="absolute inset-x-0 top-0 z-50">
            <nav aria-label="Global" className="flex items-center justify-between p-6 lg:px-8">
                <div className="flex lg:flex-1 lg:flex-col">
                    {who && <span>
                        <span>Joueur:&nbsp;</span><span className="font-bold">{who.name}</span>
                        <button type="button" onClick={() => logout(token)} className="ml-2 text-sm text-gray-500 underline">Se déconnecter</button>
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
                        <a onClick={() => setPage("admin")} className="cursor-pointer text-sm/6 font-semibold text-gray-400">
                            Admin
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
                                <a onClick={() => {setMobileMenuOpen(false);setPage("admin")}} className="cursor-pointer -mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-400 hover:bg-gray-50">
                                    Admin
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

            <SelectWho show={page === ""} signIn={signIn} register={register}></SelectWho>
            <Home show={page === "home"} misses={misses}></Home>
            {who
                ? <Vote show={page === "my-vote"} phase={phase} misses={misses} votes={votes} saveVote={saveVote}></Vote>
                : page === "my-vote" && <p className="p-6 text-center">
                    <button type="button" onClick={() => setPage("")} className="underline">Connectez-vous pour voter</button>
                </p>}
            <Rank show={page === "rank"} phase={phase} edition={edition} editions={editions} who={who} misses={allMisses}></Rank>
            <Admin show={page === "admin"} phase={phase} edition={edition} misses={misses} users={users}
                   reloadGame={loadGame} reloadMisses={loadMisses} reloadPlayers={loadPlayers}></Admin>


        </div>
    </div>
  )
}

export default App
