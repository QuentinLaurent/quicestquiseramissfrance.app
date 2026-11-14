import {FormEvent, useState} from "react";
import {Player} from "../lib/game.ts";

interface Props {
    users: Player[];
    // Renvoie un message d'erreur, ou null si la connexion a réussi.
    login: (player: Player, code: string) => Promise<string | null>;
    show: boolean;
}

const SelectWho = ({users = [], login, show}: Props) => {
    const [selected, setSelected] = useState<Player | null>(null);
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const choose = (player: Player | null) => {
        setSelected(player);
        setCode("");
        setError(null);
    }

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!selected || busy) return;
        setBusy(true);
        const message = await login(selected, code);
        setBusy(false);
        if (message) setError(message);
        else choose(null);
    }

    return <div className={"flex flex-col items-center p-6 gap-4 " + (!show ? 'hidden' : '')}>
        {!selected && <>
            <h1 className="text-2xl font-bold">Qui êtes-vous?</h1>
            {users.map((u) => (
                <button key={u.id} onClick={() => choose(u)} className="bg-gray-200 p-2 rounded font-bold min-w-40 hover:bg-[#9c272e] hover:text-white">{u.name}</button>
            ))}
        </>}
        {selected && <form onSubmit={submit} className="flex flex-col items-center gap-4">
            <h1 className="text-2xl font-bold">Bonjour {selected.name}</h1>
            <label htmlFor="playerCode" className="text-center">
                {selected.has_code
                    ? "Entrez votre code personnel."
                    : <>Première visite : choisissez un code de 4 à 8 chiffres.<br/>Il vous sera redemandé sur un autre appareil.</>}
            </label>
            <input id="playerCode" type="password" inputMode="numeric" autoComplete="off" autoFocus
                   pattern="[0-9]{4,8}" maxLength={8} required
                   value={code} onChange={(e) => setCode(e.currentTarget.value)}
                   className="w-40 rounded border border-gray-300 p-2 text-center text-xl tracking-widest"/>
            {error && <p role="alert" className="rounded bg-red-100 px-3 py-2 text-sm text-red-900">{error}</p>}
            <button type="submit" disabled={busy} className="min-w-40 rounded bg-[#9c272e] p-2 font-bold text-white disabled:opacity-50">Valider</button>
            <button type="button" onClick={() => choose(null)} className="text-sm text-gray-500 underline">Ce n'est pas moi</button>
        </form>}
    </div>
}

export default SelectWho;
