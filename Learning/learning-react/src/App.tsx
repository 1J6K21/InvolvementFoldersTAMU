import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import "bootstrap/dist/css/bootstrap.css";
import ListGroup from "./Components/ListGroup";
import Alert from "./Components/Alert";
function App() {
  const [count, setCount] = useState(-1);
  const [alertVisible, setAlertVisibility] = useState(false);
  const items = ["Cedar Park", "Austin", "College Station"];

  const handleSelectItem = (item: string) => {
    console.log(item);
    setAlertVisibility(true)
  };
  return (
    <>
      <div>
        <>
          <ListGroup
            items={items}
            heading="Cities"
            onSelectItem={handleSelectItem}
          ></ListGroup>
          {alertVisible && (
            <Alert color="danger" onClose={()=>setAlertVisibility(false)}>
              <h1>Hello</h1>
              Hello World
            </Alert>
          )}
        </>
      </div>
    </>
  );
}

export default App;
