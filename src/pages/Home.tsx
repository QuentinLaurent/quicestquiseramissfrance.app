import {useEffect, useState} from "react";

const Home = ({misses, show}: {misses: any[], show : boolean}) => {

    const [miss, setMiss] = useState<any>([]);
    const [rawMiss, setRawMiss] = useState<any>([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        console.log("HOME misses",miss)
        setRawMiss(misses)
        setMiss(misses)
        setSearch("")
    }, [misses]);

    useEffect(() => {
        console.log("use effect rawMiss",rawMiss)
    }, [rawMiss]);

    useEffect(() => {
        console.log("use effect miss",miss)
    }, [miss]);

    useEffect(() => {
        if(!search || search === "") setMiss(rawMiss)
        else{
            setMiss(rawMiss.filter((m: any) => {
                return m.name.toLowerCase().includes(search.toLowerCase())
                    || m.work.toLowerCase().includes(search.toLowerCase())
                    || m.region.toLowerCase().includes(search.toLowerCase())
                    || m.field.toLowerCase().includes(search.toLowerCase())
                    || m.age.toString().toLowerCase().includes(search.toLowerCase())
            }))
        }
    }, [search]);


    return (
        <div className={ !show ? 'hidden' : ''}>
            <p className="text-center uppercase mt-4 text-pretty text-lg font-medium text-gray-900 sm:text-xl/8">
                Liste des Miss
            </p>

            <div>
                <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:max-w-7xl lg:px-8">

                    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
                        {miss.map((m:any) => (
                            <a key={m.id} className=" relative mb-5">
                                <h2 className="absolute shadow rounded text-center text-2xl -top-5 right-4 left-4  z-10 bg-[#9c272e] text-white py-1 px-3 uppercase">Miss {m.region}{m.field && <small><br />{m.field}</small>}</h2>
                                <img
                                    alt={m.name}
                                    src={m.photoUrl}
                                    className=" w-full overflow-hidden rounded-lg object-cover"
                                />
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
