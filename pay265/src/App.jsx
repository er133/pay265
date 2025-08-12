
import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DISTRICTS = [
  "Balaka","Blantyre","Chikwawa","Chiradzulu","Chitipa","Dedza","Dowa","Karonga","Kasungu","Likoma","Lilongwe","Machinga","Mangochi","Mchinji","Mulanje","Mwanza","Mzimba","Neno","Nkhata Bay","Nkhotakota","Nsanje","Ntcheu","Ntchisi","Phalombe","Rumphi","Salima","Thyolo","Zomba"
];

const formatKW = (n) => { if (n === "") return "MWK 0"; return "MWK " + Number(n).toLocaleString(); };

export default function App() {
  const [page, setPage] = useState("home");
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(null);
  const [newProduct, setNewProduct] = useState({ title: "", price: "", district: DISTRICTS[0] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // auth listener
    const session = supabase.auth.getSession().then(r => {
      if (r?.data?.session) setUser(r.data.session.user);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*').order('id', { ascending: false });
    if (error) { console.error(error); setProducts([]); }
    else setProducts(data || []);
    setLoading(false);
  }

  async function signUpSeller(name, email, password, district){
    const { error } = await supabase.auth.signUp({ email, password }, { data: { name, role: 'seller', district } });
    if (error) return alert(error.message);
    alert('Signup email sent (verify). After verification, login.');
  }

  async function signUpBuyer(name, email, password){
    const { error } = await supabase.auth.signUp({ email, password }, { data: { name, role: 'buyer' } });
    if (error) return alert(error.message);
    alert('Signup email sent (verify). After verification, login.');
  }

  async function signIn(email, password){
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  }

  async function signOut(){
    await supabase.auth.signOut();
    setUser(null);
  }

  async function addProduct(){
    if(!user) return alert('Login as seller to add product');
    if(!newProduct.title || !newProduct.price) return alert('Add title and price');
    const sellerMeta = user.user_metadata || {};
    const sellerName = sellerMeta.name || user.email;
    const district = newProduct.district;
    const price = Number(newProduct.price);
    const { data, error } = await supabase.from('products').insert([{ title: newProduct.title, price_mwk: price, seller_name: sellerName, district }]);
    if (error) return alert(error.message);
    setNewProduct({ title: '', price: '', district: DISTRICTS[0] });
    fetchProducts();
  }

  async function placeOrder(productId, method){
    if(!user) return alert('Please login as buyer to place order');
    const buyerMeta = user.user_metadata || {};
    const buyerName = buyerMeta.name || user.email;
    const { data, error } = await supabase.from('orders').insert([{ product_id: productId, buyer_name: buyerName, method, status: 'pending' }]);
    if (error) return alert(error.message);
    alert('Order placed. Please contact the seller to complete the transaction.');
    fetchProducts();
  }

  return (
    <div className="min-h-screen p-4">
      <header className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: "linear-gradient(90deg,#000 0%,#b30000 50%,#00a651 100%)" }}>265</div>
          <div>
            <h1 className="text-xl font-extrabold">pay265</h1>
            <div className="text-sm text-gray-600">Malawi marketplace — prices in MWK</div>
          </div>
        </div>
        <nav className="flex gap-2 items-center">
          <button onClick={() => setPage('home')} className="px-3 py-1">Home</button>
          <button onClick={() => setPage('seller')} className="px-3 py-1">Seller</button>
          <button onClick={() => setPage('buyer')} className="px-3 py-1">Buyer</button>
          {user ? <div className="px-3 py-1 bg-white rounded border">{user.email} <button onClick={signOut} className="ml-2 text-xs">Logout</button></div> : null}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto mt-6">
        {page === 'home' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Products</h2>
              <div className="text-sm text-gray-600">Showing items from across Malawi</div>
            </div>

            {loading ? <div>Loading...</div> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {products.map(p => (
                  <div key={p.id} className="bg-white rounded p-4 shadow flex flex-col">
                    <div className="h-40 bg-gray-100 rounded mb-3 flex items-center justify-center">Image</div>
                    <h3 className="font-semibold">{p.title}</h3>
                    <div className="text-sm text-gray-600">Seller: {p.seller_name} — {p.district}</div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-lg font-bold">{formatKW(p.price_mwk)}</div>
                      <div className="flex items-center gap-2">
                        <select defaultValue="meet" className="border rounded p-1 text-sm" id={`method-${p.id}`}>
                          <option value="meet">Meet in person</option>
                          <option value="transfer">Via transaction</option>
                          <option value="delivery">Seller sends</option>
                        </select>
                        <button className="px-2 py-1 rounded bg-black text-white text-sm" onClick={() => {
                          const method = document.getElementById(`method-${p.id}`).value;
                          placeOrder(p.id, method);
                        }}>Buy</button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">Status: {p.status || 'available'}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {page === 'seller' && (
          <section>
            <h2 className="text-2xl font-bold">Seller Dashboard</h2>
            {!user ? (
              <div className="mt-4 bg-white p-4 rounded shadow">
                <h3 className="font-semibold">Create seller account</h3>
                <SellerSignup onSignup={signUpSeller} />
              </div>
            ) : (
              <div className="mt-4 bg-white p-4 rounded shadow">
                <h3 className="font-semibold">Add product</h3>
                <div className="mt-2 space-y-2">
                  <input className="w-full border rounded p-2" placeholder="Title" value={newProduct.title} onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })} />
                  <input className="w-full border rounded p-2" placeholder="Price (MWK)" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} />
                  <select className="w-full border rounded p-2" value={newProduct.district} onChange={(e) => setNewProduct({ ...newProduct, district: e.target.value })}>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 rounded bg-green-700 text-white" onClick={addProduct}>Add Product</button>
                    <button className="px-3 py-1 rounded bg-red-700 text-white" onClick={() => setNewProduct({ title: '', price: '', district: DISTRICTS[0] })}>Clear</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {page === 'buyer' && (
          <section>
            <h2 className="text-2xl font-bold">Buyer Account</h2>
            {!user ? (
              <div className="mt-4 bg-white p-4 rounded shadow">
                <h3 className="font-semibold">Create buyer account</h3>
                <BuyerSignup onSignup={signUpBuyer} onSignIn={signIn} />
              </div>
            ) : (
              <div className="mt-4 bg-white p-4 rounded shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{user.email}</div>
                    <div className="text-sm text-gray-600">Buyer account</div>
                  </div>
                  <div>
                    <button onClick={() => setPage('home')} className="px-3 py-1 rounded bg-black text-white">Browse products</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="max-w-5xl mx-auto mt-8 py-6 text-center text-sm text-gray-500">pay265 — demo • No real payments integrated</footer>
    </div>
  );
}

function SellerSignup({ onSignup }){
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [district,setDistrict]=useState(DISTRICTS[0]);
  return (
    <div className="space-y-2">
      <input className="w-full border rounded p-2" placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} />
      <input className="w-full border rounded p-2" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
      <input className="w-full border rounded p-2" placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
      <select className="w-full border rounded p-2" value={district} onChange={(e)=>setDistrict(e.target.value)}>
        {DISTRICTS.map(d=> <option key={d} value={d}>{d}</option>)}
      </select>
      <div className="flex gap-2">
        <button className="px-3 py-1 rounded bg-black text-white" onClick={()=> onSignup(name,email,password,district)}>Create seller</button>
      </div>
    </div>
  );
}

function BuyerSignup({ onSignup, onSignIn }){
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  return (
    <div className="space-y-2">
      <input className="w-full border rounded p-2" placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} />
      <input className="w-full border rounded p-2" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
      <input className="w-full border rounded p-2" placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
      <div className="flex gap-2">
        <button className="px-3 py-1 rounded bg-black text-white" onClick={()=> onSignup(name,email,password)}>Create buyer</button>
        <button className="px-3 py-1 rounded bg-green-700 text-white" onClick={()=> onSignIn(email,password)}>Login</button>
      </div>
    </div>
  );
}
