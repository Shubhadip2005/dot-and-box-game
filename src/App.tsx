import { Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import RoomPage from "./components/RoomPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:roomId" element={<RoomPage />} />
    </Routes>
  );
}
