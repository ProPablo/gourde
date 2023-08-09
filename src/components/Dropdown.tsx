import { forwardRef } from "react";

interface IProps {
  values: string[];
  // currentlySelected: number;
  // onSelect: (selected: number) => void;
  title?: string;
  name: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
}

export default forwardRef(function Dropdown(props: IProps, ref: any) {
  return (
    // <div className="dropdown">
    //   <label tabIndex={0} className="btn m-1"> {props.title && `${props.title}: `}{props.values[props.currentlySelected]} </label>
    //   <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
    //     <li>        <input type="radio" name="radio-2" className="radio radio-primary"  /> Yo Wassup</li>
    //     <li>        <input type="radio" name="radio-2" className="radio radio-primary" checked /> </li>
    //   </ul>
    // </div>

    <div className="form-control w-full max-w-xs">
      {!!props.title &&
        <label className="label">
          <span className="label-text">{props.title}</span>
        </label>
      }
      <select
        name={props.name}
        className="select w-full max-w-xs"
        defaultValue={props.values[0]}
        ref={ref}
        onChange={props.onChange}
      >

        <option disabled selected>{props.title ? `Pick an option for ${props.title}` : `Pick an option`} </option>
        {props.values.map((e, i) => (
          <option key={i}>{e}</option>
        ))}

      </select>
    </div>

  )
})