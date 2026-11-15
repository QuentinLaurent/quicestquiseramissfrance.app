import {useMemo, useState} from "react";
import {Miss} from "../lib/game.ts";

const Home = ({misses, show}: { misses: Miss[], show: boolean }) => {
    const [search, setSearch] = useState("");

    const miss = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return misses;
        return misses.filter((m) =>
            [m.name, m.work, m.region, m.field, m.age].some((value) => String(value ?? "").toLowerCase().includes(term))
        );
    }, [misses, search]);

    return (
        <div className={!show ? 'hidden' : ''}>
            <p className="text-center uppercase mt-4 text-pretty text-lg font-medium text-gray-900 sm:text-xl/8">
                Liste des Miss
            </p>

            <div>
                <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:max-w-7xl lg:px-8">

                    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
                        {miss.map((m) => (
                            <a key={m.id} className=" relative mb-5">
                                <h2 className="absolute shadow rounded text-center text-2xl -top-5 right-4 left-4  z-10 bg-[#9c272e] text-white py-1 px-3 uppercase">Miss {m.region}{m.field && <small><br />{m.field}</small>}</h2>
                                {m.photoUrl
                                    ? <img
                                        alt={m.name}
                                        src={m.photoUrl}
                                        className="aspect-[3/4] w-full overflow-hidden rounded-lg object-cover object-top"
                                    />
                                    : <div className="aspect-[3/4] w-full rounded-lg bg-gray-100"/>}
                                <div
                                    className="mt-4 flex items-center justify-between text-base font-medium text-gray-900">
                                    <h3>{m.name}</h3>
                                    <p>{m.age} ans</p>
                                </div>
                                <p className="mt-1 text-sm italic text-gray-500">{m.work}</p>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
            <div className="fixed z-20 left-1/2 bottom-0 pb-6 -translate-x-1/2 bg-gray-100 shadow-xl rounded-t px-2 py-1 flex items-center">
                <input type="text" id="filterMiss" placeholder="filtrer par mot clé" className="bg-transparent outline-0"
                       value={search}
                    onInput={(e) => setSearch(e.currentTarget.value)}
                />
                {search !== "" && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}
                     stroke="currentColor" className="size-6 cursor-pointer"
                     onClick={() => {setSearch("")}}
                >
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                </svg>}

            </div>
        </div>
    );
}

export default Home;
