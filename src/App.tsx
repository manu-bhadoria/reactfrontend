import React from 'react';
import './App.css';

function App() {
  const handleClick = (buttonNumber: number) => {
    console.log(`Button ${buttonNumber} clicked`);
  };

  return (
    <div className="App">
      <header className="App-header">
        <p>
          Click any button:
        </p>
        <button onClick={() => handleClick(1)}>Button 1</button>
        <button onClick={() => handleClick(2)}>Button 2</button>
        <button onClick={() => handleClick(3)}>Button 3</button>
      </header>
    </div>
  );
}

export default App;
