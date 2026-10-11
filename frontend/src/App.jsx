import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Room from "./pages/Room";
import AmbientBackground from "./components/AmbientBackground";

export default function App() {
  return (
    <>
      <AmbientBackground />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:code" element={<Room />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}