import React from "react";
import { FunctionComponent, ReactNode, createContext, memo, useContext, useEffect, useState } from "react";

export function useToast() {
    const setToast = useContext(ToastContext);
    return setToast;
}

interface Props {
    children: ReactNode;
}

type ToastContextValue = React.Dispatch<React.SetStateAction<string | null>>;
export const ToastContext = createContext<ToastContextValue>({} as ToastContextValue);

const TOAST_DELAY = 3000;

let GlobalToastProvider: FunctionComponent<Props> = React.memo(({ children }) => {

    const [toast, setToast] = useState<string | null>(null);
    const [remainingToast, setRemainingToast] = useState("");

    // Handles toast changing and going back to null after some time
    // https://github.com/craig1123/react-recipes/blob/master/src/useDebounce.js for inspiration
    useEffect(() => {
        if (toast == null) return;
        setRemainingToast(toast);

        let timer = setTimeout(() => { setToast(null) }, TOAST_DELAY);

        return () => {
            clearTimeout(timer);
        }
    }, [toast]);

    return (
        <ToastContext.Provider value={setToast}>
            {children}
            {/* toast for persistance through pages  */}
            <div id="toast-default"
                className={`
                    flex
                    select-none
                    animate-bounce
                    pointer-events-none
                    transition-opacity
                    duration-300
                    fixed
                    bottom-0
                    right-0
                    items-center
                    p-4
                    m-6
                    text-gray-500
                    bg-[#8B89AC]
                    rounded-lg 
                    ${!!toast ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                role="alert">
                <div className="alert text-white">
                    <div>
                        <span>{remainingToast}</span>
                    </div>
                </div>
            </div>
        </ToastContext.Provider >
    );
});


// GlobalToastProvider = memo(GlobalToastProvider);
export { GlobalToastProvider }