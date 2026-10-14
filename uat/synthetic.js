/* Deliberately fake identity and records. No external authentication or case data. */
(() => {
  const tabs=['การะเกด','ชยาน์ขวัญ','ฉัตรพร','ภทรพงค์','สกุลวรรณ','ปิยะพงษ์','เทอดพงศ์','โสภา'];
  const scope='https://www.googleapis.com/auth/spreadsheets.readonly';
  const originalFetch=window.fetch.bind(window);
  window.google={accounts:{oauth2:{initTokenClient:options=>({requestAccessToken:()=>options.callback({access_token:'SYNTHETIC_UAT_TOKEN',expires_in:3600,scope})}),revoke:(_,callback)=>callback()}}};
  window.fetch=(input,options)=>{
    const url=new URL(typeof input==='string'?input:input.url,location.href);
    if(url.hostname==='sheets.googleapis.com') {
      const denied=new URLSearchParams(location.search).get('uat-role')==='denied';
      const body=denied?{}:{valueRanges:tabs.map((sheet,i)=>({range:`'${sheet}'!A1:F62`,values:[['จังหวัด','ชื่อเรื่อง','เลขที่รับ','ผู้รับผิดชอบ','สถานะ','ข้อมูลที่ไม่ใช้'],...Array.from({length:61},(_,n)=>['จังหวัดจำลอง',`เรื่องจำลอง ${i+1}-${n+1}`,'UAT-'+(n+1),'เจ้าหน้าที่จำลอง',n%2?'เสร็จแล้ว':'รอ','ข้อมูลจำลอง'])]}))};
      return Promise.resolve(new Response(JSON.stringify(body),{status:denied?403:200,headers:{'Content-Type':'application/json'}}));
    }
    if(url.origin!==location.origin) return Promise.reject(new TypeError('External network disabled in synthetic UAT'));
    return originalFetch(input,options);
  };
})();
