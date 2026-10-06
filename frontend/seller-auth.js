'use strict';
// Seller sign-in with Supabase Auth. The API verifies the access token attached to each
// request; nothing here is secret (the Supabase URL and publishable key are public).
const sellerAuth=(()=>{
 let clientPromise=null;
 function resetMode(){try{sessionStorage.removeItem('bindr-admin-mode');}catch{}}
 function client(){
  clientPromise??=fetch('/api/v1/config',{cache:'no-store'}).then(async r=>{
   const config=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(config.detail||'Sign-in is not available on this server.');
   return supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  }).catch(e=>{clientPromise=null;throw e;});
  return clientPromise;
 }
 return {
  // getSession refreshes an expired access token before returning it.
  async accessToken(){const {data}=await (await client()).auth.getSession();return data.session?.access_token||null;},
  async signIn(email,password){const {error}=await (await client()).auth.signInWithPassword({email,password});if(error)throw Error(error.message==='Invalid login credentials'?'Incorrect email or password.':error.message);resetMode();},
  async signOut(){const {error}=await (await client()).auth.signOut();if(error)throw error;resetMode();},
 };
})();
