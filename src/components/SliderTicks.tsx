export type SliderTicksProps = {
    num: number
}

export default function SliderTicks(props: SliderTicksProps) {

    return (
        <div className="flex justify-between text-xs px-2">
            {/* YOu cant map over an array with empty vars in it (Array(5))
                .keys().toArray() will give you an array of 0,1,2,3,4 (works too)
            */}
            {Array.from(Array(props.num).keys()).map((i) => {
                return (
                    <span>|</span>
                );
            })}
        </div>
    )
}