import { Route, Routes } from "react-router-dom";
import Disposicion from "./componentes/Disposicion";
import Dashboard from "./paginas/Dashboard";
import IndiceActas from "./paginas/IndiceActas";
import DetalleActa from "./paginas/DetalleActa";
import NuevaActa from "./paginas/NuevaActa";
import Obras from "./paginas/Obras";
import Configuracion from "./paginas/Configuracion";

export default function App() {
  return (
    <Routes>
      <Route element={<Disposicion />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/actas" element={<IndiceActas />} />
        <Route path="/actas/:id" element={<DetalleActa />} />
        <Route path="/nueva" element={<NuevaActa />} />
        <Route path="/obras" element={<Obras />} />
        <Route path="/configuracion" element={<Configuracion />} />
      </Route>
    </Routes>
  );
}
