/* Keep the legacy public feeds out of the isolated UAT environment. */
(() => {
  const originalFetch=window.fetch.bind(window);
  window.fetch=(input,options)=>{
    const url=new URL(typeof input==='string'?input:input.url,location.href);
    if(url.hostname==='docs.google.com') return Promise.resolve(new Response('name,province\n',{headers:{'Content-Type':'text/csv'}}));
    return originalFetch(input,options);
  };
})();
