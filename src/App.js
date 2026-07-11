import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import NfeImport from "@/pages/NfeImport";
import Conference from "@/pages/Conference";
import Products from "@/pages/Products";
import Suppliers from "@/pages/Suppliers";
import Equivalences from "@/pages/Equivalences";
import RecognitionCenter from "@/pages/RecognitionCenter";
import ProductBinding from "@/pages/ProductBinding";
import ConferenceReport from "@/pages/ConferenceReport";

function App() {
  return (
    <div className="App dark">
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/notas" element={<NfeImport />} />
            <Route path="/conferencia" element={<Conference />} />
            <Route path="/conferencia/:notaId" element={<Conference />} />
            <Route path="/vinculacao/:notaId" element={<ProductBinding />} />
            <Route path="/relatorio/:notaId" element={<ConferenceReport />} />
            <Route path="/reconhecimento" element={<RecognitionCenter />} />
            <Route path="/produtos" element={<Products />} />
            <Route path="/fornecedores" element={<Suppliers />} />
            <Route path="/equivalencias" element={<Equivalences />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
}

export default App;
