interface IProps {
    lines: string[];
}

export default function Terminal(props: IProps) {

    return (
        <div className="max-h-5 w-full">
            <div className="coding inverse-toggle max-h-20 overflow-y-auto rounded-lg bg-gray-800 px-5 pb-6 pt-4 pt-4 font-mono text-sm leading-normal text-gray-100 subpixel-antialiased shadow-lg">
                <div className="top mb-2 flex">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <div className="ml-2 h-3 w-3 rounded-full bg-orange-300"></div>
                    <div className="ml-2 h-3 w-3 rounded-full bg-green-500"></div>
                </div>
                <div className="mt-4 flex">
                    <p className="typing flex-1 items-center pl-2">
                        {
                            props.lines.map((line, i) => (
                                <span key={i}>{line}<br /></span>
                            ))
                        }
                    </p>
                </div>
            </div>
        </div>
    )

}