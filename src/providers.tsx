import { Provider } from "jotai"
import { GlobalErrorProvider } from "./hooks/useError"
import { GlobalToastProvider } from "./hooks/useToast"

export default function Providers({
    children, // will be a page or nested layout
}: {
    children: React.ReactNode
}) {
    return (
        <GlobalToastProvider>
            <GlobalErrorProvider>
                <Provider>
                    {children}
                </Provider>
            </GlobalErrorProvider>
        </GlobalToastProvider>
    )
}

