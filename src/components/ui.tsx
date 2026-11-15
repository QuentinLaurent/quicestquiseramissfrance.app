import {ReactNode} from "react";
import {Miss} from "../lib/game.ts";

// Photo d'une miss, ou un monogramme si elle n'en a pas.
export const MissPhoto = ({miss, className = ""}: { miss: Miss, className?: string }) => (
    miss.photoUrl
        ? <img alt="" src={miss.photoUrl} loading="lazy" className={"bg-wine-100 object-cover object-top " + className}/>
        : <div aria-hidden="true"
               className={"flex items-center justify-center bg-gradient-to-br from-wine-100 to-gold-100 font-display text-4xl font-bold text-wine-700 " + className}>
            {miss.region.slice(0, 1)}
        </div>
);

export const ResultBadge = ({result, className = ""}: { result: string, className?: string }) => (
    <span className={"inline-flex items-center rounded-full bg-gradient-to-r from-gold-300 to-gold-500 px-2.5 py-0.5 text-xs font-bold text-wine-950 shadow-sm " + className}>
        {result}
    </span>
);

export const Avatar = ({name, className = ""}: { name: string, className?: string }) => (
    <span aria-hidden="true"
          className={"inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-300 to-gold-500 font-display text-base font-bold uppercase text-wine-950 " + className}>
        {name.trim().slice(0, 1)}
    </span>
);

export const EmptyState = ({title, children}: { title: string, children?: ReactNode }) => (
    <div className="card mx-auto max-w-md px-6 py-10 text-center">
        <p className="font-display text-xl font-bold text-wine-900">{title}</p>
        {children && <div className="mt-2 text-sm text-ink/70">{children}</div>}
    </div>
);
