import {ReactNode} from "react";
import {Dialog, DialogBackdrop, DialogPanel, DialogTitle} from "@headlessui/react";
import {XMarkIcon} from "@heroicons/react/24/outline";

interface Props {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: ReactNode;
}

// Panneau qui monte du bas sur mobile, fenêtre centrée sur grand écran.
const Sheet = ({open, onClose, title, subtitle, children}: Props) => (
    <Dialog open={open} onClose={onClose} className="relative z-50">
        <DialogBackdrop transition
                        className="fixed inset-0 bg-wine-950/60 backdrop-blur-sm transition-opacity duration-200 data-[closed]:opacity-0"/>
        <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-6">
            <DialogPanel transition
                         className="flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-ivory shadow-2xl transition duration-200 data-[closed]:translate-y-8 data-[closed]:opacity-0 sm:max-w-3xl sm:rounded-3xl">
                <div className="flex items-start justify-between gap-4 border-b border-wine-100 px-5 py-4">
                    <div>
                        <DialogTitle className="font-display text-xl font-bold text-wine-900">{title}</DialogTitle>
                        {subtitle && <p className="text-sm text-ink/60">{subtitle}</p>}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Fermer"
                            className="-mr-2 inline-flex size-11 items-center justify-center rounded-full text-wine-700 hover:bg-wine-50">
                        <XMarkIcon className="size-6"/>
                    </button>
                </div>
                <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
                    {children}
                </div>
            </DialogPanel>
        </div>
    </Dialog>
);

export default Sheet;
