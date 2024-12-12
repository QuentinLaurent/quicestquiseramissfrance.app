

const SelectWho = ({users = [], setWho, show}: {users: any[], setWho:any, show: boolean}) => {


    return <div className={"flex flex-col items-center p-6 gap-4 " + (!show ? 'hidden' : '')}>
        <h1 className="text-2xl font-bold">Qui êtes-vous?</h1>
        {users.map((u) => (
            <button key={u.id} onClick={() => setWho(u)} className="bg-gray-200 p-2 rounded font-bold min-w-40 hover:bg-[#9c272e] hover:text-white">{u.nom}</button>
        ))}
    </div>

}

export default SelectWho;
