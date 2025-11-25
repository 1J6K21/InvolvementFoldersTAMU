import { useState } from "react";

interface Props {
  items: string[];
  heading: String;
  onSelectItem: (item: string) => void;
}
function ListGroup({ items, heading, onSelectItem }: Props) {
  //   const numbers = ["one", "two", "three", "four"];
  const [selectedIndex, setSelectedIndex] = useState(-1);
  return (
    <>
      <h1>heading</h1>
      <ul className="list-group">
        {items.map((item, index) => (
          <li
            className={
              selectedIndex === index
                ? "list-group-item active"
                : "list-group-item"
            }
            key={item}
            onClick={() => {
              setSelectedIndex(index);
              onSelectItem(item);
            }}
          >
            {item}
          </li>
        ))}
      </ul>
    </>
  );
}

export default ListGroup;
