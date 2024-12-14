import {useEffect, useState} from "react";
import {forEach, map} from "lodash";


const Rank = ({show,votesScore, phase}: {show: boolean, votesScore: any[], phase: number}) => {
    const [votes, setVotes] = useState<any[]>([]);

    useEffect(() => {
        const scores : any = {};
        forEach(votesScore,(v,k) => {
            let firstOK = false;
            let secondOK = false;
            let thirdOK = false;

            scores[k] = v.reduce((acc:any, vote:any) => {
                if(vote.phase === "1" && phase > 1){
                    if(vote.expand.miss.field === "Miss France") return acc + 5;
                    if(vote.expand.miss.field === "Top 5"
                    || vote.expand.miss.field === "1ère Dauphine" || vote.expand.miss.field === "2ème Dauphine") return acc + 2;
                }
                if(vote.phase === "2" && phase > 2){
                    if(vote.expand.miss.field === "Miss France") return acc + 5;
                    if(vote.expand.miss.field === "Top 5"
                        || vote.expand.miss.field === "1ère Dauphine" || vote.expand.miss.field === "2ème Dauphine") return acc + 2;
                    if(vote.expand.miss.field === "Top 15") return acc + 1;
                }
                if(vote.phase === "3" && phase > 3){
                    if(vote.expand.miss.field === "Miss France") return acc + 5;
                    if(vote.expand.miss.field === "1ère Dauphine") return acc + 2;
                    if(vote.expand.miss.field === "2ème Dauphine") return acc + 1;
                }
                if(vote.phase === "4" && phase > 4){
                    if(vote.expand.miss.field === "Miss France") {
                        if(vote.voteNumber === 1) firstOK = true;
                        return acc + 5;
                    }
                    if(vote.expand.miss.field === "1ère Dauphine") {
                        if(vote.voteNumber === 2) secondOK = true;
                        return acc + 3;
                    }
                    if(vote.expand.miss.field === "2ème Dauphine") {
                        if(vote.voteNumber === 3) thirdOK = true;
                        return acc + 2;
                    }
                }
                return acc + 0;
            },0);
            if(firstOK && secondOK && thirdOK) scores[k] += 8;
        })
        setVotes(scores)
    }, [votesScore, phase]);
    return (
        <div className={ !show ? 'hidden' : ''}>
            <p className="text-center uppercase mt-4 text-pretty text-lg font-medium text-gray-900 sm:text-xl/8">
                Classement !
            </p>
            <div className="m-auto max-w-[500px] my-10">
                {map(votes, (v:any, k:any) => (
                    <div key={k} className="flex items-center border-b border-b-gray-500 p-2">
                        <span className="block w-[150px] font-bold">{k}:</span>
                        <span>{v} points</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Rank;
