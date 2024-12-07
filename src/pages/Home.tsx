import {useEffect, useState} from "react";
const baseUrl = "https://quicestquiseramissfrance.fr";

const Home = ({client}: {client: any}) => {

    const [miss, setMiss] = useState<any>([]);

    useEffect(() => {
        client.collection("miss").getList(1, 50, {}).then((response: {items: any[]} ) => {

            setMiss(response.items.map((item) => {
                const fileName = item.photo; // Le champ qui contient le fichier
                if (fileName) {
                    const fileUrl = `${baseUrl}/api/files/miss/${item.id}/${fileName}`;
                    item.photoUrl = fileUrl;
                }
                return item;
            }));
        })
    }, []);


    return (
        <div>
            <p className="text-center uppercase mt-4 text-pretty text-lg font-medium text-gray-900 sm:text-xl/8">
                Liste des Miss
            </p>

            <div>
                <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:max-w-7xl lg:px-8">

                    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
                        {miss.map((m:any) => (
                            <a key={m.id} className="group relative mb-5">
                                <h2 className="absolute shadow rounded text-center text-2xl -top-5 right-4 left-4  z-10 bg-[#9c272e] text-white py-1 px-3 uppercase">Miss {m.region}</h2>
                                <img
                                    alt={m.name}
                                    src={m.photoUrl}
                                    className=" w-full overflow-hidden rounded-lg object-cover group-hover:opacity-75 "
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
        </div>
    );
}

export default Home;
