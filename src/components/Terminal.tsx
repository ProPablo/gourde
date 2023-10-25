interface IProps {
    lines: string[];
}

export default function Terminal(props: IProps) {

    return (
        <div className="overflow-x-scroll flex-grow-0 max-x-20 coding inverse-toggle rounded-lg bg-gray-800 px-5 pb-6 pt-4 font-mono text-sm leading-normal text-gray-100 subpixel-antialiased">
            <p className="typing flex-1 items-center py-3 pl-2 select-text word-wrap-all">
                {
                    props.lines.map((line, i) => (
                        <span key={i}>{line}<br /></span>
                    ))
                }
            </p>
            <br />
        </div>
    )

}