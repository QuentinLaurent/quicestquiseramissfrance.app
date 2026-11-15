import {FormEvent, useState} from "react";

interface Props {
    // Les deux renvoient un message d'erreur, ou null si la connexion a réussi.
    signIn: (name: string, password: string) => Promise<string | null>;
    register: (name: string, password: string, invite: string) => Promise<string | null>;
    show: boolean;
}

const field = "w-64 rounded border border-gray-300 p-2";

const SelectWho = ({signIn, register, show}: Props) => {
    const [mode, setMode] = useState<"login" | "register">("login");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [invite, setInvite] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const switchMode = (next: "login" | "register") => {
        setMode(next);
        setError(null);
    }

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        const message = mode === "login"
            ? await signIn(name, password)
            : await register(name, password, invite);
        setBusy(false);
        setError(message);
        if (!message) {
            setPassword("");
            setInvite("");
        }
    }

    return <form onSubmit={submit} className={"flex flex-col items-center p-6 gap-4 " + (!show ? 'hidden' : '')}>
        <h1 className="text-2xl font-bold">{mode === "login" ? "Connexion" : "Inscription"}</h1>
        <input aria-label="Pseudo" placeholder="Pseudo" required minLength={2} maxLength={24} autoComplete="username"
               value={name} onChange={(e) => setName(e.currentTarget.value)} className={field}/>
        <input aria-label="Mot de passe" placeholder="Mot de passe" type="password" required
               minLength={mode === "register" ? 6 : undefined} maxLength={72}
               autoComplete={mode === "login" ? "current-password" : "new-password"}
               value={password} onChange={(e) => setPassword(e.currentTarget.value)} className={field}/>
        {mode === "register" && <input aria-label="Code d'invitation" placeholder="Code d'invitation" required autoComplete="off"
               value={invite} onChange={(e) => setInvite(e.currentTarget.value)} className={field}/>}
        {mode === "register" && <p className="text-center text-sm text-gray-600">Mot de passe : 6 caractères minimum.</p>}
        {error && <p role="alert" className="rounded bg-red-100 px-3 py-2 text-sm text-red-900">{error}</p>}
        <button type="submit" disabled={busy} className="min-w-40 rounded bg-[#9c272e] p-2 font-bold text-white disabled:opacity-50">
            {mode === "login" ? "Se connecter" : "S'inscrire"}
        </button>
        {mode === "login"
            ? <button type="button" onClick={() => switchMode("register")} className="text-sm text-gray-500 underline">Pas encore de compte ? S'inscrire</button>
            : <button type="button" onClick={() => switchMode("login")} className="text-sm text-gray-500 underline">Déjà un compte ? Se connecter</button>}
    </form>
}

export default SelectWho;
