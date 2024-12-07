import './App.css'
import logo from './assets/logo.svg'
import logoLight from './assets/logo-light.svg'
import {useState} from "react";
import {Bars3Icon} from "@heroicons/react/20/solid";
import {Dialog, DialogPanel} from "@headlessui/react";
import {XMarkIcon} from "@heroicons/react/16/solid";
import PocketBase from "pocketbase";
import Home from "./pages/Home.tsx";
import Vote from "./pages/Vote.tsx";
import Rank from "./pages/Rank.tsx";



const baseUrl = "https://quicestquiseramissfrance.fr";

function App() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [page, setPage] = useState("home")
    const client = new PocketBase(baseUrl);



  return (
    <div className="bg-white">
        <header className="absolute inset-x-0 top-0 z-50">
            <nav aria-label="Global" className="flex items-center justify-between p-6 lg:px-8">
                <div className="flex lg:flex-1">

                </div>
                <div className="flex lg:hidden">
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(true)}
                        className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
                    >
                        <span className="sr-only">Open main menu</span>
                        <Bars3Icon aria-hidden="true" className="size-6"/>
                    </button>
                </div>
                <div className="hidden lg:flex lg:gap-x-12">
                        <a onClick={() => setPage("home")} className="cursor-pointer text-sm/6 font-semibold text-gray-900">
                            Les Miss
                        </a>
                        <a onClick={() => setPage("my-vote")} className="cursor-pointer text-sm/6 font-semibold text-gray-900">
                            Mes votes
                        </a>
                        <a onClick={() => setPage("rank")} className="cursor-pointer text-sm/6 font-semibold text-gray-900">
                            Le classement
                        </a>
                </div>
                <div className="hidden lg:flex lg:flex-1 lg:justify-end">

                </div>
            </nav>
            <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
                <div className="fixed inset-0 z-50"/>
                <DialogPanel
                    className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
                    <div className="flex items-center justify-between">
                        <a href="#" className="-m-1.5 p-1.5">
                            <img
                                alt=""
                                src={logo}
                                className="h-8 w-auto"
                            />
                        </a>
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(false)}
                            className="-m-2.5 rounded-md p-2.5 text-gray-700"
                        >
                            <span className="sr-only">Fermer menu</span>
                            <XMarkIcon aria-hidden="true" className="size-6"/>
                        </button>
                    </div>
                    <div className="mt-6 flow-root">
                        <div className="-my-6 divide-y divide-gray-500/10">
                            <div className="space-y-2 py-6">
                                <a onClick={() => setPage("home")} className="cursor-pointer -mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50">
                                    Les Miss
                                </a>
                                <a onClick={() => setPage("my-vote")} className="cursor-pointer -mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50">
                                    Mes votes
                                </a>
                                <a onClick={() => setPage("rank")} className="cursor-pointer -mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50">
                                    Le classement
                                </a>
                            </div>
                        </div>
                    </div>
                </DialogPanel>
            </Dialog>
        </header>

        <div className="relative isolate px-6 pt-14 lg:px-8">
            <div
                aria-hidden="true"
                className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
            >
                <div
                    style={{
                        clipPath:
                            'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                    }}
                    className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                />
            </div>
            <div className="mx-auto max-w-2xl py-4 sm:py-6 lg:py-8">

                <div className="text-center">
                    <div className="flex justify-center">
                        <img
                            alt=""
                            src={logoLight}
                            className="h-40 w-auto"
                        />
                    </div>
                </div>
            </div>

            {page === "home" && <Home client={client}></Home>}
            {page === "my-vote" && <Vote client={client}></Vote>}
            {page === "rank" && <Rank client={client}></Rank>}


        </div>
    </div>
  )
}

export default App
