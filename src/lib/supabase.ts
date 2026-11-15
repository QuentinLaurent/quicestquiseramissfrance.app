import {createClient} from "@supabase/supabase-js";

// Clé « publishable » : faite pour être embarquée dans le navigateur, les accès sont
// limités côté base (voir supabase/migrations).
const url = import.meta.env.VITE_SUPABASE_URL || "https://fdxrqvxpdoemdjrrysvc.supabase.co";
const key = import.meta.env.VITE_SUPABASE_KEY || "sb_publishable_JfGHdRYxJhXOyLdiEu0zIA_k4oUSyBj";

// La session Supabase ne sert qu'à l'administration ; les joueurs s'identifient par leur code.
export const supabase = createClient(url, key, {auth: {storageKey: "qcqsmf.admin", detectSessionInUrl: false}});

export const photoUrl = (photo?: string | null) => {
    if (!photo) return undefined;
    if (/^https?:\/\//.test(photo)) return photo;
    return `${url}/storage/v1/object/public/miss-photos/${photo}`;
}
