
// @ts-ignore
import {useEffect, useState} from "react";
import SelectVote from "../componnents/SelectVote.tsx";


const Vote = ({client, phase, misses,who, votes, show}: {client?: any, phase: number,misses: any[],who: any, votes: any[], show: boolean}) => {

    const [internVotes, setInternVotes] = useState<any[]>([]);

    useEffect(() => {
        setInternVotes(votes)
    }, [votes]);


    const vote = async (step: number, number: number, miss: any) =>{
              try {
            // Requête pour vérifier si l'entrée existe
            const existingVotes = await client.collection('vote').getList(1, 10,{filter: `phase="${step}" && votant="${who.id}" && voteNumber=${number}`})
            if (existingVotes.items.length > 0) {
                // Une entrée existe, on la met à jour
                const voteId = existingVotes.items[0].id;
                await client.collection('vote').update(voteId, {
                    miss: miss.id, // Mettre à jour la relation `miss`
                });
            } else {
                 await client.collection('vote').create({
                    phase: phase.toString(),
                    votant: who.id,
                    miss: miss.id,
                    voteNumber: number,
                });
            }
        } catch (error) {
            console.error('Erreur lors du traitement du vote:', error);
        }
    }

    const selectedMissAtStep = (step: number, number: number) => {
        const vote = internVotes.find((v) => parseInt(v.phase) === step && v.voteNumber === number);
        if(vote) return misses.find((m) => m.id === vote.miss);
        return null
    }


    return (
        <div  className={ (!show ? 'hidden' : '') + " mb-80"}>
            <p className="text-center uppercase mt-4 text-pretty text-lg font-medium text-gray-900 sm:text-xl/8">
                Mes votes
            </p>

            <div className="text-center mt-6 font-bold uppercase">1ère phase de vote {phase > 1 && <small className="underline">Terminé</small>}</div>
            {phase === 1 && <p className="text-center">Avant l'émission, choisir 5 miss sur photo.<br /><span className="underline">5 points si vous avez trouvé Miss France ou 2 points si vous avez trouvé une miss dans les 5 dernières</span></p>}
            {phase === 1 && <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
                <SelectVote setVote={(e:any) => vote(1,1,e)} selectedMiss={selectedMissAtStep(1,1)} misses={misses} title="Miss numero 1"></SelectVote>
                <SelectVote setVote={(e:any) => vote(1,2,e)} selectedMiss={selectedMissAtStep(1,2)} misses={misses} title="Miss numero 2"></SelectVote>
                <SelectVote setVote={(e:any) => vote(1,3,e)} selectedMiss={selectedMissAtStep(1,3)} misses={misses} title="Miss numero 3"></SelectVote>
                <SelectVote setVote={(e:any) => vote(1,4,e)} selectedMiss={selectedMissAtStep(1,4)} misses={misses} title="Miss numero 4"></SelectVote>
                <SelectVote setVote={(e:any) => vote(1,5,e)} selectedMiss={selectedMissAtStep(1,5)} misses={misses} title="Miss numero 5"></SelectVote>
            </div>}
            {phase > 1 && <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 pt-1">
                {[1,2,3,4,5].map((i) => {
                    const miss = selectedMissAtStep(1, i);
                    return(<div  key={i}
                        className="z-10 bg-[#9c272e] text-white shadow text-center leading-1 px-2 py-1 rounded">{miss?.region || 'Non sélectionnée'}<br/><small>{miss?.name}</small>
                    </div>)
                })}
            </div>}

            {phase >= 2 && <div className="text-center mt-6 font-bold uppercase">2ème phase de vote {phase > 2 &&
                <small className="underline">Terminé</small>}</div>}
            {phase === 2 && <p className="text-center">Avant le vote des 15, choisir 5 miss.<br /><span className="underline">5 points si vous avez trouvé Miss France ou 2 points si vous avez trouvé une miss dans les 5 dernières ou 1 point si dans les 15 dernières.</span></p>}
            {phase === 2 && <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
                <SelectVote setVote={(e:any) => vote(2,1,e)} selectedMiss={selectedMissAtStep(2,1)} misses={misses} title="Miss numero 1"></SelectVote>
                <SelectVote setVote={(e:any) => vote(2,2,e)} selectedMiss={selectedMissAtStep(2,2)} misses={misses} title="Miss numero 2"></SelectVote>
                <SelectVote setVote={(e:any) => vote(2,3,e)} selectedMiss={selectedMissAtStep(2,3)} misses={misses} title="Miss numero 3"></SelectVote>
                <SelectVote setVote={(e:any) => vote(2,4,e)} selectedMiss={selectedMissAtStep(2,4)} misses={misses} title="Miss numero 4"></SelectVote>
                <SelectVote setVote={(e:any) => vote(2,5,e)} selectedMiss={selectedMissAtStep(2,5)} misses={misses} title="Miss numero 5"></SelectVote>
            </div>}
            {phase > 2 && <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 pt-1">
                {[1,2,3,4,5].map((i) => {
                    const miss = selectedMissAtStep(2, i);
                    return(<div  key={i}
                                 className="z-10 bg-[#9c272e] text-white shadow text-center leading-1 px-2 py-1 rounded">{miss?.region || 'Non sélectionnée'}<br/><small>{miss?.name}</small>
                    </div>)
                })}
            </div>}

            {phase >= 3 && <div className="text-center mt-6 font-bold uppercase">3ème phase de vote {phase > 3 && <small className="underline">Terminé</small>}</div>}
            {phase === 3 && <p className="text-center">Avant le vote des 5 dernière, choisir 5 miss.<br /><span className="underline">5 points si vous avez trouvé Miss France ou 3 points pour la deuxième et 1 point pour la troisième.</span></p>}
            {phase === 3 && <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
                <SelectVote setVote={(e:any) => vote(3,1,e)} selectedMiss={selectedMissAtStep(3,1)} misses={misses} title="Miss numero 1"></SelectVote>
                <SelectVote setVote={(e:any) => vote(3,2,e)} selectedMiss={selectedMissAtStep(3,2)} misses={misses} title="Miss numero 2"></SelectVote>
                <SelectVote setVote={(e:any) => vote(3,3,e)} selectedMiss={selectedMissAtStep(3,3)} misses={misses} title="Miss numero 3"></SelectVote>
                <SelectVote setVote={(e:any) => vote(3,4,e)} selectedMiss={selectedMissAtStep(3,4)} misses={misses} title="Miss numero 4"></SelectVote>
                <SelectVote setVote={(e:any) => vote(3,5,e)} selectedMiss={selectedMissAtStep(3,5)} misses={misses} title="Miss numero 5"></SelectVote>
            </div>}
            {phase > 3 && <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 pt-1">
                {[1,2,3,4,5].map((i) => {
                    const miss = selectedMissAtStep(3, i);
                    return(<div  key={i}
                                 className="z-10 bg-[#9c272e] text-white shadow text-center leading-1 px-2 py-1 rounded">{miss?.region || 'Non sélectionnée'}<br/><small>{miss?.name}</small>
                    </div>)
                })}
            </div>}

            {phase >= 4 && <div className="text-center mt-6 font-bold uppercase">4ème phase de vote {phase > 4 && <small className="underline">Terminé</small>}</div>}
            {phase === 4 && <p className="text-center">Le Tiercé gagnant<br /><span className="underline">5 points si vous avez trouvé Miss France, 3 points pour la deuxième et 2 points pour la troisième. 8 point bonus si tiercé gagnant</span></p>}
            {phase === 4 && <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
                <SelectVote setVote={(e:any) => vote(4,1,e)} selectedMiss={selectedMissAtStep(4,1)} misses={misses} title="Miss France"></SelectVote>
                <SelectVote setVote={(e:any) => vote(4,2,e)} selectedMiss={selectedMissAtStep(4,2)} misses={misses} title="1ère dauphine"></SelectVote>
                <SelectVote setVote={(e:any) => vote(4,3,e)} selectedMiss={selectedMissAtStep(4,3)} misses={misses} title="2ème dauphine"></SelectVote>
            </div>}

            {phase > 4 && <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 pt-1">
                <div
                    className="z-10 bg-[#9c272e] text-white shadow text-center leading-1 px-2 py-1 rounded">Miss France<br/><small>{selectedMissAtStep(4, 1)?.region || 'Non sélectionnée'}</small>
                </div>
                <div
                    className="z-10 bg-[#9c272e] text-white shadow text-center leading-1 px-2 py-1 rounded">1ère dauphine<br/><small>{selectedMissAtStep(4, 2)?.region || 'Non sélectionnée'}</small>
                </div>
                <div
                    className="z-10 bg-[#9c272e] text-white shadow text-center leading-1 px-2 py-1 rounded">2ème dauphine<br/><small>{selectedMissAtStep(4, 3)?.region || 'Non sélectionnée'}</small>
                </div>
            </div>}


            {phase >= 5 && <div className="text-center mt-6 font-bold uppercase">Les votes sont terminés</div>}


        </div>
    );
}

export default Vote;
