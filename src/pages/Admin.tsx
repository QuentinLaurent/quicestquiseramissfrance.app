import {FormEvent, useEffect, useState} from "react";
import {FINISHED_PHASE, levelOf, LEVEL, Miss, PHASES, Player} from "../lib/game.ts";
import {supabase} from "../lib/supabase.ts";

interface Props {
    phase: number;
    edition: string;
    misses: Miss[];
    users: Player[];
    reloadGame: () => Promise<void>;
    reloadMisses: () => Promise<void>;
    reloadPlayers: () => Promise<void>;
}

const RESULTS = ["Top 15", "Top 5", "2ème Dauphine", "1ère Dauphine", "Miss France"];

interface MissForm {
    id?: string;
    region: string;
    name: string;
    age: string;
    work: string;
    photo: string;
}

const EMPTY_MISS: MissForm = {region: "", name: "", age: "", work: "", photo: ""};

const button = "btn-ghost !min-h-9 !px-4";
const primary = "btn-primary !min-h-9 !px-4";
const input = "field !min-h-10 !text-sm sm:!w-auto";

const Admin = ({phase, edition, misses, users, reloadGame, reloadMisses, reloadPlayers}: Props) => {
    const [userId, setUserId] = useState<string | null | undefined>(undefined);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState<{ ok: boolean, text: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [newEdition, setNewEdition] = useState("");
    const [missForm, setMissForm] = useState<MissForm | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [invite, setInvite] = useState("");

    useEffect(() => {
        supabase.auth.getSession().then(({data}) => setUserId(data.session?.user.id ?? null));
        const {data} = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null));
        return () => data.subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!userId) {
            setIsAdmin(null);
            return;
        }
        let cancelled = false;
        supabase.rpc('mf_is_admin').then(async ({data}) => {
            if (cancelled) return;
            setIsAdmin(data === true);
            if (data === true) {
                const secrets = await supabase.from('mf_secrets').select('invite_code').single();
                if (!cancelled) setInvite(secrets.data?.invite_code ?? "");
            }
        });
        return () => {
            cancelled = true;
        }
    }, [userId]);

    // Exécute une action d'administration et affiche son résultat.
    const run = async (label: string, action: () => Promise<{ error: { message: string } | null }>) => {
        setBusy(true);
        try {
            const {error} = await action();
            if (error) setStatus({ok: false, text: `${label} : échec (${error.message})`});
            else setStatus({ok: true, text: `${label} : fait`});
            return !error;
        } catch (error) {
            setStatus({ok: false, text: `${label} : échec (${error instanceof Error ? error.message : "erreur"})`});
            return false;
        } finally {
            setBusy(false);
        }
    }

    const login = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        const {error} = await supabase.auth.signInWithPassword({email: email.trim(), password});
        setBusy(false);
        setPassword("");
        setStatus(error ? {ok: false, text: "Connexion refusée : e-mail ou mot de passe incorrect."} : null);
    }

    const logout = async () => {
        await supabase.auth.signOut();
        setStatus(null);
    }

    const setPhase = async (next: number) => {
        if (next === phase) return;
        const label = next >= FINISHED_PHASE ? "Clôturer les votes" : `Ouvrir la phase ${next}`;
        if (!window.confirm(`${label} ? Les joueurs le verront immédiatement.`)) return;
        await run(label, async () => supabase.from('mf_game').update({phase: next}).eq('id', true));
        await reloadGame();
    }

    const changeEdition = async (event: FormEvent) => {
        event.preventDefault();
        const next = newEdition.trim();
        if (!next || next === edition) return;
        if (!window.confirm(`Passer à l'édition ${next} ? La phase revient à 1 et la liste des miss repart de celles de cette édition.`)) return;
        if (await run(`Édition ${next}`, async () => supabase.from('mf_game').update({edition: next, phase: 1}).eq('id', true))) {
            setNewEdition("");
        }
        await reloadGame();
    }

    const setResult = async (miss: Miss, result: string) => {
        await run(`Miss ${miss.region}`, async () => supabase.from('mf_misses').update({result: result || null}).eq('id', miss.id));
        await reloadMisses();
    }

    const saveMiss = async (event: FormEvent) => {
        event.preventDefault();
        if (!missForm) return;
        const region = missForm.region.trim();
        const ok = await run(`Miss ${region}`, async () => {
            let photo = missForm.photo.trim() || null;
            if (photoFile) {
                const extension = (photoFile.name.split('.').pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
                const path = `${edition}/${crypto.randomUUID()}.${extension}`;
                const upload = await supabase.storage.from('miss-photos').upload(path, photoFile, {contentType: photoFile.type});
                if (upload.error) return {error: upload.error};
                photo = path;
            }
            const values = {
                region,
                name: missForm.name.trim(),
                age: missForm.age.trim() ? parseInt(missForm.age) : null,
                work: missForm.work.trim(),
                photo,
            };
            return missForm.id
                ? supabase.from('mf_misses').update(values).eq('id', missForm.id)
                : supabase.from('mf_misses').insert({...values, edition});
        });
        if (ok) {
            setMissForm(null);
            setPhotoFile(null);
        }
        await reloadMisses();
    }

    const editMiss = async (miss: Miss) => {
        // La colonne photo brute (nom de fichier ou URL) n'est pas dans la liste affichée.
        const {data} = await supabase.from('mf_misses').select('photo').eq('id', miss.id).single();
        setPhotoFile(null);
        setMissForm({
            id: miss.id,
            region: miss.region,
            name: miss.name,
            age: miss.age === null ? "" : String(miss.age),
            work: miss.work,
            photo: data?.photo ?? "",
        });
    }

    const deleteMiss = async (miss: Miss) => {
        if (!window.confirm(`Supprimer Miss ${miss.region} ? Les votes qui la concernent seront supprimés aussi.`)) return;
        await run(`Suppression de Miss ${miss.region}`, async () => supabase.from('mf_misses').delete().eq('id', miss.id));
        await reloadMisses();
    }

    const saveInvite = async (event: FormEvent) => {
        event.preventDefault();
        const code = invite.trim();
        await run(code ? "Code d'invitation" : "Fermeture des inscriptions", async () =>
            supabase.from('mf_secrets').update({invite_code: code || null}).eq('id', true));
    }

    const resetPassword = async (player: Player) => {
        if (!window.confirm(`Effacer le mot de passe de ${player.name} ? Il devra se réinscrire avec le même pseudo et le code d'invitation.`)) return;
        await run(`Mot de passe de ${player.name}`, async () => supabase.rpc('mf_admin_reset_password', {p_player: player.id}));
        await reloadPlayers();
    }

    const deletePlayer = async (player: Player) => {
        if (!window.confirm(`Supprimer ${player.name} ? Tous ses votes seront supprimés, toutes éditions confondues.`)) return;
        await run(`Suppression de ${player.name}`, async () => supabase.from('mf_players').delete().eq('id', player.id));
        await reloadPlayers();
    }

    const countAtLeast = (level: number) => misses.filter((m) => levelOf(m) >= level).length;

    return (
        <section className="mx-auto max-w-3xl">
            <h1 className="page-title">Administration</h1>

            {status && <p role="status"
                          className={"mt-4 rounded-xl px-4 py-3 text-sm font-semibold " + (status.ok ? "bg-green-50 text-green-900" : "bg-red-50 text-red-800")}>
                {status.text}
            </p>}

            {userId === null && <form onSubmit={login} className="card mx-auto mt-6 flex max-w-sm flex-col gap-3 p-5">
                <input type="email" required autoComplete="username" placeholder="E-mail" aria-label="E-mail"
                       value={email} onChange={(e) => setEmail(e.currentTarget.value)} className="field"/>
                <input type="password" required autoComplete="current-password" placeholder="Mot de passe" aria-label="Mot de passe"
                       value={password} onChange={(e) => setPassword(e.currentTarget.value)} className="field"/>
                <button type="submit" disabled={busy} className="btn-primary">Se connecter</button>
            </form>}

            {userId && isAdmin === false && <div className="card mt-6 p-6 text-center">
                <p>Ce compte n'a pas les droits d'administration.</p>
                <button type="button" onClick={logout} className={button + " mt-3"}>Se déconnecter</button>
            </div>}

            {userId && isAdmin && <div className="mt-6 space-y-5">
                <section className="card p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                        <h2 className="font-display text-lg font-bold text-wine-900">Édition {edition}</h2>
                        <button type="button" onClick={logout} className={button}>Se déconnecter</button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {[...PHASES.map((p) => ({number: p.number, label: `Phase ${p.number}`})), {number: FINISHED_PHASE, label: "Terminé"}].map((p) => (
                            <button key={p.number} type="button" disabled={busy} onClick={() => setPhase(p.number)}
                                    className={p.number === phase ? primary : button}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <p className="mt-2 text-sm text-ink/60">
                        Saisir les qualifiées avant d'ouvrir la phase 3 (Top 15) et la phase 4 (Top 5).
                        Les points d'une phase apparaissent au classement quand la suivante est ouverte.
                    </p>
                    <form onSubmit={changeEdition} className="mt-3 flex flex-wrap items-center gap-2">
                        <input placeholder="Nouvelle édition (ex. 2028)" aria-label="Nouvelle édition"
                               value={newEdition} onChange={(e) => setNewEdition(e.currentTarget.value)} className={input}/>
                        <button type="submit" disabled={busy || !newEdition.trim()} className={button}>Changer d'édition</button>
                    </form>
                </section>

                <section className="card p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                        <h2 className="font-display text-lg font-bold text-wine-900">Miss ({misses.length})</h2>
                        <button type="button" className={button} onClick={() => {
                            setPhotoFile(null);
                            setMissForm(EMPTY_MISS);
                        }}>Ajouter une miss</button>
                    </div>
                    <p className="mt-1 text-sm text-ink/60">
                        Top 15 : {countAtLeast(LEVEL.TOP15)} · Top 5 : {countAtLeast(LEVEL.TOP5)} ·
                        Podium : {countAtLeast(LEVEL.SECOND_DAUPHINE)}
                    </p>

                    {missForm && <form onSubmit={saveMiss} className="mt-3 grid gap-2 rounded-2xl bg-wine-50 p-3 sm:grid-cols-2">
                        <input required placeholder="Région" aria-label="Région" value={missForm.region}
                               onChange={(e) => setMissForm({...missForm, region: e.currentTarget.value})} className={input}/>
                        <input placeholder="Nom" aria-label="Nom" value={missForm.name}
                               onChange={(e) => setMissForm({...missForm, name: e.currentTarget.value})} className={input}/>
                        <input type="number" min={0} placeholder="Âge" aria-label="Âge" value={missForm.age}
                               onChange={(e) => setMissForm({...missForm, age: e.currentTarget.value})} className={input}/>
                        <input placeholder="Profession ou origine" aria-label="Profession ou origine" value={missForm.work}
                               onChange={(e) => setMissForm({...missForm, work: e.currentTarget.value})} className={input}/>
                        <input placeholder="Photo : adresse web" aria-label="Photo : adresse web" value={missForm.photo}
                               onChange={(e) => setMissForm({...missForm, photo: e.currentTarget.value})} className={input}/>
                        <label className="text-sm">
                            ou fichier&nbsp;
                            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.currentTarget.files?.[0] ?? null)}/>
                        </label>
                        <div className="flex gap-2 sm:col-span-2">
                            <button type="submit" disabled={busy} className={primary}>{missForm.id ? "Enregistrer" : "Ajouter"}</button>
                            <button type="button" className={button} onClick={() => setMissForm(null)}>Annuler</button>
                        </div>
                    </form>}

                    <ul className="mt-3">
                        {misses.map((m) => (
                            <li key={m.id} className="flex flex-wrap items-center gap-2 border-b border-wine-100 py-2.5 last:border-0">
                                <span className="min-w-40 flex-1">
                                    <span className="block font-bold">{m.region}</span>
                                    <span className="block text-xs text-ink/50">{m.name}</span>
                                </span>
                                <select aria-label={`Résultat de Miss ${m.region}`} value={m.field} disabled={busy}
                                        onChange={(e) => setResult(m, e.currentTarget.value)}
                                        className={input + " !w-auto" + (m.field ? " !bg-gold-100 font-bold" : "")}>
                                    <option value="">En lice</option>
                                    {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <button type="button" className={button} onClick={() => editMiss(m)}>Modifier</button>
                                <button type="button" className={button} disabled={busy} onClick={() => deleteMiss(m)}>Supprimer</button>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="card p-4 sm:p-5">
                    <h2 className="font-display text-lg font-bold text-wine-900">Joueurs ({users.length})</h2>
                    <form onSubmit={saveInvite} className="mt-3 flex flex-wrap items-center gap-2">
                        <label htmlFor="inviteCode" className="text-sm">Code d'invitation</label>
                        <input id="inviteCode" value={invite} onChange={(e) => setInvite(e.currentTarget.value)}
                               placeholder="vide = inscriptions fermées" className={input}/>
                        <button type="submit" disabled={busy} className={button}>Enregistrer</button>
                    </form>
                    <p className="mt-1 text-sm text-ink/60">
                        Les joueurs s'inscrivent eux-mêmes avec ce code. Videz-le pour fermer les inscriptions.
                    </p>
                    <ul className="mt-3">
                        {users.map((u) => (
                            <li key={u.id} className="flex flex-wrap items-center gap-2 border-b border-wine-100 py-2.5 last:border-0">
                                <span className="min-w-40 flex-1">
                                    <span className="block font-bold">{u.name}</span>
                                    <span className="block text-xs text-ink/50">{u.has_code ? "Inscrit" : "Mot de passe effacé, doit se réinscrire"}</span>
                                </span>
                                {u.has_code && <button type="button" className={button} disabled={busy} onClick={() => resetPassword(u)}>Effacer le mot de passe</button>}
                                <button type="button" className={button} disabled={busy} onClick={() => deletePlayer(u)}>Supprimer</button>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>}
        </section>
    );
}

export default Admin;
