import {useCallback, useEffect, useMemo, useState} from "react";
import {Menu, MenuButton, MenuItem, MenuItems} from "@headlessui/react";
import {HeartIcon, TrophyIcon, UserGroupIcon} from "@heroicons/react/24/outline";
import {
    HeartIcon as HeartSolid,
    TrophyIcon as TrophySolid,
    UserGroupIcon as UserGroupSolid,
} from "@heroicons/react/24/solid";
import {CheckCircleIcon, ExclamationCircleIcon} from "@heroicons/react/20/solid";
import logoLight from './assets/logo-light.svg'
import Home, {PickState} from "./pages/Home.tsx";
import Vote from "./pages/Vote.tsx";
import Rank from "./pages/Rank.tsx";
import Admin from "./pages/Admin.tsx";
import Login from "./pages/Login.tsx";
import {Avatar} from "./components/ui.tsx";
import {candidatesFor, FINISHED_PHASE, Miss, PHASES, Player, VoteRecord} from "./lib/game.ts";
import {photoUrl, supabase} from "./lib/supabase.ts";


const SESSION_STORAGE_KEY = "qcqsmf.session";

type Page = "login" | "miss" | "votes" | "rank" | "admin";
const PAGES: Page[] = ["login", "miss", "votes", "rank", "admin"];

const TABS = [
    {page: "miss" as Page, label: "Les Miss", icon: UserGroupIcon, activeIcon: UserGroupSolid},
    {page: "votes" as Page, label: "Mes votes", icon: HeartIcon, activeIcon: HeartSolid},
    {page: "rank" as Page, label: "Classement", icon: TrophyIcon, activeIcon: TrophySolid},
];

interface Me {
    id: string;
    name: string;
}

interface Toast {
    id: number;
    ok: boolean;
    text: string;
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

// La page courante est dans l'adresse (#/votes) : le bouton retour du téléphone fonctionne.
const pageFromHash = (): Page | null => {
    const name = window.location.hash.replace(/^#\/?/, "") as Page;
    return PAGES.includes(name) ? name : null;
}

function App() {
    const [page, setPage] = useState<Page>(() => pageFromHash() ?? (storedToken() ? "miss" : "login"));
    const [phase, setPhase] = useState(1);
    const [edition, setEdition] = useState("");
    const [allMisses, setAllMisses] = useState<Miss[]>([]);
    const [missesLoaded, setMissesLoaded] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [who, setWho] = useState<Me>();
    const [votes, setVotes] = useState<VoteRecord[]>([]);
    const [users, setUsers] = useState<Player[]>([]);
    const [toast, setToast] = useState<Toast | null>(null);
    const [online, setOnline] = useState(() => navigator.onLine);

    const navigate = useCallback((next: Page) => {
        if (pageFromHash() === next) setPage(next);
        else window.location.hash = `#/${next}`;
        window.scrollTo(0, 0);
    }, []);

    const notify = useCallback((ok: boolean, text: string) => setToast({id: Date.now(), ok, text}), []);

    useEffect(() => {
        const onHash = () => setPage(pageFromHash() ?? "miss");
        const onOnline = () => setOnline(navigator.onLine);
        window.addEventListener("hashchange", onHash);
        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOnline);
        return () => {
            window.removeEventListener("hashchange", onHash);
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOnline);
        }
    }, []);

    useEffect(() => {
        if (!toast) return;
        const timer = window.setTimeout(() => setToast(null), 3500);
        return () => window.clearTimeout(timer);
    }, [toast]);

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
        setMissesLoaded(true);
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
        navigate("login");
    }, [navigate]);

    const loadVotes = useCallback(async (current: string) => {
        const {data, error} = await supabase.rpc('mf_my_votes', {p_token: current});
        if (error) {
            // Session supprimée côté serveur (mot de passe effacé, joueur supprimé).
            if (error.code === '28000') logout();
            throw error;
        }
        setVotes(data);
    }, [logout]);

    const open = (result: { token: string, id: string, name: string }) => {
        storeToken(result.token);
        setToken(result.token);
        setWho({id: result.id, name: result.name});
        navigate("miss");
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
        notify(true, `Bienvenue ${data.name} !`);
        return null;
    }

    useEffect(() => {
        loadGame().catch(console.error);
        loadMisses().catch(console.error);

        const stored = storedToken();
        if (stored) {
            supabase.rpc('mf_me', {p_token: stored}).then(({data, error}) => {
                if (data) {
                    setToken(stored);
                    setWho(data);
                    if (pageFromHash() === "login") navigate("miss");
                } else if (!error) {
                    storeToken(null);
                    if (pageFromHash() === null) navigate("login");
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
    }, [loadGame, loadMisses, navigate]);

    useEffect(() => {
        if (token) loadVotes(token).catch(console.error);
    }, [token, edition, loadVotes]);

    // La liste des joueurs ne sert qu'à l'admin et n'est pas suivie en direct.
    useEffect(() => {
        if (page === "admin") loadPlayers().catch(console.error);
    }, [page, loadPlayers]);

    const misses = useMemo(() => allMisses.filter((m) => m.edition === edition), [allMisses, edition]);
    const editions = useMemo(
        () => [...new Set([edition, ...allMisses.map((m) => m.edition)])].filter(Boolean).sort().reverse(),
        [allMisses, edition],
    );

    const current = PHASES.find((p) => p.number === phase);
    const picks = useMemo(
        () => current ? current.slots.map((_, i) => votes.find((v) => v.phase === current.number && v.slot === i + 1)?.miss_id ?? null) : [],
        [current, votes],
    );
    const picksDone = picks.filter(Boolean).length;

    const vote = async (step: number, slot: number, miss: Miss): Promise<boolean> => {
        if (!token) {
            notify(false, "Connectez-vous pour voter.");
            return false;
        }
        const {error} = await supabase.rpc('mf_vote', {p_token: token, p_phase: step, p_slot: slot, p_miss: miss.id});
        await loadVotes(token).catch(console.error);
        if (error) {
            notify(false, error.message || "Le vote n'a pas été enregistré.");
            return false;
        }
        notify(true, `Miss ${miss.region} enregistrée`);
        return true;
    }

    const pickStateOf = (miss: Miss): PickState => {
        if (!current) return {kind: "closed"};
        if (!token) return {kind: "anonymous"};
        const index = picks.indexOf(miss.id);
        if (index >= 0) return {kind: "picked", slot: current.slots.length === 3 ? current.slots[index] : `case ${index + 1}`};
        if (!candidatesFor(current, misses).some((m) => m.id === miss.id)) return {kind: "eliminated"};
        if (picksDone >= current.slots.length) return {kind: "full"};
        return {kind: "available"};
    }

    const quickPick = (miss: Miss) => current ? vote(current.number, picks.indexOf(null) + 1, miss) : Promise.resolve(false);

    const votesPending = !!token && !!current && picksDone < current.slots.length;
    const showChrome = page !== "login";

    return (
        <div className="flex min-h-dvh flex-col">
            <header className="sticky top-0 z-30 bg-wine-900 pt-[env(safe-area-inset-top)] text-white shadow-md">
                <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:h-16">
                    <button type="button" onClick={() => navigate(who ? "miss" : "login")} className="flex min-w-0 items-center gap-2.5">
                        <img alt="" src={logoLight} className="h-9 w-auto"/>
                        <span className="min-w-0 text-left leading-tight">
                            <span className="block truncate font-display text-base font-bold text-gold-300 sm:text-lg">Qui c'est qui sera Miss France ?</span>
                            {edition && <span className="block text-[11px] uppercase tracking-widest text-white/60">Édition {edition}</span>}
                        </span>
                    </button>

                    <nav aria-label="Navigation principale" className="ml-auto hidden items-center gap-1 sm:flex">
                        {TABS.map((tab) => (
                            <a key={tab.page} href={`#/${tab.page}`} aria-current={page === tab.page ? "page" : undefined}
                               className={"rounded-full px-4 py-2 text-sm font-semibold transition " + (page === tab.page ? "bg-white/15 text-gold-300" : "text-white/80 hover:bg-white/10")}>
                                {tab.label}
                            </a>
                        ))}
                    </nav>

                    <div className="ml-auto sm:ml-2">
                        {who
                            ? <Menu as="div" className="relative">
                                <MenuButton className="flex items-center gap-2 rounded-full p-1 pr-1 hover:bg-white/10 sm:pr-3">
                                    <Avatar name={who.name}/>
                                    <span className="hidden max-w-32 truncate text-sm font-semibold sm:block">{who.name}</span>
                                    <span className="sr-only">Menu du compte</span>
                                </MenuButton>
                                <MenuItems transition anchor="bottom end"
                                           className="z-40 mt-2 w-52 rounded-2xl bg-white p-1.5 text-ink shadow-xl ring-1 ring-black/5 transition duration-100 data-[closed]:scale-95 data-[closed]:opacity-0">
                                    <div className="px-3 py-2 text-xs text-ink/50">Connecté : <span className="font-semibold text-ink">{who.name}</span></div>
                                    <MenuItem>
                                        <a href="#/admin" className="block rounded-xl px-3 py-2.5 text-sm data-[focus]:bg-wine-50">Administration</a>
                                    </MenuItem>
                                    <MenuItem>
                                        <button type="button" onClick={() => logout(token)} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm data-[focus]:bg-wine-50">Se déconnecter</button>
                                    </MenuItem>
                                </MenuItems>
                            </Menu>
                            : page !== "login" && <button type="button" onClick={() => navigate("login")} className="btn-gold !min-h-9 !px-4">Se connecter</button>}
                    </div>
                </div>
            </header>

            {!online && <p role="status" className="bg-gold-300 px-4 py-2 text-center text-sm font-semibold text-wine-950">
                Hors connexion : les votes et le classement reprendront au retour du réseau.
            </p>}

            <main className={"mx-auto w-full max-w-5xl flex-1 px-4 pt-5 sm:pt-8 " + (showChrome ? "pb-28 sm:pb-12" : "pb-10")}>
                {showChrome && page !== "admin" && page !== "votes" && edition && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-wine-800 to-wine-950 px-4 py-3 text-white shadow-sm">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-gold-300">
                            {current ? `Phase ${current.number} sur ${PHASES.length} · votes ouverts` : "Élection terminée"}
                        </p>
                        <p className="text-sm text-white/90">
                            {current
                                ? token ? `${picksDone} choix sur ${current.slots.length} enregistrés. ${current.intro}` : current.intro
                                : "Découvrez le classement final."}
                        </p>
                    </div>
                    {phase >= FINISHED_PHASE
                        ? page !== "rank" && <button type="button" onClick={() => navigate("rank")} className="btn-gold !min-h-9 !px-4">Classement</button>
                        : <button type="button" onClick={() => navigate(token ? "votes" : "login")} className="btn-gold !min-h-9 !px-4">
                            {!token ? "Participer" : votesPending ? "Faire mes choix" : "Modifier mes choix"}
                        </button>}
                </div>}

                {page === "login" && <Login signIn={signIn} register={register} browse={() => navigate("miss")}/>}
                {page === "miss" && <Home misses={misses} loading={!missesLoaded} pickStateOf={pickStateOf} onPick={quickPick}
                                           goVotes={() => navigate("votes")} goLogin={() => navigate("login")}/>}
                {page === "votes" && <Vote phase={phase} misses={misses} votes={votes} loggedIn={!!token} vote={vote}
                                           goLogin={() => navigate("login")} goRank={() => navigate("rank")}/>}
                {page === "rank" && <Rank phase={phase} edition={edition} editions={editions} who={who} misses={allMisses}/>}
                {page === "admin" && <Admin phase={phase} edition={edition} misses={misses} users={users}
                                            reloadGame={loadGame} reloadMisses={loadMisses} reloadPlayers={loadPlayers}/>}

                {showChrome && page !== "admin" && !who && <p className="mt-10 text-center text-xs text-ink/40">
                    <a href="#/admin" className="underline underline-offset-4">Administration</a>
                </p>}
            </main>

            {showChrome && <nav aria-label="Navigation principale"
                                className="fixed inset-x-0 bottom-0 z-30 border-t border-wine-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
                <ul className="mx-auto grid max-w-md grid-cols-3">
                    {TABS.map((tab) => {
                        const active = page === tab.page;
                        const Icon = active ? tab.activeIcon : tab.icon;
                        return (
                            <li key={tab.page}>
                                <a href={`#/${tab.page}`} aria-current={active ? "page" : undefined}
                                   className={"relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold " + (active ? "text-wine-600" : "text-ink/50")}>
                                    <span className="relative">
                                        <Icon className="size-6"/>
                                        {tab.page === "votes" && votesPending && <span className="absolute -right-1 -top-0.5 size-2.5 rounded-full bg-gold-500 ring-2 ring-white">
                                            <span className="sr-only">Choix à compléter</span>
                                        </span>}
                                    </span>
                                    {tab.label}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </nav>}

            <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 sm:bottom-6">
                {toast && <p key={toast.id}
                             className={"pointer-events-auto flex max-w-sm items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg "
                                 + (toast.ok ? "bg-wine-900 text-white" : "bg-red-600 text-white")}>
                    {toast.ok ? <CheckCircleIcon className="size-5 shrink-0 text-gold-300"/> : <ExclamationCircleIcon className="size-5 shrink-0"/>}
                    {toast.text}
                </p>}
            </div>
        </div>
    )
}

export default App
