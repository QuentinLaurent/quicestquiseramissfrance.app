import {FormEvent, useState} from "react";
import logo from "../assets/logo.svg";

interface Props {
    // Les deux renvoient un message d'erreur, ou null si la connexion a réussi.
    signIn: (name: string, password: string) => Promise<string | null>;
    register: (name: string, password: string, invite: string) => Promise<string | null>;
    browse: () => void;
}

const Login = ({signIn, register, browse}: Props) => {
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
    }

    return (
        <section className="mx-auto max-w-md">
            <div className="text-center">
                <img alt="" src={logo} className="mx-auto h-36 w-auto sm:h-44"/>
                <h1 className="mt-2 font-display text-2xl font-bold text-wine-900">Faites vos pronostics</h1>
                <p className="mt-1 text-sm text-ink/60">Devinez qui portera la couronne, et battez vos amis.</p>
            </div>

            <form onSubmit={submit} className="card mt-6 p-5 sm:p-6">
                <div className="grid grid-cols-2 gap-1 rounded-full bg-wine-50 p-1" role="tablist" aria-label="Connexion ou inscription">
                    {(["login", "register"] as const).map((m) => (
                        <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => switchMode(m)}
                                className={"min-h-10 rounded-full text-sm font-semibold transition " + (mode === m ? "bg-white text-wine-800 shadow-sm" : "text-wine-700/70")}>
                            {m === "login" ? "Connexion" : "Inscription"}
                        </button>
                    ))}
                </div>

                <div className="mt-5 space-y-4">
                    <label className="block">
                        <span className="mb-1 block text-sm font-semibold">Pseudo</span>
                        <input required minLength={2} maxLength={24} autoComplete="username" autoCapitalize="none"
                               value={name} onChange={(e) => setName(e.currentTarget.value)} className="field"/>
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-sm font-semibold">Mot de passe</span>
                        <input type="password" required minLength={mode === "register" ? 6 : undefined} maxLength={72}
                               autoComplete={mode === "login" ? "current-password" : "new-password"}
                               value={password} onChange={(e) => setPassword(e.currentTarget.value)} className="field"/>
                        {mode === "register" && <span className="mt-1 block text-xs text-ink/50">6 caractères minimum.</span>}
                    </label>
                    {mode === "register" && <label className="block">
                        <span className="mb-1 block text-sm font-semibold">Code d'invitation</span>
                        <input required autoComplete="off" autoCapitalize="characters"
                               value={invite} onChange={(e) => setInvite(e.currentTarget.value)} className="field"/>
                        <span className="mt-1 block text-xs text-ink/50">Demandez-le à l'organisateur.</span>
                    </label>}
                </div>

                {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

                <button type="submit" disabled={busy} className="btn-primary mt-5 w-full">
                    {mode === "login" ? "Se connecter" : "S'inscrire"}
                </button>
            </form>

            <p className="mt-4 text-center">
                <button type="button" onClick={browse} className="text-sm font-semibold text-wine-700 underline underline-offset-4">
                    Voir les candidates sans se connecter
                </button>
            </p>
        </section>
    );
}

export default Login;
